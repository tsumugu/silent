import { merge, combineLatest, fromEvent, EMPTY, Observable } from 'rxjs';
import {
  switchMap, map, filter, distinctUntilChanged,
  debounceTime, catchError, shareReplay, startWith
} from 'rxjs/operators';
import { PlaybackInfo } from '../../shared/types/playback';
import { createVideoDetector } from './video-detector';
import { createMetadataObservable } from './metadata-extractor';
import { comparePlaybackStates } from './state-comparator';

/**
 * Creates the main playback state observable that combines:
 * 1. Video element detection (500ms polling)
 * 2. Video element events (timeupdate, play, pause, etc.)
 * 3. Metadata extraction (500ms polling)
 * 4. Block updates filter (navigation state)
 * 5. Deduplication (custom comparator with thresholds)
 * 6. Noise reduction (30ms debounce)
 *
 * Stream Architecture:
 * videoElement$ (500ms polling)
 *     ↓
 *     switchMap to video events (timeupdate, play, pause, etc.)
 *     ↓
 *     combineLatest with metadata$ (500ms polling)
 *     ↓
 *     filter by block_updates flag
 *     ↓
 *     map to PlaybackInfo
 *     ↓
 *     distinctUntilChanged (custom comparator)
 *     ↓
 *     debounceTime(30ms)
 *     ↓
 *     Subscribe → IPC send
 *
 * @returns Observable that emits PlaybackInfo when state changes significantly
 */
export function createPlaybackObservable(): Observable<PlaybackInfo> {
  const videoElement$ = createVideoDetector();
  const metadata$ = createMetadataObservable();

  // Convert video element to stream of video events
  const videoEvents$ = videoElement$.pipe(
    switchMap(video => {
      if (!video) return EMPTY;

      // Listen to all relevant video events
      return merge(
        fromEvent(video, 'timeupdate'),
        fromEvent(video, 'play'),
        fromEvent(video, 'pause'),
        fromEvent(video, 'durationchange'),
        fromEvent(video, 'ended'),
        fromEvent(video, 'loadedmetadata'),
        fromEvent(video, 'seeking'),
        fromEvent(video, 'seeked')
      ).pipe(
        startWith(null), // Emit immediately for initial state
        map(() => video), // Return the video element itself
        catchError(err => {
          console.error('[Playback] Video event error:', err);
          return EMPTY;
        })
      );
    })
  );

  // Combine video events with metadata to create PlaybackInfo
  return combineLatest([videoEvents$, metadata$]).pipe(
    // Respect block_updates flag (navigation blocking)
    filter(() => !(window as any).block_updates),

    // Map to PlaybackInfo structure
    map(([video, metadata]): PlaybackInfo | null => {
      if (!metadata) return null;

      const playbackState = video.paused ? 'paused' : 'playing';

      return {
        metadata,
        playbackState: playbackState as any,
        position: video.currentTime || 0,
        duration: video.duration || 0,
      };
    }),

    // Filter out null states (no metadata available)
    filter((state: PlaybackInfo | null): state is PlaybackInfo => state !== null),

    // Deduplicate using custom comparator (preserves existing thresholds)
    distinctUntilChanged(comparePlaybackStates),

    // Debounce to reduce noise (30ms window)
    debounceTime(30),

    // Share replay to allow multiple subscribers
    shareReplay(1)
  );
}
