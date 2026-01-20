import { create } from 'zustand';
import { PlaybackInfo } from '../../shared/types/playback';
import { zandle } from './zandle';

interface PlayerState {
  playbackInfo: PlaybackInfo | null;
}

export const usePlayerStore = create<PlayerState>()(
  zandle<PlayerState>({
    storeName: 'player',
    syncKeys: ['playbackInfo'], // Only sync playbackInfo
  })((set, get) => ({
    playbackInfo: null,
  }))
);

// External update function (can still be used, but now syncs via Zandle)
export function setPlaybackInfo(info: PlaybackInfo | null) {
  usePlayerStore.setState({ playbackInfo: info });
}
