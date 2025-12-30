// MediaSession metadata types
export interface MediaMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
  videoId?: string;
}

export interface MediaImage {
  src: string;
  sizes?: string;
  type?: string;
}

// Playback state types
export type PlaybackState = 'none' | 'paused' | 'playing';

export interface PlaybackInfo {
  metadata: MediaMetadata | null;
  playbackState: PlaybackState;
  position: number;
  duration: number;
}

// Playback control actions
export type PlaybackAction = 'play' | 'pause' | 'previoustrack' | 'nexttrack' | 'seekto';

export interface SeekToAction {
  action: 'seekto';
  seekTime: number;
}
