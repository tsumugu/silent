import { create } from 'zustand';
import { PlaybackInfo } from '../../shared/types/playback';

interface PlayerState {
  playbackInfo: PlaybackInfo | null;
}

export const usePlayerStore = create<PlayerState>(() => ({
  playbackInfo: null,
}));

// External update function (only called from useMediaSession)
export function setPlaybackInfo(info: PlaybackInfo | null) {
  usePlayerStore.setState({ playbackInfo: info });
}
