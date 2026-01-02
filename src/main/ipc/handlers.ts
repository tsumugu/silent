import { BrowserWindow, ipcMain, net, app } from 'electron';
import { IPCChannels } from './types';
import { PlaybackInfo } from '../../shared/types';
import { AppSettings } from '../../shared/types/settings';

import { ytMusicService } from '../services/YTMusicService';
import { settingsService } from '../services/SettingsService';
import { trayService } from '../services/TrayService';

// Persist the last known playback state to restore it when UI window is recreated
let lastPlaybackInfo: PlaybackInfo | null = null;

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

  ipcMain.on(IPCChannels.PLAYBACK_STATE_CHANGED, (_event, playbackInfo: PlaybackInfo) => {
    // Persist for state recovery
    lastPlaybackInfo = playbackInfo;

    // Forward playback state from hidden window to ALL open windows (UI, Preferences, etc.)
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed() && win.id !== hiddenWindow.id) {
        win.webContents.send(IPCChannels.PLAYBACK_STATE_CHANGED, playbackInfo);
      }
    });

    // Update tray with track info
    const settings = settingsService.getSettings();
    if (settings.displayMode === 'menuBar' && process.platform === 'darwin') {
      trayService.updateTrack(playbackInfo.metadata);
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
    if (hiddenWindow.isDestroyed()) return;
    sendMediaKey('MediaNextTrack', 'n');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_NEXT);
  });

  ipcMain.on(IPCChannels.PLAYBACK_PREVIOUS, () => {
    if (hiddenWindow.isDestroyed()) return;
    sendMediaKey('MediaPreviousTrack', 'p');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_PREVIOUS);
  });

  ipcMain.on(IPCChannels.PLAYBACK_SEEK, (_event, seekTime: number) => {
    if (hiddenWindow.isDestroyed()) return;
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

  ipcMain.handle(IPCChannels.YT_CHECK_LOGIN, async () => {
    return await ytMusicService.checkLoginStatus();
  });

  ipcMain.on(IPCChannels.YT_PLAY, (_event, id: string, type: 'SONG' | 'ALBUM' | 'PLAYLIST', contextId?: string) => {
    if (hiddenWindow.isDestroyed()) return;

    let url: string;
    if (type === 'SONG') {
      url = `https://music.youtube.com/watch?v=${id}`;
      if (contextId) {
        url += `&list=${contextId}`;
      }
    } else if (type === 'PLAYLIST') {
      url = `https://music.youtube.com/watch?list=${id}`;
    } else {
      url = `https://music.youtube.com/browse/${id}`;
    }


    // Stop current playback before loading new URL to prevent "stuck" states
    hiddenWindow.webContents.executeJavaScript('navigator.mediaSession.playbackState = "none"; block_updates = true;')
      .catch(() => { }); // Ignore errors if script fails

    trayService.showLoading();
    hiddenWindow.loadURL(url);
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
}
