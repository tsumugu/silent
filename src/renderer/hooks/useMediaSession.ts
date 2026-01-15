import { useEffect } from 'react';
import { setPlaybackInfo } from '../store/playerStore';

export function useMediaSession() {
  useEffect(() => {
    // Listen for playback state updates from Main Process
    const unsubscribe = window.electronAPI.onPlaybackStateChange((playbackInfo) => {
      setPlaybackInfo(playbackInfo);
    });

    // Request initial state (for window reopen)
    window.electronAPI.getPlaybackState().then(setPlaybackInfo);

    return unsubscribe;
  }, []);
}
