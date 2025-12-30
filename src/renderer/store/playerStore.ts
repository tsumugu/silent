import { create } from 'zustand';
import { PlaybackInfo } from '../../shared/types';

interface PlayerState {
  playbackInfo: PlaybackInfo | null;
  isPlaying: boolean;
  setPlaybackInfo: (info: PlaybackInfo) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  playbackInfo: null,
  isPlaying: false,

  setPlaybackInfo: (info: PlaybackInfo) => {
    set({
      playbackInfo: info,
      isPlaying: info.playbackState === 'playing',
    });
  },
}));
