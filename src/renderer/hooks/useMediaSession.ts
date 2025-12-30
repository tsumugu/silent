import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';

export function useMediaSession() {
  const setPlaybackInfo = usePlayerStore((state) => state.setPlaybackInfo);

  useEffect(() => {
    // Listen for playback state updates from hidden window
    window.electronAPI.onPlaybackStateChange((playbackInfo) => {
      console.log('Received playback info:', playbackInfo);
      setPlaybackInfo(playbackInfo);
    });
  }, [setPlaybackInfo]);
}
