import { EventEmitter } from 'events';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - node-vibrant/browser has complex export structures that TS doesn't catch easily
import * as Vibrant from 'node-vibrant/browser';

export interface MediaCacheItem {
    colors?: {
        primary: string;
        secondary: string;
        tertiary: string;
        quaternary: string;
    };
    artworkUrl?: string;
    blobUrl?: string;
    fetchPromise?: Promise<void>;
}

class MediaCache extends EventEmitter {
    private cache = new Map<string, MediaCacheItem>();

    constructor() {
        super();
        this.setMaxListeners(100); // Support many library cards
    }

    get(id: string): MediaCacheItem | undefined {
        return this.cache.get(id);
    }

    set(id: string, item: Partial<MediaCacheItem>) {
        const existing = this.cache.get(id) || {};
        const updated = { ...existing, ...item };
        this.cache.set(id, updated);

        if (item.blobUrl) {

        }

        this.emit('update', { id, item });
    }

    has(id: string): boolean {
        return this.cache.has(id);
    }

    getColors(id: string) {
        return this.cache.get(id)?.colors;
    }

    setColors(id: string, primary: string, secondary: string, tertiary: string, quaternary: string) {
        this.set(id, { colors: { primary, secondary, tertiary, quaternary } });
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


        // If everything already cached, return
        const item = this.get(id);
        if (item?.blobUrl && item?.colors) {

            return;
        }

        // Check if a fetch is already in progress
        if (item?.fetchPromise) {

            return item.fetchPromise;
        }

        // Start the pipeline
        const fetchPromise = (async () => {
            try {
                // 1. Fetch image if no blob
                let currentUrl = item?.blobUrl;
                if (!currentUrl) {


                    // Upgrade to highest quality by modifying URL parameters (Google User Content)
                    let processedUrl = sourceUrl;
                    if (processedUrl.includes('googleusercontent.com')) {
                        processedUrl = processedUrl.replace(/=w\d+-h\d+/, '=w1200-h1200');
                        processedUrl = processedUrl.replace(/=s\d+/, '=s1200');
                    }


                    // Use Data URL directly - saves memory and avoids Object URL leaks
                    const dataUrl = await window.electronAPI.proxyFetchImage(processedUrl);


                    this.setBlobUrl(id, dataUrl);
                    currentUrl = dataUrl;
                }

                // 2. Extract colors if not present
                // IMPORTANT: Fetch the FRESH item state to avoid stale closure if setBlobUrl was just called
                const freshItem = this.get(id);
                if (!freshItem?.colors && currentUrl) {

                    const VibrantConstructor = (Vibrant as any).Vibrant || Vibrant;
                    const v = new (VibrantConstructor as any)(currentUrl);
                    const palette = await v.getPalette();

                    const primary = palette.Vibrant?.hex || palette.LightVibrant?.hex || '#ffffff';
                    const secondary = palette.DarkVibrant?.hex || palette.Muted?.hex || palette.DarkMuted?.hex || '#1a1a1a';
                    const tertiary = palette.Muted?.hex || palette.DarkMuted?.hex || secondary;
                    const quaternary = palette.LightVibrant?.hex || palette.LightMuted?.hex || primary;

                    this.setColors(id, primary, secondary, tertiary, quaternary);
                }


            } catch (err) {
                console.error('[MediaCache] Failed to ensure track assets for:', id, err);
                throw err;
            } finally {
                // Clear promise when done and EMIT update

                this.set(id, { fetchPromise: undefined });
            }
        })();

        this.set(id, { fetchPromise });
        return fetchPromise;
    }
}

export const mediaCache = new MediaCache();
