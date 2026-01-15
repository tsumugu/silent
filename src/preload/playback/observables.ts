import { merge, combineLatest, fromEvent, EMPTY, Observable, Subject, timer, of } from 'rxjs';
import {
  switchMap, map, filter, distinctUntilChanged,
  debounceTime, catchError, shareReplay, startWith, scan, takeUntil, tap, concatWith
} from 'rxjs/operators';
import { PlaybackInfo } from '../../shared/types/playback';
import { createVideoDetector } from './video-detector';
import { createMetadataObservable } from './metadata-extractor';
import { comparePlaybackStates } from './state-comparator';

/**
 * Subject to trigger manual like status overrides
 */
export const manualLikeUpdate$ = new Subject<{ videoId: string, status: 'LIKE' | 'DISLIKE' | 'INDIFFERENT' }>();

/**
 * Creates an observable that emits the current "active" like status override
 * for a given video ID. Emits undefined when no override is active.
 */
function createLikeOverrideObservable(
  videoId$: Observable<string | undefined>,
  domLikeStatus$: Observable<'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined>
): Observable<'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined> {
  const switchMapResult$: Observable<'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined> = manualLikeUpdate$.pipe(
    switchMap((update) => {
      console.log(`[RxJS] Like override STARTED: ${update.status} for ${update.videoId}`);

      // The status we want to stick to
      const statusValue: 'LIKE' | 'DISLIKE' | 'INDIFFERENT' = update.status;

      const trackChanged$ = videoId$.pipe(
        filter(id => id !== update.videoId),
        map(() => 'track_changed')
      );

      const domMatched$ = domLikeStatus$.pipe(
        filter(status => status === update.status),
        map(() => 'dom_matched')
      );

      const safetyTimeout$ = timer(15000).pipe(map(() => 'timeout'));

      const notifier$ = merge(trackChanged$, domMatched$, safetyTimeout$).pipe(
        tap(reason => console.log(`[RxJS] Like override ENDED. Reason: ${reason} (Requested: ${update.status}, Video: ${update.videoId})`))
      );

      return of(statusValue).pipe(
        takeUntil(notifier$),
        concatWith(of(undefined as 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined))
      );
    })
  );

  return switchMapResult$.pipe(
    startWith(undefined as 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined),
    distinctUntilChanged()
  );
}

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
 *     combineLatest with metadata$ and likeOverride$
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

  const videoId$ = metadata$.pipe(
    map(m => m?.videoId),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const domLikeStatus$ = metadata$.pipe(
    map(m => m?.likeStatus),
    distinctUntilChanged()
  );

  const likeOverride$ = createLikeOverrideObservable(videoId$, domLikeStatus$);

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

  // Combine video events with metadata and like overrides to create PlaybackInfo
  return combineLatest([videoEvents$, metadata$, likeOverride$]).pipe(
    // Respect block_updates flag (navigation blocking)
    filter(() => !(window as any).block_updates),

    // Map to PlaybackInfo structure
    map(([video, metadata, override]): PlaybackInfo | null => {
      if (!metadata) return null;

      const playbackState = video.paused ? 'paused' : 'playing';
      const position = video.currentTime || 0;

      // Apply like status override if active
      if (override) {
        metadata = { ...metadata, likeStatus: override };
      }

      return {
        metadata,
        playbackState: playbackState as any,
        position,
        duration: video.duration || 0,
      };
    }),

    // Detect track changes and fix stale positions (Sticky Transition)
    scan((acc: (PlaybackInfo & { isTransitioning?: boolean }) | null, current: PlaybackInfo | null) => {
      if (!current) return null;
      if (!acc) return current;

      const prevVideoId = acc.metadata?.videoId;
      const currVideoId = current.metadata?.videoId;
      let isTransitioning = acc.isTransitioning || false;

      // Track changed!
      if (prevVideoId && currVideoId && prevVideoId !== currVideoId) {
        isTransitioning = true;
      }

      if (isTransitioning) {
        if (current.position < 1.0) {
          isTransitioning = false; // Video element reset
        } else {
          return { ...current, position: 0, isTransitioning: true };
        }
      }

      return { ...current, isTransitioning: false };
    }, null as (PlaybackInfo & { isTransitioning?: boolean }) | null),

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
