import { contextBridge, ipcRenderer } from 'electron';
import { PlaybackInfo } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Fullscreen state
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    ipcRenderer.on('fullscreen-changed', (_event, isFullscreen) => callback(isFullscreen));
  },

  // Playback state listener
  onPlaybackStateChange: (callback: (playbackInfo: PlaybackInfo) => void) => {
    ipcRenderer.on('playback:state-changed', (_event, playbackInfo) => callback(playbackInfo));
  },

  getPlaybackState: () => ipcRenderer.invoke('playback:get-state'),

  // Playback controls
  playbackPlay: () => ipcRenderer.send('playback:play'),
  playbackPause: () => ipcRenderer.send('playback:pause'),
  playbackNext: () => ipcRenderer.send('playback:next'),
  playbackPrevious: () => ipcRenderer.send('playback:previous'),
  playbackSeek: (seekTime: number) => ipcRenderer.send('playback:seek', seekTime),

  // Image Proxy
  proxyFetchImage: (url: string) => ipcRenderer.invoke('image:proxy-fetch', url),

  // YTMusic API
  getHome: () => ipcRenderer.invoke('ytmusic:get-home'),
  getHomeAlbums: () => ipcRenderer.invoke('ytmusic:get-home-albums'),
  getAlbumDetails: (albumId: string) => ipcRenderer.invoke('ytmusic:get-album-details', albumId),
  getPlaylist: (playlistId: string) => ipcRenderer.invoke('ytmusic:get-playlist', playlistId),
  search: (query: string) => ipcRenderer.invoke('ytmusic:search', query),
  showLogin: () => ipcRenderer.send('ytmusic:show-login'),
  checkLogin: () => ipcRenderer.invoke('ytmusic:check-login'),
  onSessionUpdated: (callback: () => void) => {
    ipcRenderer.on('ytmusic:session-updated', () => callback());
  },
  play: (id: string, type: 'SONG' | 'ALBUM' | 'PLAYLIST') => ipcRenderer.send('ytmusic:play', id, type),
  setVibrancy: (vibrancy: any) => ipcRenderer.send('window:set-vibrancy', vibrancy),
});
