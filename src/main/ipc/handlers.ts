import { BrowserWindow, ipcMain, net } from 'electron';
import { IPCChannels } from './types';
import { PlaybackInfo } from '../../shared/types';

import { ytMusicService } from '../services/YTMusicService';

// Persist the last known playback state to restore it when UI window is recreated
let lastPlaybackInfo: PlaybackInfo | null = null;

export function clearIPCHandlers() {
  Object.values(IPCChannels).forEach(channel => {
    ipcMain.removeAllListeners(channel);
    ipcMain.removeHandler(channel);
  });
}

export function setupIPCHandlers(
  uiWindow: BrowserWindow,
  hiddenWindow: BrowserWindow
) {
  // Clear existing listeners and handlers to avoid duplication when window is recreated
  clearIPCHandlers();

  // ========================================
  // Window controls
  // ========================================

  ipcMain.on(IPCChannels.WINDOW_MINIMIZE, () => {
    if (!uiWindow.isDestroyed()) uiWindow.minimize();
  });

  ipcMain.on(IPCChannels.WINDOW_MAXIMIZE, () => {
    if (uiWindow.isDestroyed()) return;
    if (uiWindow.isFullScreen()) {
      uiWindow.setFullScreen(false);
    } else {
      uiWindow.setFullScreen(true);
    }
  });

  ipcMain.on(IPCChannels.WINDOW_CLOSE, () => {
    if (!uiWindow.isDestroyed()) uiWindow.close();
  });

  ipcMain.on(IPCChannels.WINDOW_SET_VIBRANCY, (_event, vibrancy: any) => {
    if (!uiWindow.isDestroyed()) {
      uiWindow.setVibrancy(vibrancy);
    }
  });

  // ========================================
  // Playback state updates: Hidden → Main → UI
  // ========================================

  ipcMain.on(IPCChannels.PLAYBACK_STATE_CHANGED, (_event, playbackInfo: PlaybackInfo) => {
    // Persist for state recovery
    lastPlaybackInfo = playbackInfo;

    // Forward playback state from hidden window to UI window
    if (!uiWindow.isDestroyed()) {
      uiWindow.webContents.send(IPCChannels.PLAYBACK_STATE_CHANGED, playbackInfo);
    }
  });

  ipcMain.handle(IPCChannels.PLAYBACK_GET_STATE, () => {
    return lastPlaybackInfo;
  });

  // ========================================
  // Playback controls: UI → Main → Hidden (OS-level Media Keys Emulation)
  // ========================================

  const sendMediaKey = (keyCode: string, fallbackChar?: string) => {
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
    sendMediaKey('MediaPlayPause', 'Space');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_PLAY);
  });

  ipcMain.on(IPCChannels.PLAYBACK_PAUSE, () => {
    sendMediaKey('MediaPlayPause', 'Space');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_PAUSE);
  });

  ipcMain.on(IPCChannels.PLAYBACK_NEXT, () => {
    sendMediaKey('MediaNextTrack', 'n');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_NEXT);
  });

  ipcMain.on(IPCChannels.PLAYBACK_PREVIOUS, () => {
    sendMediaKey('MediaPreviousTrack', 'p');
    hiddenWindow.webContents.send(IPCChannels.PLAYBACK_PREVIOUS);
  });

  ipcMain.on(IPCChannels.PLAYBACK_SEEK, (_event, seekTime: number) => {
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

  ipcMain.handle(IPCChannels.YT_SEARCH, async (_event, query: string) => {
    return await ytMusicService.search(query);
  });

  ipcMain.on(IPCChannels.YT_SHOW_LOGIN, () => {
    hiddenWindow.show();
    hiddenWindow.focus();
    // After login window is focused, we likely want to refresh once closed or periodically.
    // For now, let's ensure we can re-init later.
    ytMusicService.initialize(true);
  });

  ipcMain.handle(IPCChannels.YT_CHECK_LOGIN, async () => {
    return await ytMusicService.checkLoginStatus();
  });

  ipcMain.on(IPCChannels.YT_PLAY, (_event, id: string, type: 'SONG' | 'ALBUM' | 'PLAYLIST') => {
    const url = type === 'SONG'
      ? `https://music.youtube.com/watch?v=${id}`
      : type === 'PLAYLIST'
        ? `https://music.youtube.com/watch?list=${id}` // Playlists should play immediately
        : `https://music.youtube.com/browse/${id}`;

    // Stop current playback before loading new URL to prevent "stuck" states
    hiddenWindow.webContents.executeJavaScript('navigator.mediaSession.playbackState = "none"; block_updates = true;')
      .catch(() => { }); // Ignore errors if script fails

    hiddenWindow.loadURL(url);
  });


}
