import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import { useTrackAssets } from '../../hooks/useTrackAssets';

interface MiniPlayerProps {
    onClick: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onClick }) => {
    const { playbackInfo, isPlaying } = usePlayerStore();

    // Hooks should be called unconditionally
    const metadata = playbackInfo?.metadata;
    const title = metadata?.title || 'Unknown Title';
    const artist = metadata?.artist || 'Unknown Artist';
    const artwork = metadata?.artwork?.[0]?.src || null;
    const videoId = metadata?.videoId;

    const { colors } = useTrackAssets(artwork, videoId);

    if (!playbackInfo) return null;

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) {
            window.electronAPI.playbackPause();
        } else {
            window.electronAPI.playbackPlay();
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.electronAPI.playbackNext();
    };

    return (
        <motion.div
            layoutId="player-shell"
            onClick={onClick}
            className="absolute bottom-4 left-4 right-4 h-16 bg-white/5 backdrop-blur-[80px] backdrop-saturate-150 rounded-xl flex items-center px-4 cursor-pointer z-40 shadow-xl overflow-hidden group"
            style={{
                background: `linear-gradient(135deg, ${colors.primary}cc 0%, ${colors.secondary}cc 100%)`
            }}
        >
            {/* Hover overlay for better interaction feedback */}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" />

            {/* Artwork */}
            <motion.div
                layoutId="player-artwork"
                className={`w-10 h-10 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0 relative z-10 ${isPlaying ? 'animate-pulse-slow' : ''}`}
            >
                {artwork ? (
                    <img src={artwork} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-white/30">♪</span>
                    </div>
                )}
            </motion.div>

            {/* Info */}
            <div className="flex-1 mx-4 min-w-0 flex flex-col justify-center relative z-10">
                <h4 className="text-white text-sm font-medium truncate shadow-black drop-shadow-md">{title}</h4>
                <p className="text-white/80 text-xs truncate drop-shadow-sm">{artist}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 relative z-10">
                <button
                    onClick={handlePlayPause}
                    className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center transition-colors backdrop-blur-sm"
                >
                    {isPlaying ? (
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
                    className="w-8 h-8 rounded-full hover:bg-black/20 flex items-center justify-center transition-colors text-white/90 hover:text-white backdrop-blur-sm"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                </button>
            </div>
        </motion.div>
    );
};
