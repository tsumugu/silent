import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { PlaybackInfo } from '../../shared/types';

export function useMediaSession() {
  const setPlaybackInfo = usePlayerStore((state) => state.setPlaybackInfo);

  useEffect(() => {
    // 1. Listen for playback state updates from hidden window
    window.electronAPI.onPlaybackStateChange((playbackInfo) => {
      console.log('Received playback info:', playbackInfo);
      setPlaybackInfo(playbackInfo);
    });

    // 2. Request initial state from main process (for window reopen)
    window.electronAPI.getPlaybackState().then((initialState: PlaybackInfo | null) => {
      if (initialState) {
        console.log('Restored initial playback state:', initialState);
        setPlaybackInfo(initialState);
      }
    });
  }, [setPlaybackInfo]);
}
