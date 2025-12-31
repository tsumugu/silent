import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { PlaybackInfo } from '../../shared/types';

export function useMediaSession() {
  const setPlaybackInfo = usePlayerStore((state) => state.setPlaybackInfo);

  useEffect(() => {
    // 1. Listen for playback state updates from hidden window
    window.electronAPI.onPlaybackStateChange((playbackInfo) => {
      setPlaybackInfo(playbackInfo);
    });

    // 2. Request initial state from main process (for window reopen)
    window.electronAPI.getPlaybackState().then((initialState: PlaybackInfo | null) => {
      if (initialState) {
        setPlaybackInfo(initialState);
      }
    });
  }, [setPlaybackInfo]);
}
