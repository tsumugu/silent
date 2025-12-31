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
      getPlaybackState: () => Promise<PlaybackInfo | null>;
      // Playback controls
      playbackPlay: () => void;
      playbackPause: () => void;
      playbackNext: () => void;
      playbackPrevious: () => void;
      playbackSeek: (seekTime: number) => void;
      // Image Proxy
      proxyFetchImage: (url: string) => Promise<string>;
      // YTMusic API
      getHome: () => Promise<any[]>;
      getHomeAlbums: () => Promise<any[]>;
      getAlbumDetails: (albumId: string) => Promise<any>;
      getPlaylist: (playlistId: string) => Promise<any>;
      showLogin: () => void;
      checkLogin: () => Promise<boolean>;
      onSessionUpdated: (callback: () => void) => void;
      play: (id: string, type: 'SONG' | 'ALBUM' | 'PLAYLIST') => void;
    };
  }
}

export { };
