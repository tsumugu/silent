import { useState, useEffect } from 'react';
import { mediaCache } from '../utils/mediaCache';

interface TrackAssets {
    blobUrl: string | null;
    colors: {
        primary: string;
        secondary: string;
    };
    isLoading: boolean;
}

const DEFAULT_COLORS = {
    primary: '#1a1a1a',
    secondary: '#2a2a2a',
};

export function useTrackAssets(imageUrl: string | null, id?: string | null): TrackAssets {
    const [assets, setAssets] = useState<TrackAssets>({
        blobUrl: null,
        colors: DEFAULT_COLORS,
        isLoading: false,
    });

    useEffect(() => {
        if (!imageUrl) {
            setAssets({
                blobUrl: null,
                colors: DEFAULT_COLORS,
                isLoading: false,
            });
            return;
        }

        // Initial check
        const syncAssets = () => {
            const cached = id ? mediaCache.get(id) : null;
            setAssets({
                blobUrl: cached?.blobUrl || imageUrl,
                colors: cached?.colors || DEFAULT_COLORS,
                isLoading: !!cached?.fetchPromise,
            });
        };

        syncAssets();

        if (!id) return;

        // Trigger asset ensuring (background fetch & analysis)
        mediaCache.ensureTrackAssets(id, imageUrl).catch(() => {
            // Error handled inside mediaCache
        });

        // Listen for updates
        const handleUpdate = (update: { id: string }) => {
            if (update.id === id) {
                console.log('[useTrackAssets] Received update for:', id);
                syncAssets();
            }
        };

        console.log('[useTrackAssets] Effect triggered for id:', id, 'imageUrl:', imageUrl);
        mediaCache.on('update', handleUpdate);
        return () => {
            console.log('[useTrackAssets] Cleanup for id:', id);
            mediaCache.off('update', handleUpdate);
        };
    }, [imageUrl, id]);

    return assets;
}
