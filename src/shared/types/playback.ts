import { MusicArtist } from './music';

// MediaSession metadata types
export interface MediaImage {
    src: string;
    sizes?: string;
    type?: string;
}

export interface MediaMetadata {
    title?: string;
    artist?: string;
    album?: string;
    albumId?: string;
    artistId?: string;
    artists?: MusicArtist[];
    artwork?: MediaImage[];
    videoId?: string;
}

// Playback state types
export type PlaybackState = 'none' | 'paused' | 'playing' | 'loading';

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
