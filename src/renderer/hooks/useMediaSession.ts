import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { PlaybackInfo } from '../../shared/types/playback';

export function useMediaSession() {
  const setPlaybackInfo = usePlayerStore((state) => state.setPlaybackInfo);

  useEffect(() => {
    // 1. Listen for playback state updates from hidden window
    const unsubscribe = window.electronAPI.onPlaybackStateChange((playbackInfo) => {
      setPlaybackInfo(playbackInfo);
    });

    // 2. Request initial state from main process (for window reopen)
    window.electronAPI.getPlaybackState().then((initialState: PlaybackInfo | null) => {
      if (initialState) {
        setPlaybackInfo(initialState);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [setPlaybackInfo]);
}
