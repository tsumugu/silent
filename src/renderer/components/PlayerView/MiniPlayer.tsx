import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { usePlayerStore } from '../../store/playerStore';
import { useLikeStore } from '../../store/likeStore';
import { useTrackAssets } from '../../hooks/useTrackAssets';
import { useWindowDimensions } from '../../hooks/useWindowDimensions';
import { getImageCacheKey } from '../../../shared/utils/imageKey';
import { MusicItem } from '../../../shared/types/music';
import { getShareUrl } from '../../utils/share';

interface MiniPlayerProps {
    onClick: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onClick }) => {
    const { t } = useTranslation();
    const playbackInfo = usePlayerStore(state => state.playbackInfo);
    const { setLikeStatus: setGlobalLikeStatus } = useLikeStore();
    const [isLikeLoading, setIsLikeLoading] = React.useState(false);
    const [showCopied, setShowCopied] = React.useState(false);

    // Hooks should be called unconditionally
    const metadata = playbackInfo?.metadata;
    const title = metadata?.title || t.unknown_title;
    const artist = metadata?.artist || t.unknown_artist;
    const originalArtwork = metadata?.artwork?.[0]?.src || null;
    const videoId = metadata?.videoId;

    // Generate stable cache key
    const cacheKey = getImageCacheKey(title, artist, {
        videoId: videoId
    });

    // Use the integrated hook for high-quality blob URL and colors
    const { colors, blobUrl } = useTrackAssets(originalArtwork, cacheKey);

    const isLoading = playbackInfo?.playbackState === 'loading';
    const isPlaying = playbackInfo?.playbackState === 'playing';

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLoading) return;
        if (isPlaying) {
            window.electronAPI.playbackPause();
        } else {
            window.electronAPI.playbackPlay();
        }
    };

    const handlePrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLoading) return;
        window.electronAPI.playbackPrevious();
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLoading) return;
        window.electronAPI.playbackNext();
    };

    const handleToggleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoId || isLoading || isLikeLoading) return;

        const currentStatus = metadata?.likeStatus || 'INDIFFERENT';
        const nextStatus = currentStatus === 'LIKE' ? 'INDIFFERENT' : 'LIKE';

        // Optimistic update to global store
        setGlobalLikeStatus(videoId, nextStatus);
        setIsLikeLoading(true);

        try {
            const success = await window.electronAPI.setLikeStatus(videoId, nextStatus);
            if (!success) {
                // Rollback on failure
                setGlobalLikeStatus(videoId, currentStatus);
            }
        } catch (error) {
            console.error('[MiniPlayer] Failed to toggle like:', error);
            setGlobalLikeStatus(videoId, currentStatus);
        } finally {
            setIsLikeLoading(false);
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoId) return;
        const listId = metadata?.playlistId || metadata?.albumId;
        const url = getShareUrl(videoId, listId);

        navigator.clipboard.writeText(url).then(() => {
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 1000);
        });
    };

    return (
        <motion.div
            layoutId="player-shell"
            onClick={onClick}
            className="absolute bottom-4 left-4 right-4 h-16 bg-white/5 backdrop-blur-[80px] backdrop-saturate-150 rounded-xl flex items-center px-4 cursor-pointer z-40 shadow-xl overflow-hidden group"
            style={{
                background: `linear-gradient(135deg, ${colors.primary}cc 0%, ${colors.secondary}cc 50%, ${colors.tertiary}cc 100%)`
            }}
        >
            {/* Hover overlay for better interaction feedback */}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />

            {/* Artwork */}
            <motion.div
                layoutId="player-artwork"
                className={`w-10 h-10 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0 relative z-10 ${(isPlaying || isLoading) ? 'animate-pulse-slow' : ''}`}
            >
                {blobUrl ? (
                    <img src={blobUrl} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-white/30">♪</span>
                    </div>
                )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 mx-4 min-w-0 flex flex-col justify-center relative z-10">
                <motion.h4
                    layoutId="player-title"
                    className={`text-white text-sm font-medium truncate shadow-black drop-shadow-md ${isLoading ? 'opacity-70' : ''}`}
                >
                    {title}
                </motion.h4>
                <motion.p
                    layoutId="player-artist"
                    className={`text-white/80 text-xs truncate drop-shadow-sm ${isLoading ? 'opacity-50' : ''}`}
                >
                    {artist}
                </motion.p>
                {metadata?.album && (
                    <motion.p
                        layoutId="player-album"
                        className="text-white/60 text-[10px] truncate drop-shadow-sm mt-0.5"
                    >
                        {metadata.album}
                    </motion.p>
                )}
            </div>

            {/* Controls */}
            <motion.div
                layoutId="player-controls"
                className="flex items-center gap-1.5 sm:gap-3 relative z-10"
            >
                <button
                    onClick={handleToggleLike}
                    disabled={isLoading || !videoId || isLikeLoading}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${metadata?.likeStatus === 'LIKE' ? 'text-white' : 'text-white/70'} hover:enabled:bg-black/20 hover:text-white disabled:opacity-30 disabled:cursor-default`}
                    title={metadata?.likeStatus === 'LIKE' ? 'Unlike' : 'Like'}
                >
                    {isLikeLoading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <svg
                            className="w-4 h-4 transition-transform active:scale-90"
                            fill={metadata?.likeStatus === 'LIKE' ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={metadata?.likeStatus === 'LIKE' ? 0 : 2}
                        >
                            <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={handleShare}
                    disabled={isLoading || !videoId}
                    className="p-1.5 rounded-full flex items-center justify-center transition-all active:scale-95 min-w-[32px] min-h-[32px] text-white/70 hover:enabled:bg-black/20 hover:text-white disabled:opacity-30 disabled:cursor-default"
                    title={t.share}
                >
                    <AnimatePresence mode="wait">
                        {showCopied ? (
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

                <button
                    onClick={handlePrevious}
                    disabled={isLoading}
                    className="w-8 h-8 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors text-white/70 hover:text-white disabled:opacity-30"
                    title={t.previous}
                >
                    <svg className="w-5 h-5 transition-transform active:scale-90" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
                    </svg>
                </button>

                <button
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50"
                    title={isPlaying ? t.pause : t.play}
                >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : isPlaying ? (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>

                <button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="w-8 h-8 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors text-white/70 hover:text-white disabled:opacity-30"
                    title={t.next}
                >
                    <svg className="w-5 h-5 transition-transform active:scale-90" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                </button>
            </motion.div>
        </motion.div>
    );
};
