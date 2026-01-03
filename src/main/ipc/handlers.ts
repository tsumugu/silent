import { BrowserWindow, ipcMain, net, app } from 'electron';
import { IPCChannels } from './types';
import { PlaybackInfo } from '../../shared/types/playback';
import { AppSettings } from '../../shared/types/settings';

import { ytMusicService } from '../services/YTMusicService';
import { settingsService } from '../services/SettingsService';
import { trayService } from '../services/TrayService';
import { MusicArtist, MusicItem, isSongItem, isAlbumItem, isPlaylistItem, isChartItem, isRadioItem } from '../../shared/types/music';

// Persist the last known playback state to restore it when UI window is recreated
let lastPlaybackInfo: PlaybackInfo | null = null;

// Store context from play command for enrichment
let lastPlayContext: {
  artists?: MusicArtist[];
  albumId?: string;
  videoId?: string;         // The videoId this context belongs to
  playMode?: 'ALBUM' | 'PLAYLIST' | 'SONG' | 'RADIO'; // The mode in which playback started
} = {};

// To prevent stale enrichment results from overwriting newer ones
let enrichmentVersion = 0;

// The official duration from YTMusic API, used to cap any "jumping" durations from the video element
let referenceDuration = 0;

// Cache the last enriched metadata to avoid redundant updates to the UI
let lastEnrichedMetadata: any = null;
let lastEnrichedVideoId: string | null = null;

export function setupIPCHandlers(
  hiddenWindow: BrowserWindow
) {
  // ========================================
  // Window controls (Generic for any window)
  // ========================================

  ipcMain.on(IPCChannels.WINDOW_MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) win.minimize();
  });

  ipcMain.on(IPCChannels.WINDOW_MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    if (win.isFullScreen()) {
      win.setFullScreen(false);
    } else {
      win.setFullScreen(true);
    }
  });

  ipcMain.on(IPCChannels.WINDOW_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  ipcMain.on(IPCChannels.WINDOW_SET_VIBRANCY, (event, vibrancy: any) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setVibrancy(vibrancy);
    }
  });

  // ========================================
  // Playback state updates: Hidden → All Windows
  // ========================================

  ipcMain.on(IPCChannels.PLAYBACK_STATE_CHANGED, async (_event, playbackInfo: PlaybackInfo) => {
    // ================================================================
    // STEP 1: Immediate UI forwarding (non-blocking)
    // This ensures 'playing' state reaches UI without delay
    // ================================================================

    // Safety Guard: Use referenceDuration from API as the absolute Source of Truth for songs.
    if (referenceDuration > 0) {
      // 1. Cap duration
      playbackInfo.duration = referenceDuration;

      // 2. Cap position (prevent progress bar blowout if video plays past official end)
      if (playbackInfo.position > referenceDuration) {
        playbackInfo.position = referenceDuration;
      }
    }

    // Apply cached enrichment immediately if it's the same track
    // This prevents the "flash" of basic metadata and reduces redundant Step 2 updates
    if (playbackInfo.metadata?.videoId && playbackInfo.metadata.videoId === lastEnrichedVideoId) {
      playbackInfo.metadata = { ...lastEnrichedMetadata };
    }

    lastPlaybackInfo = playbackInfo;

    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed() && win.id !== hiddenWindow.id) {
        win.webContents.send(IPCChannels.PLAYBACK_STATE_CHANGED, playbackInfo);
      }
    });

    // Update tray immediately with whatever metadata we have
    const settings = settingsService.getSettings();
    if (settings.displayMode === 'menuBar' && process.platform === 'darwin') {
      trayService.updateTrack(playbackInfo.metadata);
    }

    // ================================================================
    // STEP 2: Asynchronous metadata enrichment (separate update)
    // If metadata is incomplete, fetch details and send enriched version
    // ================================================================
    if (playbackInfo.metadata?.videoId) {
      const currentVideoId = playbackInfo.metadata.videoId;
      const currentVersion = enrichmentVersion;
      const isSameTrack = currentVideoId === lastPlayContext.videoId;
      const isAlbumMode = lastPlayContext.playMode === 'ALBUM';
      const isPlaylistMode = lastPlayContext.playMode === 'PLAYLIST';

      let needsEnrichment = false;
      const enrichedMetadata = { ...playbackInfo.metadata };

      // Check if we need to enrich artists
      if (!enrichedMetadata.artists || enrichedMetadata.artists.length === 0) {
        if (isSameTrack && lastPlayContext.artists && lastPlayContext.artists.length > 0) {
          enrichedMetadata.artists = lastPlayContext.artists;
          if (!enrichedMetadata.artistId && lastPlayContext.artists[0].id) {
            enrichedMetadata.artistId = lastPlayContext.artists[0].id;
          }
        } else {
          needsEnrichment = true;
        }
      }

      // Check if we need to enrich album ID
      if (!enrichedMetadata.albumId) {
        if (isSameTrack && lastPlayContext.albumId) {
          enrichedMetadata.albumId = lastPlayContext.albumId;
        } else if ((isAlbumMode || isPlaylistMode) && lastPlayContext.albumId) {
          enrichedMetadata.albumId = lastPlayContext.albumId;
        } else {
          needsEnrichment = true;
        }
      }

      // Perform async enrichment if needed
      if (needsEnrichment) {
        try {
          const songDetails = await ytMusicService.getSongDetails(currentVideoId);

          // Version check: discard if a newer track has started
          if (currentVersion !== enrichmentVersion) {
            return;
          }

          if (songDetails && isSongItem(songDetails)) {
            if (!enrichedMetadata.artists || enrichedMetadata.artists.length === 0) {
              enrichedMetadata.artists = songDetails.artists;
              if (songDetails.artists[0]?.id) {
                enrichedMetadata.artistId = songDetails.artists[0].id;
              }
            }
            if (!enrichedMetadata.albumId && songDetails.album?.youtube_browse_id) {
              enrichedMetadata.albumId = songDetails.album.youtube_browse_id;
            }
            // Update reference duration once we have official details
            if (songDetails.duration?.seconds) {
              referenceDuration = songDetails.duration.seconds;
            }
          }
        } catch (e) {
          console.warn('[Handlers] Metadata enrichment failed', e);
        }
      }

      // Send enriched metadata update to UI (only if we actually enriched something)
      const hasNewInfo =
        (enrichedMetadata.artists && enrichedMetadata.artists.length > 0 && !playbackInfo.metadata.artists?.length) ||
        (enrichedMetadata.albumId && !playbackInfo.metadata.albumId);

      // Only proceed if info has changed since last enrichment
      if (hasNewInfo && enrichmentVersion === currentVersion) {
        // Cache this for Step 1 of next poll
        lastEnrichedMetadata = enrichedMetadata;
        lastEnrichedVideoId = currentVideoId;

        // Ensure duration consistency even in enriched info
        const enrichedPlaybackInfo: PlaybackInfo = {
          ...playbackInfo,
          duration: referenceDuration > 0 ? referenceDuration : playbackInfo.duration,
          metadata: enrichedMetadata
        };

        lastPlaybackInfo = enrichedPlaybackInfo;

        BrowserWindow.getAllWindows().forEach(win => {
          if (!win.isDestroyed() && win.id !== hiddenWindow.id) {
            win.webContents.send(IPCChannels.PLAYBACK_STATE_CHANGED, enrichedPlaybackInfo);
          }
        });

        // Update tray with enriched metadata
        if (settings.displayMode === 'menuBar' && process.platform === 'darwin') {
          trayService.updateTrack(enrichedMetadata);
        }
      }
    }
  });

  ipcMain.handle(IPCChannels.PLAYBACK_GET_STATE, () => {
    return lastPlaybackInfo;
  });

  // ========================================
  // Playback controls: UI → Main → Hidden (OS-level Media Keys Emulation)
  // ========================================

  const sendMediaKey = (keyCode: string, fallbackChar?: string) => {
    if (hiddenWindow.isDestroyed()) return;
    // 1. Send the primary media key
    hiddenWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode });
    hiddenWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode });

    // 2. Send fallback keyboard shortcut if provided (e.g., Space for Play)
    if (fallbackChar) {
      hiddenWindow.webContents.sendInputEvent({ type: 'keyDown', keyCode: fallbackChar });
      hiddenWindow.webContents.sendInputEvent({ type: 'char', keyCode: fallbackChar });
      hiddenWindow.webContents.sendInputEvent({ type: 'keyUp', keyCode: fallbackChar });
    }
  };

  ipcMain.on(IPCChannels.PLAYBACK_PLAY, () => {
    if (hiddenWindow.isDestroyed()) return;
    sendMediaKey('MediaPlayPause', 'Space');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_PLAY);
  });

  ipcMain.on(IPCChannels.PLAYBACK_PAUSE, () => {
    if (hiddenWindow.isDestroyed()) return;
    sendMediaKey('MediaPlayPause', 'Space');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_PAUSE);
  });

  ipcMain.on(IPCChannels.PLAYBACK_NEXT, () => {
    if (hiddenWindow.isDestroyed() || !lastPlaybackInfo) return;
    sendMediaKey('MediaNextTrack', 'n');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_NEXT);
  });

  ipcMain.on(IPCChannels.PLAYBACK_PREVIOUS, () => {
    if (hiddenWindow.isDestroyed() || !lastPlaybackInfo) return;
    sendMediaKey('MediaPreviousTrack', 'p');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_PREVIOUS);
  });

  ipcMain.on(IPCChannels.PLAYBACK_SEEK, (_event, seekTime: number) => {
    if (hiddenWindow.isDestroyed() || !lastPlaybackInfo) return;
    // Seeking still needs IPC as there's no native "seek" media key
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_SEEK, seekTime);
  });

  // ========================================
  // Image Proxy: Fetch with browser-like headers
  // ========================================

  ipcMain.handle(IPCChannels.IMAGE_PROXY_FETCH, async (_event, url: string) => {
    try {
      const response = await net.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://music.youtube.com/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        }
      });

      if (!response.ok) {
        throw new Error(`Proxy fetch failed: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return `data:${contentType};base64,${base64}`;
    } catch (err) {
      console.error('Image proxy fetch error:', err);
      throw err;
    }
  });

  // ========================================
  // YTMusic API Handlers
  // ========================================

  ipcMain.handle(IPCChannels.YT_GET_HOME, async () => {
    return await ytMusicService.getHome();
  });

  ipcMain.handle(IPCChannels.YT_GET_HOME_ALBUMS, async () => {
    return await ytMusicService.getHomeAlbums();
  });

  ipcMain.handle(IPCChannels.YT_GET_ALBUM_DETAILS, async (_event, albumId: string) => {
    return await ytMusicService.getAlbumDetails(albumId);
  });

  ipcMain.handle(IPCChannels.YT_GET_PLAYLIST, async (_event, playlistId: string) => {
    return await ytMusicService.getPlaylist(playlistId);
  });

  ipcMain.handle(IPCChannels.YT_GET_ARTIST_DETAILS, async (_event, artistId: string) => {
    return await ytMusicService.getArtistDetails(artistId);
  });

  ipcMain.handle(IPCChannels.YT_GET_SONG_DETAILS, async (_event, videoId: string) => {
    return await ytMusicService.getSongDetails(videoId);
  });

  ipcMain.handle(IPCChannels.YT_SEARCH, async (_event, query: string) => {
    return await ytMusicService.search(query);
  });

  ipcMain.on(IPCChannels.YT_SHOW_LOGIN, () => {
    if (hiddenWindow.isDestroyed()) return;
    hiddenWindow.show();
    hiddenWindow.focus();
    // After login window is focused, we likely want to refresh once closed or periodically.
    // For now, let's ensure we can re-init later.
    ytMusicService.initialize(true);
  });

  let lastPlayRequestTime = 0;

  ipcMain.on(IPCChannels.YT_PLAY, async (_event, item: MusicItem, contextId?: string) => {
    if (hiddenWindow.isDestroyed()) return;

    // 1. Throttling and duplicate prevention
    const now = Date.now();
    if (now - lastPlayRequestTime < 500) return;

    const videoIdForDupCheck = isSongItem(item) ? item.youtube_video_id : undefined;
    // Skip if we are already playing or explicitly loading THIS same videoId
    if (videoIdForDupCheck && lastPlayContext.videoId === videoIdForDupCheck && lastPlaybackInfo?.playbackState === 'loading') {
      return;
    }

    lastPlayRequestTime = now;

    // Increment version ONLY when we actually proceed with a new playback request
    const currentPlayVersion = ++enrichmentVersion;

    // 2. Extract necessary info
    let id: string | undefined = videoIdForDupCheck;
    let type = item.type;
    let url: string = '';

    // Reset context basics
    lastPlayContext = {
      playMode: item.type as any
    };

    if (isSongItem(item)) {
      id = item.youtube_video_id;
      url = `https://music.youtube.com/watch?v=${id}`;

      // Select the best contextId for continuous playback
      // If we're in an album, item.youtube_playlist_id (OLAK...) is better than contextId (MPRE...)
      let listId = contextId;
      if (!listId || (listId.startsWith('MPRE') && item.youtube_playlist_id && !item.youtube_playlist_id.startsWith('MPRE'))) {
        listId = item.youtube_playlist_id || contextId;
      }

      // Normalize listId: VL prefix is for browse IDs, strip it for watch URLs
      if (listId?.startsWith('VL')) {
        listId = listId.substring(2);
      }
      if (listId) {
        url += `&list=${listId}`;
      }
      lastPlayContext = {
        artists: item.artists,
        albumId: contextId || item.youtube_playlist_id || item.album?.youtube_browse_id, // Keep original ID for metadata
        videoId: item.youtube_video_id,
        playMode: (listId?.startsWith('MPRE') || item.album?.youtube_browse_id) ? 'ALBUM' : (listId ? 'PLAYLIST' : 'SONG')
      };
    } else if (isAlbumItem(item)) {
      id = item.youtube_browse_id;
      // Normalize: VL prefix is for browse IDs, strip it for watch URLs
      let albumListId = item.youtube_playlist_id || id;
      if (albumListId?.startsWith('VL')) {
        albumListId = albumListId.substring(2);
      }
      url = `https://music.youtube.com/watch?list=${albumListId}`;
      lastPlayContext = {
        artists: item.artists,
        albumId: id,
        playMode: 'ALBUM'
      };
    } else if (isPlaylistItem(item) || isChartItem(item)) {
      id = item.youtube_playlist_id;
      // Normalize: VL prefix is for browse IDs, strip it for watch URLs
      let playlistListId = id;
      if (playlistListId?.startsWith('VL')) {
        playlistListId = playlistListId.substring(2);
      }
      url = `https://music.youtube.com/watch?list=${playlistListId}`;
      lastPlayContext = {
        playMode: 'PLAYLIST',
        albumId: id // Store original ID for metadata
      };
    } else if (isRadioItem(item)) {
      id = item.seed_video_id || item.youtube_playlist_id;
      url = `https://music.youtube.com/watch?v=${id}&list=${item.youtube_playlist_id}`;
      lastPlayContext = {
        videoId: item.seed_video_id,
        playMode: 'RADIO'
      };
    } else {
      // Artist/etc.
      id = (item as any).youtube_browse_id;
      url = `https://music.youtube.com/browse/${id}`;
      lastPlayContext = { playMode: 'ARTIST' as any };
    }

    // 3. Immediately notify UI of "Loading" state with new metadata
    // This provides instant visual feedback and prevents the "disappearing" issue
    const loadingInfo: PlaybackInfo = {
      metadata: {
        title: item.title,
        artist: (item as any).artists ? (item as any).artists.map((a: any) => a.name).join(', ') : item.subtitle,
        artwork: item.thumbnails.map(t => ({ src: t.url, sizes: `${t.width}x${t.height}` })),
        videoId: isSongItem(item) ? item.youtube_video_id : undefined,
      },
      playbackState: 'loading',
      position: 0,
      duration: isSongItem(item) ? (item.duration?.seconds || 0) : 0,
    };

    // Store reference duration to prevent jumps during playback
    referenceDuration = loadingInfo.duration;

    lastPlaybackInfo = loadingInfo;
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed() && win.id !== hiddenWindow.id) {
        win.webContents.send(IPCChannels.PLAYBACK_STATE_CHANGED, loadingInfo);
      }
    });

    // 4. Force state in hidden window and load
    // Inject official duration to hidden window so preload can handle auto-advance correctly
    hiddenWindow.webContents.executeJavaScript(`
      navigator.mediaSession.playbackState = "none"; 
      block_updates = true;
      window._officialDuration = ${loadingInfo.duration};
    `).catch(() => { });

    trayService.showLoading();
    // Immediate tray update with new metadata if available (prevents marquee from old track)
    trayService.updateTrack(loadingInfo.metadata);

    hiddenWindow.webContents.stop(); // Discard previous load/navigation
    hiddenWindow.loadURL(url);
  });

  ipcMain.handle(IPCChannels.YT_CHECK_LOGIN, async () => {
    return await ytMusicService.checkLoginStatus();
  });

  // ========================================
  // Settings Handlers
  // ========================================

  ipcMain.handle(IPCChannels.SETTINGS_GET, async () => {
    return settingsService.getSettings();
  });

  ipcMain.handle(IPCChannels.SETTINGS_UPDATE, async (_event, partial: Partial<AppSettings>) => {
    const updated = settingsService.updateSettings(partial);

    // Broadcast settings change to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(IPCChannels.SETTINGS_CHANGED, updated);
      }
    });

    return updated;
  });

  ipcMain.handle(IPCChannels.SETTINGS_REQUEST_RESTART, async () => {
    // In development mode, app.relaunch() doesn't work properly
    // We need to quit and let the user restart manually
    if (process.env.NODE_ENV === 'development') {
      // Just quit in development mode
      setTimeout(() => {
        app.quit();
      }, 100);
    } else {
      // In production, relaunch works properly
      app.relaunch();
      app.quit();
    }
  });

  ipcMain.handle(IPCChannels.APP_GET_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPCChannels.APP_CHECK_FOR_UPDATES, async () => {
    try {
      const response = await net.fetch('https://api.github.com/repos/tsumugu/silent/releases/latest', {
        headers: {
          'User-Agent': `Silent/${app.getVersion()}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Main] GitHub API error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch latest release from GitHub: ${response.status}`);
      }

      const latestRelease = await response.json();
      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const currentVersion = app.getVersion();

      const semver = require('semver');
      const hasUpdate = semver.gt(semver.coerce(latestVersion), semver.coerce(currentVersion));

      return {
        hasUpdate,
        latestVersion,
        currentVersion,
        url: latestRelease.html_url,
        publishedAt: latestRelease.published_at,
        notes: latestRelease.body
      };
    } catch (error) {
      console.error('[Main] Update check failed:', error);
      throw error;
    }
  });
}
