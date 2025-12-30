import React from 'react';
import { motion } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';

interface MiniPlayerProps {
    onOpenPlayer: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onOpenPlayer }) => {
    const { playbackInfo, isPlaying } = usePlayerStore();

    if (!playbackInfo) return null;

    const { metadata } = playbackInfo;
    const title = metadata?.title || 'Unknown Title';
    const artist = metadata?.artist || 'Unknown Artist';
    const artwork = metadata?.artwork?.[0]?.src;

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
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={onOpenPlayer}
            className="absolute bottom-4 left-4 right-4 h-16 bg-white/10 backdrop-blur-xl rounded-xl border border-white/10 flex items-center px-4 cursor-pointer hover:bg-white/15 transition-colors z-40 shadow-xl"
        >
            {/* Artwork */}
            <div className={`w-10 h-10 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0 ${isPlaying ? 'animate-pulse-slow' : ''}`}>
                {artwork ? (
                    <img src={artwork} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-white/30">♪</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 mx-4 min-w-0 flex flex-col justify-center">
                <h4 className="text-white text-sm font-medium truncate">{title}</h4>
                <p className="text-white/60 text-xs truncate">{artist}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
                <button
                    onClick={handlePlayPause}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
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
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white/80 hover:text-white"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                </button>
            </div>
        </motion.div>
    );
};
