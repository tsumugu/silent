import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MusicDetail,
    MusicItem,
    isSongItem,
    isAlbumItem,
    MusicArtist
} from '../../../shared/types/music';
import { useTrackAssets } from '../../hooks/useTrackAssets';
import { getImageCacheKey } from '../../../shared/utils/imageKey';
import { useMusicStore } from '../../store/musicStore';
import { useTranslation } from '../../hooks/useTranslation';
import { usePlayerStore } from '../../store/playerStore';
import { useLikeStore } from '../../store/likeStore';
import { getShareUrl, getCollectionShareUrl } from '../../utils/share';

interface MusicDetailViewProps {
    id: string;
    type: 'ALBUM' | 'PLAYLIST';
    initialItem?: MusicItem;
    onBack: () => void;
    onPlaySong: (song: MusicItem) => void;
    onNavigateToArtist?: (artistId: string) => void;
}

export const MusicDetailView: React.FC<MusicDetailViewProps> = ({ id, type, initialItem, onBack, onPlaySong, onNavigateToArtist }) => {
    const { t } = useTranslation();
    const { playbackInfo } = usePlayerStore();
    const isGlobalLoading = playbackInfo?.playbackState === 'loading';
    const [data, setData] = useState<MusicDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEntering, setIsEntering] = useState(true);
    const [likeLoading, setLikeLoading] = useState<Record<string, boolean>>({});
    const [showCopied, setShowCopied] = useState<string | null>(null); // null, 'collection', or videoId
    const { setLikeStatus: setGlobalLikeStatus, getLikeStatus: getGlobalLikeStatus } = useLikeStore();

    // Get cache actions from store
    const {
        getAlbum,
        setAlbum,
        getPlaylist,
        setPlaylist
    } = useMusicStore();

    const thumbnails = data?.thumbnails || initialItem?.thumbnails || [];
    const rawCoverUrl = thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;

    const title = data?.title || initialItem?.title || '';

    // Determine the best artist name string
    const getArtistName = () => {
        if (data?.artists && data.artists.length > 0) {
            return data.artists.map((a: MusicArtist) => a.name).join(', ');
        }
        if (initialItem && (isSongItem(initialItem) || isAlbumItem(initialItem)) && initialItem.artists.length > 0) {
            return initialItem.artists.map((a: MusicArtist) => a.name).join(', ');
        }
        return '';
    };
    const artistName = getArtistName();

    // Generate stable cache key
    const cacheKey = getImageCacheKey(title, artistName, {
        browseId: id,
        playlistId: type === 'PLAYLIST' ? id : undefined
    });

    // Use assets from cache
    const { blobUrl: coverUrl } = useTrackAssets(rawCoverUrl, cacheKey);


    useEffect(() => {
        const fetchData = async () => {
            // Step 1: Try to get from cache (SWR pattern - return stale data immediately)
            const cached = type === 'ALBUM'
                ? getAlbum(id)
                : getPlaylist(id);

            if (cached) {
                setData(cached);
                setLoading(false);
                // Cache hit - data will be displayed immediately
            } else {
                // No cache - show loading state
                setLoading(true);
            }

            // Step 2: Set loading state in store
            const storeType = type === 'ALBUM' ? 'album' : 'playlist';
            useMusicStore.getState().setLoading(storeType, id, true);

            try {
                // Step 3: Always fetch latest data in background
                const result = type === 'ALBUM'
                    ? await window.electronAPI.getAlbumDetails(id)
                    : await window.electronAPI.getPlaylist(id);

                if (result) {
                    // Step 4: Update cache
                    if (type === 'ALBUM') {
                        setAlbum(id, result);
                    } else {
                        setPlaylist(id, result);
                    }

                    // Step 5: Update UI
                    setData(result);
                }
            } catch (error) {
                console.error(`[MusicDetailView] Failed to fetch ${type} details for ${id}:`, error);
            } finally {
                setLoading(false);
                useMusicStore.getState().setLoading(storeType, id, false);
            }
        };

        fetchData();
    }, [id, type, getAlbum, setAlbum, getPlaylist, setPlaylist]);

    // Handle like toggle for tracks
    const handleToggleLike = async (e: React.MouseEvent, song: MusicItem) => {
        e.stopPropagation();
        if (!isSongItem(song)) return;

        const videoId = song.youtube_video_id;
        if (likeLoading[videoId]) return;

        const currentStatus = getGlobalLikeStatus(videoId) || song.likeStatus || 'INDIFFERENT';
        const newStatus = currentStatus === 'LIKE' ? 'INDIFFERENT' : 'LIKE';

        // Optimistic update to global store
        setGlobalLikeStatus(videoId, newStatus);
        setLikeLoading(prev => ({ ...prev, [videoId]: true }));

        try {
            const success = await window.electronAPI.setLikeStatus(videoId, newStatus);
            if (!success) {
                // Rollback on failure
                setGlobalLikeStatus(videoId, currentStatus);
            }
        } catch (error) {
            console.error('[MusicDetailView] Failed to toggle like:', error);
            setGlobalLikeStatus(videoId, currentStatus);
        } finally {
            setLikeLoading(prev => ({ ...prev, [videoId]: false }));
        }
    };

    const handleShare = (e: React.MouseEvent, targetId: string, shareType: 'track' | 'collection') => {
        e.stopPropagation();
        const url = shareType === 'track'
            ? getShareUrl(targetId, id) // Use current album/playlist ID as context
            : getCollectionShareUrl(id, type);

        navigator.clipboard.writeText(url).then(() => {
            const feedbackId = shareType === 'collection' ? 'collection' : targetId;
            setShowCopied(feedbackId);
            setTimeout(() => setShowCopied(null), 1000);
        });
    };

    if (!data && !loading && !isEntering && !initialItem) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
                <p>{t.failed_load_type(type)}</p>
                <button
                    onClick={onBack}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white text-sm"
                >
                    {t.back_to_library}
                </button>
            </div>
        );
    }

    const tracks = data?.tracks || [];

    // Extract year from subtitle (e.g., "アルバム • 2024")
    const getYear = (subtitle?: string) => {
        if (!subtitle) return null;
        const match = subtitle.match(/\b(19|20)\d{2}\b/);
        return match ? match[0] : null;
    };
    const year = getYear(data?.subtitle || initialItem?.subtitle);

    // Extract the primary artist ID for fallback
    const primaryArtistId = data?.artists?.[0]?.id ||
        (initialItem && (isSongItem(initialItem) || isAlbumItem(initialItem)) ? initialItem.artists?.[0]?.id : undefined);

    return (
        <motion.div
            layoutId={`card-${type.toLowerCase()}-${id}`}
            onLayoutAnimationComplete={() => setIsEntering(false)}
            className="h-full overflow-y-auto scrollbar-hide"
        >
            {/* Header with Back Button (Fixed/Sticky) */}
            <div className="sticky top-0 z-20 px-8 pt-4 pb-4 bg-black/5 backdrop-blur-xl ring-1 ring-white/5">
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
                        <span className="text-sm font-medium">{t.back}</span>
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
                            <img src={coverUrl} alt={title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                <span className="text-white/10 text-6xl font-serif">♫</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Metadata */}
                    <div className="flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-white/30 text-[9px] uppercase tracking-[0.2em] font-bold ring-1 ring-white/10 px-2 py-0.5 rounded-sm">
                                {type === 'ALBUM' ? t.album_label : t.playlist_label}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
                            {title}
                        </h1>
                        <div className="flex items-center gap-3 text-white/60">
                            <div className="flex items-center gap-3 text-white/40 text-sm font-medium">
                                {year && (
                                    <>
                                        <span>{year}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/20" />
                                    </>
                                )}
                                <span>{t.songs_count(tracks.length || 0)}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-4 mt-8">
                            <button
                                onClick={() => {
                                    if (tracks.length > 0 && !isGlobalLoading) {
                                        const contextId = type === 'PLAYLIST' ? id : (data?.youtube_playlist_id || id);
                                        window.electronAPI.play(tracks[0], contextId, false);
                                    }
                                }}
                                disabled={tracks.length === 0 || isGlobalLoading}
                                className={`px-8 py-3 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-all active:scale-95 flex items-center gap-2 ${isGlobalLoading ? 'opacity-50' : ''}`}
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                                {t.play}
                            </button>
                            <button
                                onClick={() => {
                                    if ((data || initialItem) && !isGlobalLoading) {
                                        const contextId = type === 'PLAYLIST' ? id : (data?.youtube_playlist_id || id);
                                        window.electronAPI.play((data || initialItem!) as any, contextId, true);
                                    }
                                }}
                                disabled={tracks.length === 0 || isGlobalLoading}
                                className={`px-8 py-3 bg-white/10 text-white rounded-full font-bold text-sm hover:bg-white/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-2 ${isGlobalLoading ? 'opacity-50' : ''}`}
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                                </svg>
                                {t.shuffle_play}
                            </button>
                            <button
                                onClick={(e) => handleShare(e, id, 'collection')}
                                className={`w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all active:scale-95 relative ${isGlobalLoading ? 'opacity-50' : ''}`}
                                title={t.share}
                            >
                                <AnimatePresence mode="wait">
                                    {showCopied === 'collection' ? (
                                        <motion.svg
                                            key="check"
                                            initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                            exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2.5}
                                        >
                                            <motion.path
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 0.15, delay: 0.05, ease: 'easeOut' }}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M5 13l4 4L19 7"
                                            />
                                        </motion.svg>
                                    ) : (
                                        <motion.svg
                                            key="share"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            transition={{ duration: 0.15, ease: 'easeOut' }}
                                            className="w-5 h-5 transition-transform active:scale-90"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </motion.svg>
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-[3rem_1fr_5.5rem_3.5rem_3.5rem] gap-4 px-3 py-3 border-b border-white/5 text-white/30 text-[10px] uppercase tracking-widest font-bold mb-2">
                    <div className="text-center">#</div>
                    <div>{t.title_label}</div>
                    <div className="text-right">{t.time_label}</div>
                    <div className="text-center"></div>
                    <div className="text-center"></div>
                </div>

                {/* Song List or Loader */}
                <div className="flex flex-col">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-white/20 gap-4">
                            <div className="w-6 h-6 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
                            <span className="text-xs font-medium uppercase tracking-widest">{t.loading_tracks}</span>
                        </div>
                    ) : (
                        tracks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-white/20">
                                <span className="text-xs font-medium uppercase tracking-widest">{t.no_tracks}</span>
                            </div>
                        ) : (
                            tracks.map((song, index) => {
                                const songTitle = song.title;

                                const videoId = isSongItem(song) ? song.youtube_video_id : `item-${index}`;
                                return (
                                    <motion.div
                                        key={videoId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`group grid grid-cols-[3rem_1fr_5.5rem_3.5rem_3.5rem] gap-4 items-center p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all active:scale-[0.995] ${isGlobalLoading ? 'opacity-40 blur-[0.5px] pointer-events-none' : ''}`}
                                        onClick={() => {
                                            if (!isGlobalLoading) onPlaySong(song);
                                        }}
                                    >
                                        <div className="text-center text-white/30 font-medium group-hover:text-white/60 transition-colors">
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-white font-medium truncate mb-0.5 group-hover:text-white">
                                                {songTitle}
                                            </div>
                                            <div className="text-white/40 text-xs truncate group-hover:text-white/60">
                                                {(isSongItem(song) || isAlbumItem(song)) ? song.artists.map((a: MusicArtist, i: number, arr: MusicArtist[]) => {
                                                    const artistId = a.id || primaryArtistId;
                                                    return (
                                                        <span key={i}>
                                                            <span
                                                                className={artistId ? 'hover:underline cursor-pointer' : ''}
                                                                onClick={(e) => {
                                                                    if (artistId) {
                                                                        e.stopPropagation();
                                                                        onNavigateToArtist?.(artistId);
                                                                    }
                                                                }}
                                                            >
                                                                {a.name}
                                                            </span>
                                                            {i < arr.length - 1 && ', '}
                                                        </span>
                                                    );
                                                }) : artistName}
                                            </div>
                                        </div>

                                        <div className="text-right text-white/30 text-xs font-mono group-hover:text-white/60">
                                            {isSongItem(song) ? (song.duration?.text || '--:--') : '--:--'}
                                        </div>

                                        {/* Like Button */}
                                        <div className="flex justify-end">
                                            {isSongItem(song) && (
                                                <button
                                                    onClick={(e) => handleToggleLike(e, song)}
                                                    disabled={likeLoading[videoId]}
                                                    className={`p-2 rounded-full hover:bg-white/10 transition-all ${((getGlobalLikeStatus(videoId) || song.likeStatus) === 'LIKE') ? 'text-white' : 'text-white/30 group-hover:text-white/60 hover:!text-white'}`}
                                                >
                                                    {likeLoading[videoId] ? (
                                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <svg className="w-4 h-4" fill={(getGlobalLikeStatus(videoId) || song.likeStatus) === 'LIKE' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                                                        </svg>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Share Button */}
                                        <div className="flex justify-end relative">
                                            {isSongItem(song) && (
                                                <button
                                                    onClick={(e) => handleShare(e, song.youtube_video_id, 'track')}
                                                    className="p-2 rounded-full text-white/30 group-hover:text-white/60 hover:!text-white hover:bg-white/10 transition-all flex items-center justify-center min-w-[36px] min-h-[36px]"
                                                    title={t.share}
                                                >
                                                    <AnimatePresence mode="wait">
                                                        {showCopied === song.youtube_video_id ? (
                                                            <motion.svg
                                                                key="check"
                                                                initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                                                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                                exit={{ scale: 0.5, opacity: 0, rotate: 45 }}
                                                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                                                className="w-4 h-4 text-white"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth={2.5}
                                                            >
                                                                <motion.path
                                                                    initial={{ pathLength: 0 }}
                                                                    animate={{ pathLength: 1 }}
                                                                    transition={{ duration: 0.15, delay: 0.05, ease: 'easeOut' }}
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </motion.svg>
                                                        ) : (
                                                            <motion.svg
                                                                key="share"
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                exit={{ scale: 0.8, opacity: 0 }}
                                                                transition={{ duration: 0.15, ease: 'easeOut' }}
                                                                className="w-4 h-4"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                                strokeWidth={2}
                                                            >
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                            </motion.svg>
                                                        )}
                                                    </AnimatePresence>
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )
                    )}
                </div>
            </div>
        </motion.div>
    );
};
