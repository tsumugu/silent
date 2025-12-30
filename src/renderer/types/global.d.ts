import { PlaybackInfo } from '../../shared/types';

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      // Window controls
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      onFullscreenChange: (callback: (isFullscreen: boolean) => void) => void;
      // Playback state
      onPlaybackStateChange: (callback: (playbackInfo: PlaybackInfo) => void) => void;
      // Playback controls
      playbackPlay: () => void;
      playbackPause: () => void;
      playbackNext: () => void;
      playbackPrevious: () => void;
      playbackSeek: (seekTime: number) => void;
      // Image Proxy
      proxyFetchImage: (url: string) => Promise<string>;
    };
  }
}

export { };
