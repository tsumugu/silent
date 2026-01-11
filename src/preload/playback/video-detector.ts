import { interval, BehaviorSubject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

/**
 * Creates a BehaviorSubject that tracks the active video element.
 * Polls for video element at 500ms intervals (reduced from 100ms polling).
 *
 * Video element selection criteria:
 * - Has blob:// source
 * - Is visible (offsetWidth > 0 OR offsetHeight > 0)
 * - Falls back to first video element if none match
 *
 * @returns BehaviorSubject that emits the current video element or null
 */
export function createVideoDetector(): BehaviorSubject<HTMLVideoElement | null> {
  const videoElement$ = new BehaviorSubject<HTMLVideoElement | null>(null);

  interval(500).pipe(
    map(() => {
      const allVideos = Array.from(document.querySelectorAll('video'));
      const video = allVideos.find(v => {
        const isVisible = v.offsetWidth > 0 || v.offsetHeight > 0;
        const hasSource = v.src && v.src.startsWith('blob:');
        return isVisible && hasSource;
      }) || allVideos[0];
      return video || null;
    }),
    distinctUntilChanged()
  ).subscribe(video => videoElement$.next(video));

  return videoElement$;
}
