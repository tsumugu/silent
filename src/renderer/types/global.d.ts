import { PlaybackInfo } from '../../shared/types';
import { MusicItem, MusicDetail } from '../../shared/types/music';

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
      getHome: () => Promise<any[]>; // Home sections are complex, any[] is fine for now
      getHomeAlbums: () => Promise<MusicItem[]>;
      getAlbumDetails: (albumId: string) => Promise<MusicDetail | null>;
      getPlaylist: (playlistId: string) => Promise<MusicDetail | null>;
      search: (query: string) => Promise<{
        songs: MusicItem[];
        albums: MusicItem[];
        playlists: MusicItem[];
      }>;
      showLogin: () => void;
      checkLogin: () => Promise<boolean>;
      onSessionUpdated: (callback: () => void) => void;
      play: (id: string, type: 'SONG' | 'ALBUM' | 'PLAYLIST') => void;
      setVibrancy: (vibrancy: 'under-window' | 'content' | 'sidebar' | 'menu' | 'popover' | 'hud' | 'sheet' | 'window' | 'dropdown' | 'tooltip' | 'device-discovery' | 'video' | 'selection' | 'titlebar' | null) => void;
    };
  }
}

export { };
