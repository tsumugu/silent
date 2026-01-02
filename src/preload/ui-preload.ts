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

  // Image Proxy
  proxyFetchImage: (url: string) => ipcRenderer.invoke('image:proxy-fetch', url),

  // YTMusic API
  getHome: () => ipcRenderer.invoke('ytmusic:get-home'),
  getHomeAlbums: () => ipcRenderer.invoke('ytmusic:get-home-albums'),
  getAlbumDetails: (albumId: string) => ipcRenderer.invoke('ytmusic:get-album-details', albumId),
  getPlaylist: (playlistId: string) => ipcRenderer.invoke('ytmusic:get-playlist', playlistId),
  getSongDetails: (videoId: string) => ipcRenderer.invoke('ytmusic:get-song-details', videoId),
  search: (query: string) => ipcRenderer.invoke('ytmusic:search', query),
  showLogin: () => ipcRenderer.send('ytmusic:show-login'),
  checkLogin: () => ipcRenderer.invoke('ytmusic:check-login'),
  onSessionUpdated: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('ytmusic:session-updated', listener);
    return () => { ipcRenderer.removeListener('ytmusic:session-updated', listener); };
  },
  play: (id: string, type: 'SONG' | 'ALBUM' | 'PLAYLIST', contextId?: string) => ipcRenderer.send('ytmusic:play', id, type, contextId),
  setVibrancy: (vibrancy: any) => ipcRenderer.send('window:set-vibrancy', vibrancy),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
});
