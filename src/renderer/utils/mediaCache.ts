import { EventEmitter } from 'events';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - node-vibrant/browser has complex export structures that TS doesn't catch easily
import * as Vibrant from 'node-vibrant/browser';

export interface MediaCacheItem {
    colors?: {
        primary: string;
        secondary: string;
    };
    artworkUrl?: string;
    blobUrl?: string;
    fetchPromise?: Promise<void>;
}

class MediaCache extends EventEmitter {
    private cache = new Map<string, MediaCacheItem>();

    constructor() {
        super();
    }

    get(id: string): MediaCacheItem | undefined {
        return this.cache.get(id);
    }

    set(id: string, item: Partial<MediaCacheItem>) {
        const existing = this.cache.get(id) || {};
        this.cache.set(id, { ...existing, ...item });
        this.emit('update', { id, item });
    }

    has(id: string): boolean {
        return this.cache.has(id);
    }

    getColors(id: string) {
        return this.cache.get(id)?.colors;
    }

    setColors(id: string, primary: string, secondary: string) {
        this.set(id, { colors: { primary, secondary } });
    }

    getArtworkUrl(id: string) {
        return this.cache.get(id)?.artworkUrl;
    }

    setArtworkUrl(id: string, url: string) {
        this.set(id, { artworkUrl: url });
    }

    getBlobUrl(id: string) {
        return this.cache.get(id)?.blobUrl;
    }

    setBlobUrl(id: string, blobUrl: string) {
        this.set(id, { blobUrl });
    }

    /**
     * Ensure both image (blob) and colors are available for a track
     */
    async ensureTrackAssets(id: string, sourceUrl: string): Promise<void> {
        console.log('[MediaCache] ensureTrackAssets', { id, sourceUrl });

        // If everything already cached, return
        const item = this.get(id);
        if (item?.blobUrl && item?.colors) {
            return;
        }

        // Check if a fetch is already in progress
        if (item?.fetchPromise) {
            console.log('[MediaCache] Fetch/Analysis already in progress, waiting...');
            return item.fetchPromise;
        }

        // Start the pipeline
        const fetchPromise = (async () => {
            try {
                // 1. Fetch image if no blob
                let currentUrl = item?.blobUrl;
                if (!currentUrl) {
                    console.log('[MediaCache] Processing source URL:', sourceUrl);

                    // Upgrade to highest quality by modifying URL parameters (Google User Content)
                    let processedUrl = sourceUrl;
                    if (processedUrl.includes('googleusercontent.com')) {
                        processedUrl = processedUrl.replace(/=w\d+-h\d+/, '=w1200-h1200');
                        processedUrl = processedUrl.replace(/=s\d+/, '=s1200');
                    }

                    console.log('[MediaCache] Fetching image via proxy:', processedUrl);
                    const dataUrl = await window.electronAPI.proxyFetchImage(processedUrl);
                    const response = await fetch(dataUrl);
                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);

                    this.setBlobUrl(id, blobUrl);
                    currentUrl = blobUrl;
                }

                // 2. Extract colors if not present
                if (!item?.colors && currentUrl) {
                    console.log('[MediaCache] Extracting colors...');
                    const VibrantConstructor = (Vibrant as any).Vibrant || Vibrant;
                    const v = new (VibrantConstructor as any)(currentUrl);
                    const palette = await v.getPalette();

                    const primary = palette.Vibrant?.hex || '#1a1a1a';
                    const secondary = palette.DarkVibrant?.hex || '#2a2a2a';

                    this.setColors(id, primary, secondary);
                }

                console.log('[MediaCache] Track assets ready:', id);
            } catch (err) {
                console.error('[MediaCache] Failed to ensure track assets:', err);
                throw err;
            } finally {
                // Clear promise when done
                const current = this.cache.get(id);
                if (current) {
                    delete current.fetchPromise;
                }
            }
        })();

        this.set(id, { fetchPromise });
        return fetchPromise;
    }
}

export const mediaCache = new MediaCache();
