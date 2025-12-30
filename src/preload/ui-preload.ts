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

  // Playback controls
  playbackPlay: () => ipcRenderer.send('playback:play'),
  playbackPause: () => ipcRenderer.send('playback:pause'),
  playbackNext: () => ipcRenderer.send('playback:next'),
  playbackPrevious: () => ipcRenderer.send('playback:previous'),
  playbackSeek: (seekTime: number) => ipcRenderer.send('playback:seek', seekTime),

  // Image Proxy
  proxyFetchImage: (url: string) => ipcRenderer.invoke('image:proxy-fetch', url),
});
