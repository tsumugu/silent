import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MusicDetail, MusicItem } from '../../../shared/types/music';

interface MusicDetailViewProps {
    id: string;
    type: 'ALBUM' | 'PLAYLIST';
    initialItem?: MusicItem;
    onBack: () => void;
    onPlaySong: (song: MusicItem) => void;
}

export const MusicDetailView: React.FC<MusicDetailViewProps> = ({ id, type, initialItem, onBack, onPlaySong }) => {
    const [data, setData] = useState<MusicDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEntering, setIsEntering] = useState(true);

    useEffect(() => {
        console.log(`[MusicDetailView] Received initialItem for ${id}:`, initialItem);
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = type === 'ALBUM'
                    ? await window.electronAPI.getAlbumDetails(id)
                    : await window.electronAPI.getPlaylist(id);

                console.log(`[MusicDetailView] Fetched data for ${id}:`, result);
                setData(result);
            } catch (error) {
                console.error(`[MusicDetailView] Failed to fetch ${type} details:`, error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, type]);

    if (!data && !loading && !isEntering && !initialItem) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
                <p>Failed to load {type.toLowerCase()}</p>
                <button
                    onClick={onBack}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white text-sm"
                >
                    Back to Library
                </button>
            </div>
        );
    }

    const thumbnails = data?.thumbnails || initialItem?.thumbnails || [];
    const coverUrl = thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
    const title = data?.title || initialItem?.title || '';

    // Determine the best artist name string
    const getArtistName = () => {
        if (data?.artists && data.artists.length > 0) {
            return data.artists.map(a => a.name).join(', ');
        }
        if (initialItem?.artists && initialItem.artists.length > 0) {
            return initialItem.artists.map(a => a.name).join(', ');
        }
        return '';
    };
    const artistName = getArtistName();
    const tracks = data?.tracks || [];

    return (
        <motion.div
            layoutId={`card-${type.toLowerCase()}-${id}`}
            onLayoutAnimationComplete={() => setIsEntering(false)}
            className="h-full overflow-y-auto scrollbar-hide"
        >
            {/* Sticky Header with Back Button */}
            <div className="sticky top-0 z-30 px-8 py-4 pointer-events-none">
                <div className="flex items-center">
                    <button
                        onClick={onBack}
                        className="pointer-events-auto flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                        <span className="text-sm font-medium">Back</span>
                    </button>
                </div>
            </div>

            <div className="p-8 pt-6 pb-32">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-8 mb-10">
                    {/* Cover Art */}
                    <motion.div
                        layoutId={`art-${type.toLowerCase()}-${id}`}
                        className="w-48 h-48 md:w-64 md:h-64 shrink-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-white/5"
                    >
                        {coverUrl ? (
                            <img src={coverUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                <span className="text-white/10 text-6xl font-serif">♫</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Metadata */}
                    <div className="flex flex-col justify-end">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-white/30 text-[9px] uppercase tracking-[0.2em] font-bold ring-1 ring-white/10 px-2 py-0.5 rounded-sm">
                                {type}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
                            {title}
                        </h1>
                        <div className="flex items-center gap-3 text-white/60">
                            {data?.subtitle ? (
                                <span className="font-semibold text-white/90">{data.subtitle}</span>
                            ) : (
                                type !== 'PLAYLIST' && artistName && (
                                    <span className="font-semibold text-white/90">{artistName}</span>
                                )
                            )}
                            {(data?.subtitle || (type !== 'PLAYLIST' && artistName)) && (
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                            )}
                            <span className="text-sm">{tracks.length} songs</span>
                        </div>
                    </div>
                </div>

                {/* Song List Header */}
                <div className="grid grid-cols-[3rem_1fr_4rem] gap-4 px-4 py-3 border-b border-white/5 text-white/30 text-[10px] uppercase tracking-widest font-bold mb-2">
                    <div className="text-center">#</div>
                    <div>Title</div>
                    <div className="text-right">Time</div>
                </div>

                {/* Song List or Loader */}
                <div className="flex flex-col">
                    {(loading || isEntering) ? (
                        <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-4">
                            {!isEntering && (
                                <>
                                    <div className="w-6 h-6 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
                                    <span className="text-xs font-medium uppercase tracking-widest">Loading tracks...</span>
                                </>
                            )}
                        </div>
                    ) : (
                        tracks.map((song, index) => {
                            const songTitle = song.title;
                            const songArtist = song.artists
                                .map(a => a.name)
                                .filter(name => name && name.trim().length > 0)
                                .join(', ') || artistName || 'Unknown Artist';

                            return (
                                <motion.div
                                    key={`${song.youtube_video_id || index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="group grid grid-cols-[3rem_1fr_4rem] gap-4 items-center p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all active:scale-[0.995]"
                                    onClick={() => onPlaySong(song)}
                                >
                                    <div className="text-center text-white/30 font-medium group-hover:text-white/60 transition-colors">
                                        {index + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-white font-medium truncate mb-0.5 group-hover:text-white">
                                            {songTitle}
                                        </div>
                                        <div className="text-white/40 text-xs truncate group-hover:text-white/60">
                                            {songArtist}
                                        </div>
                                    </div>
                                    <div className="text-right text-white/30 text-xs font-mono group-hover:text-white/60">
                                        {song.duration?.text || '--:--'}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>
        </motion.div>
    );
};
