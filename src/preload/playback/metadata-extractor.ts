import { interval, Observable } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { MediaMetadata } from '../../shared/types/playback';

/**
 * Creates an observable that extracts metadata from YouTube Music DOM.
 * Polls at 500ms intervals since DOM changes are not event-driven.
 *
 * Metadata extraction sources:
 * - Title: ytmusic-player-bar .title element
 * - Artist/Album: ytmusic-player-bar .byline element (parsed from "Artist • Album • Year")
 * - Artwork: ytmusic-player-bar .image element
 * - Video ID: URL query parameter ?v=
 *
 * @returns Observable that emits metadata or null if unavailable
 */
export function createMetadataObservable(): Observable<MediaMetadata | null> {
  return interval(500).pipe(
    map(() => {
      try {
        const playerBar = document.querySelector('ytmusic-player-bar');
        if (!playerBar) return null;

        const title = playerBar.querySelector('.title')?.textContent?.trim();
        const byline = playerBar.querySelector('.byline')?.textContent?.trim();

        // Byline typically contains "Artist • Album • Year" or "Artist • Year"
        const parts = byline ? byline.split(' • ') : [];
        const artist = parts[0] || '';
        const album = parts[1] || '';

        const artworkImg = playerBar.querySelector('.image') as HTMLImageElement;
        const artwork = artworkImg && artworkImg.src ? [{
          src: artworkImg.src,
          sizes: '512x512',
          type: 'image/jpeg'
        }] : [];

        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v') || undefined;

        if (!title) return null;

        return {
          title,
          artist,
          album,
          artwork,
          videoId,
          albumId: undefined,  // Enriched by main process
          artistId: undefined  // Enriched by main process
        };
      } catch (e) {
        return null;
      }
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay(1)
  );
}
