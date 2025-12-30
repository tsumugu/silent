import { BrowserWindow, ipcMain, net } from 'electron';
import { IPCChannels } from './types';
import { PlaybackInfo } from '../../shared/types';

import { ytMusicService } from '../services/YTMusicService';

export function setupIPCHandlers(
  uiWindow: BrowserWindow,
  hiddenWindow: BrowserWindow
) {
  // ========================================
  // Window controls (already set up in index.ts, but included here for completeness)
  // ========================================

  ipcMain.on(IPCChannels.WINDOW_MINIMIZE, () => {
    uiWindow.minimize();
  });

  ipcMain.on(IPCChannels.WINDOW_MAXIMIZE, () => {
    if (uiWindow.isFullScreen()) {
      uiWindow.setFullScreen(false);
    } else {
      uiWindow.setFullScreen(true);
    }
  });

  ipcMain.on(IPCChannels.WINDOW_CLOSE, () => {
    uiWindow.close();
  });

  // ========================================
  // Playback state updates: Hidden → Main → UI
  // ========================================

  ipcMain.on(IPCChannels.PLAYBACK_STATE_CHANGED, (_event, playbackInfo: PlaybackInfo) => {
    // Forward playback state from hidden window to UI window
    uiWindow.webContents.send(IPCChannels.PLAYBACK_STATE_CHANGED, playbackInfo);
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

  ipcMain.handle(IPCChannels.YT_GET_RECOMMENDATIONS, async () => {
    return await ytMusicService.getRecommendations();
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

  ipcMain.on(IPCChannels.YT_SHOW_LOGIN, () => {
    hiddenWindow.show();
    hiddenWindow.focus();
    // Reset initialization so next request fetches fresh cookies
    ytMusicService.initialize(true);
  });

  ipcMain.on(IPCChannels.YT_PLAY, (_event, id: string, type: 'SONG' | 'ALBUM' | 'PLAYLIST') => {
    const url = type === 'SONG'
      ? `https://music.youtube.com/watch?v=${id}`
      : type === 'PLAYLIST'
        ? `https://music.youtube.com/watch?list=${id}` // Playlists should play immediately
        : `https://music.youtube.com/browse/${id}`; // Albums might browse, but typically we want to play them too? 
    // Actually for albums 'browse' is viewing it, 'watch?playlist=' is playing.
    // But for now, user asked for playlist DETAIL view, so 'YT_PLAY' is for hitting play button.
    hiddenWindow.loadURL(url);
  });

  console.log('IPC handlers set up successfully');
}
