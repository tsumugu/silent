import { PlaybackInfo } from '../../shared/types/playback';
import { MusicItem, MusicDetail, MusicArtist, ItemType } from '../../shared/types/music';
import { AppSettings } from '../../shared/types/settings';

declare global {
  interface Window {
    electronAPI: {
      platform: string;
      // Window controls
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
      // Playback state
      onPlaybackStateChange: (callback: (playbackInfo: PlaybackInfo) => void) => () => void;
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
      getArtistDetails: (artistId: string) => Promise<MusicDetail | null>;
      getSongDetails: (videoId: string) => Promise<MusicItem | null>;
      search: (query: string) => Promise<{
        songs: MusicItem[];
        albums: MusicItem[];
        playlists: MusicItem[];
      }>;
      showLogin: () => void;
      checkLogin: () => Promise<boolean>;
      onSessionUpdated: (callback: () => void) => () => void;
      play: (id: string, type: ItemType, contextId?: string, artists?: MusicArtist[], albumId?: string) => void;
      setVibrancy: (vibrancy: 'under-window' | 'content' | 'sidebar' | 'menu' | 'popover' | 'hud' | 'sheet' | 'window' | 'dropdown' | 'tooltip' | 'device-discovery' | 'video' | 'selection' | 'titlebar' | null) => void;
      // Settings
      getSettings: () => Promise<AppSettings>;
      updateSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
      onSettingsChanged: (callback: (settings: AppSettings) => void) => () => void;
      requestRestart: () => Promise<void>;
      getVersion: () => Promise<string>;
      checkForUpdates: () => Promise<any>;
    };
  }
}

export { };
