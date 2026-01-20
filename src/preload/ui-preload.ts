import { contextBridge, ipcRenderer } from 'electron';
import { MusicArtist, MusicItem } from '../shared/types/music';
import { AppSettings } from '../shared/types/settings';
import { PlaybackInfo } from '../shared/types/playback';
import { IPCChannels } from '../main/ipc/types';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Fullscreen state
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    const listener = (_event: any, isFullscreen: boolean) => callback(isFullscreen);
    ipcRenderer.on('fullscreen-changed', listener);
    return () => { ipcRenderer.removeListener('fullscreen-changed', listener); };
  },

  // Playback state listener
  onPlaybackStateChange: (callback: (playbackInfo: PlaybackInfo) => void) => {
    const listener = (_event: any, playbackInfo: PlaybackInfo) => callback(playbackInfo);
    ipcRenderer.on('playback:state-changed', listener);
    return () => { ipcRenderer.removeListener('playback:state-changed', listener); };
  },

  getPlaybackState: () => ipcRenderer.invoke('playback:get-state'),

  // Playback controls
  playbackPlay: () => ipcRenderer.send('playback:play'),
  playbackPause: () => ipcRenderer.send('playback:pause'),
  playbackNext: () => ipcRenderer.send('playback:next'),
  playbackPrevious: () => ipcRenderer.send('playback:previous'),
  playbackSeek: (seekTime: number) => ipcRenderer.send('playback:seek', seekTime),
  playbackShuffle: () => ipcRenderer.send('playback:shuffle'),

  // Image Proxy
  proxyFetchImage: (url: string) => ipcRenderer.invoke('image:proxy-fetch', url),

  // YTMusic API
  getHome: () => ipcRenderer.invoke('ytmusic:get-home'),
  getHomeAlbums: () => ipcRenderer.invoke('ytmusic:get-home-albums'),
  getAlbumDetails: (albumId: string) => ipcRenderer.invoke('ytmusic:get-album-details', albumId),
  getPlaylist: (playlistId: string) => ipcRenderer.invoke('ytmusic:get-playlist', playlistId),
  getArtistDetails: (artistId: string) => ipcRenderer.invoke('ytmusic:get-artist-details', artistId),
  getSongDetails: (videoId: string) => ipcRenderer.invoke('ytmusic:get-song-details', videoId),
  search: (query: string) => ipcRenderer.invoke('ytmusic:search', query),
  getLikedMusic: () => ipcRenderer.invoke('ytmusic:get-liked-music'),
  setLikeStatus: (videoId: string, status: 'LIKE' | 'DISLIKE' | 'INDIFFERENT') => ipcRenderer.invoke('ytmusic:set-like-status', videoId, status),
  showLogin: () => ipcRenderer.send('ytmusic:show-login'),
  checkLogin: () => ipcRenderer.invoke('ytmusic:check-login'),
  onSessionUpdated: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('ytmusic:session-updated', listener);
    return () => { ipcRenderer.removeListener('ytmusic:session-updated', listener); };
  },
  play: (item: any, contextId?: string, shuffle?: boolean) => ipcRenderer.send('ytmusic:play', item, contextId, shuffle),
  setVibrancy: (vibrancy: any) => ipcRenderer.send('window:set-vibrancy', vibrancy),
  setShadow: (hasShadow: boolean) => ipcRenderer.send('window:set-shadow', hasShadow),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),

  // Settings API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke('settings:update', settings),
  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const listener = (_: any, settings: AppSettings) => callback(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  requestRestart: () => ipcRenderer.invoke('settings:request-restart'),
  clearCache: () => ipcRenderer.invoke('cache:clear'),
  getCacheSize: () => ipcRenderer.invoke('cache:get-size'),

  // Zandle API for cross-window state synchronization
  zandle: {
    windowId: ipcRenderer.sendSync(IPCChannels.GET_WINDOW_ID),

    requestSync: (payload: any) => {
      ipcRenderer.send(IPCChannels.ZANDLE_REQUEST_SYNC, payload);
    },

    requestHydration: (storeName: string) => {
      return ipcRenderer.invoke(IPCChannels.ZANDLE_REQUEST_HYDRATION, storeName);
    },

    onSync: (storeName: string, callback: (payload: any) => void) => {
      const channel = `zandle:sync:${storeName}`;
      const listener = (_event: any, payload: any) => callback(payload);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
});
