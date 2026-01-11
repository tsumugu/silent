import { PlaybackInfo } from '../../shared/types/playback';

let lastEmissionTime = 0;

/**
 * Custom comparator for distinctUntilChanged operator.
 * Preserves existing deduplication thresholds from polling implementation:
 * - Duration change: 0.1s
 * - Position jump: 1.5s
 * - Time-based fallback: 2000ms (emit even if no significant change)
 *
 * @param a Previous PlaybackInfo
 * @param b Current PlaybackInfo
 * @returns true if states are considered equal (don't emit), false if different (emit)
 */
export function comparePlaybackStates(a: PlaybackInfo, b: PlaybackInfo): boolean {
  // Metadata changed (includes videoId change for track transitions)
  if (JSON.stringify(a.metadata) !== JSON.stringify(b.metadata)) {
    lastEmissionTime = Date.now();
    return false; // false = not equal, should emit
  }

  // Playback state changed (playing/paused/loading)
  if (a.playbackState !== b.playbackState) {
    lastEmissionTime = Date.now();
    return false;
  }

  // Duration changed significantly (>0.1s threshold)
  if (Math.abs(a.duration - b.duration) > 0.1) {
    lastEmissionTime = Date.now();
    return false;
  }

  // Position jumped (seek or navigation, >1.5s threshold)
  if (Math.abs(a.position - b.position) > 1.5) {
    lastEmissionTime = Date.now();
    return false;
  }

  // Time-based fallback: emit every 2 seconds to ensure UI updates
  // This prevents the UI from freezing during stable playback
  const timeSinceLastUpdate = Date.now() - lastEmissionTime;
  if (timeSinceLastUpdate > 2000) {
    lastEmissionTime = Date.now();
    return false;
  }

  // Otherwise, states are considered equal (don't emit)
  return true;
}
