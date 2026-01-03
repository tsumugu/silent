import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MusicDetail, MusicItem } from '../../../shared/types/music';
import { useTrackAssets } from '../../hooks/useTrackAssets';
import { getImageCacheKey } from '../../../shared/utils/imageKey';
import { useMusicStore } from '../../store/musicStore';
import { useTranslation } from '../../hooks/useTranslation';

interface ArtistDetailViewProps {
    id: string;
    initialItem?: MusicItem;
    onBack: () => void;
    onPlaySong: (song: MusicItem) => void;
    onNavigateToItem: (item: MusicItem) => void;
}

export const ArtistDetailView: React.FC<ArtistDetailViewProps> = ({
    id,
    initialItem,
    onBack,
    onPlaySong,
    onNavigateToItem
}) => {
    const { t } = useTranslation();
    const [data, setData] = useState<MusicDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Get cache actions from store
    const { getArtist, setArtist } = useMusicStore();

    const title = data?.title || initialItem?.title || '';
    const thumbnails = data?.thumbnails || initialItem?.thumbnails || [];
    const rawCoverUrl = thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;

    const cacheKey = getImageCacheKey(title, 'Artist', { browseId: id });
    const { blobUrl: coverUrl } = useTrackAssets(rawCoverUrl, cacheKey);

    useEffect(() => {
        const fetchArtist = async () => {
            // Step 1: Try to get from cache (SWR pattern - return stale data immediately)
            const cached = getArtist(id);

            if (cached) {
                setData(cached);
                setLoading(false);
                // Cache hit - data will be displayed immediately
            } else {
                // No cache - show loading state
                setLoading(true);
            }

            // Step 2: Set loading state in store
            useMusicStore.getState().setLoading('artist', id, true);

            try {
                // Step 3: Always fetch latest data in background
                const result = await window.electronAPI.getArtistDetails(id);

                if (result) {
                    // Step 4: Update cache
                    setArtist(id, result);

                    // Step 5: Update UI
                    setData(result);
                }
            } catch (error) {
                console.error('[ArtistDetailView] Failed to fetch artist details:', error);
            } finally {
                setLoading(false);
                useMusicStore.getState().setLoading('artist', id, false);
            }
        };

        fetchArtist();
    }, [id, getArtist, setArtist]);

    return (
        <div className="h-full overflow-y-auto scrollbar-hide">
            <div className="sticky top-0 z-20 px-8 pt-4 pb-4 bg-black/5 backdrop-blur-xl ring-1 ring-white/5">
                <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <span className="text-sm font-medium">{t.back}</span>
                </button>
            </div>

            <div className="p-8 pb-32">
                <div className="flex flex-col md:flex-row gap-8 mb-12 items-center">
                    <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 rounded-full overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white/5">
                        {coverUrl ? (
                            <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                <span className="text-white/10 text-6xl font-serif">👤</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-white/30 text-[9px] uppercase tracking-[0.2em] font-bold ring-1 ring-white/10 px-2 py-0.5 rounded-sm">
                                {t.artist_label}
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tight">{title}</h1>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-4">
                        <div className="w-6 h-6 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-12">
                        {data?.sections?.map((section, sIndex) => (
                            <div key={sIndex} className="space-y-6">
                                <h2 className="text-xl font-bold text-white/90 px-2">{section.title}</h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                                    {section.items.map((item, iIndex) => (
                                        <div
                                            key={iIndex}
                                            className="group cursor-pointer space-y-3"
                                            onClick={() => {
                                                if (item.type === 'SONG') onPlaySong(item);
                                                else onNavigateToItem(item);
                                            }}
                                        >
                                            <div className={`aspect-square overflow-hidden shadow-lg bg-white/5 group-hover:scale-105 transition-transform duration-500 ${item.type === 'ARTIST' ? 'rounded-full' : 'rounded-xl'}`}>
                                                <img
                                                    src={item.thumbnails[item.thumbnails.length - 1]?.url}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="px-1">
                                                <p className="text-white font-medium text-sm truncate group-hover:text-white transition-colors">{item.title}</p>
                                                <p className="text-white/40 text-xs truncate">{item.subtitle || item.type}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
