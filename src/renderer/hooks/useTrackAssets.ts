import { useState, useEffect } from 'react';
import { mediaCache } from '../utils/mediaCache';

interface TrackAssets {
    blobUrl: string | null;
    colors: {
        primary: string;
        secondary: string;
        tertiary: string;
        quaternary: string;
    };
    isLoading: boolean;
}

const DEFAULT_COLORS = {
    primary: '#1a1a1a',
    secondary: '#2a2a2a',
    tertiary: '#3a3a3a',
    quaternary: '#1a1a1a',
};

export function useTrackAssets(rawImageUrl: string | null, id?: string | null): TrackAssets {
    const [assets, setAssets] = useState<TrackAssets>({
        blobUrl: null,
        colors: DEFAULT_COLORS,
        isLoading: false,
    });

    useEffect(() => {
        // If meta data flickers and we lose URL but still have ID, don't clear the blob immediately.
        // This prevents the "disappearing" effect during rapid state changes.
        if (!rawImageUrl && !id) {

            setAssets({
                blobUrl: null,
                colors: DEFAULT_COLORS,
                isLoading: false,
            });
            return;
        }

        const syncAssets = () => {
            const cached = id ? mediaCache.get(id) : null;

            // If we have cached data, use it. 
            // If we don't have cached data but we have a rawImageUrl, use that as fallback.
            // If both are missing, use the CURRENT state's blobUrl if the ID hasn't changed.
            const finalUrl = cached?.blobUrl || rawImageUrl || (id ? assets.blobUrl : null);
            const isFromCache = !!cached?.blobUrl;

            const newAssets = {
                blobUrl: finalUrl,
                colors: cached?.colors || DEFAULT_COLORS,
                isLoading: !!cached?.fetchPromise,
            };

            setAssets(newAssets);
        };

        syncAssets();

        if (!id) return;

        // Trigger asset ensuring (background fetch & analysis)
        if (rawImageUrl) {
            mediaCache.ensureTrackAssets(id, rawImageUrl).catch((err) => {
                console.error('[useTrackAssets:DUMP] ensureTrackAssets failed:', id, err);
            });
        }

        // Listen for updates
        const handleUpdate = (update: { id: string }) => {
            if (update.id === id) {
                syncAssets();
            }
        };

        mediaCache.on('update', handleUpdate);
        return () => {
            mediaCache.off('update', handleUpdate);
        };
    }, [rawImageUrl, id]);

    return assets;
}
