import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

interface ControlBarProps {
  isPlaying: boolean;
  isLoading?: boolean;
  isVisible: boolean;
  isMini?: boolean;
  isShuffle?: boolean;
  videoId?: string;
  likeStatus?: 'LIKE' | 'DISLIKE' | 'INDIFFERENT';
}

export function ControlBar({ isPlaying, isLoading, isVisible, isMini, isShuffle, videoId, likeStatus }: ControlBarProps) {
  const { t } = useTranslation();
  const [isLikeLoading, setIsLikeLoading] = React.useState(false);

  const handleShuffle = () => {
    if (isLoading) return;
    window.electronAPI.playbackShuffle();
  };

  const handlePrevious = () => {
    if (isLoading) return;
    window.electronAPI.playbackPrevious();
  };

  const handlePlayPause = () => {
    if (isLoading) return;
    if (isPlaying) {
      window.electronAPI.playbackPause();
    } else {
      window.electronAPI.playbackPlay();
    }
  };

  const handleToggleLike = async () => {
    if (!videoId || isLoading || isLikeLoading) return;
    setIsLikeLoading(true);
    try {
      const nextStatus = likeStatus === 'LIKE' ? 'INDIFFERENT' : 'LIKE';
      await window.electronAPI.setLikeStatus(videoId, nextStatus);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleNext = () => {
    if (isLoading) return;
    window.electronAPI.playbackNext();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          layoutId="player-controls"
          className="w-full flex items-center justify-center gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Like button */}
          {!isMini && (
            <button
              onClick={handleToggleLike}
              disabled={isLoading || !videoId || isLikeLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isLoading || !videoId || isLikeLoading ? 'opacity-30' : 'hover:scale-110'} ${likeStatus === 'LIKE' ? 'text-white bg-white/20' : 'text-white/40 hover:text-white/60'}`}
              title={likeStatus === 'LIKE' ? 'Unlike' : 'Like'}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              {isLikeLoading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-5 h-5 transition-transform active:scale-90"
                  fill={likeStatus === 'LIKE' ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={likeStatus === 'LIKE' ? 0 : 2}
                >
                  <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
              )}
            </button>
          )}

          {/* Shuffle button */}
          {!isMini && (
            <button
              onClick={handleShuffle}
              disabled={isLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${isLoading ? 'opacity-30' : 'hover:scale-110'} ${isShuffle ? 'bg-white/30 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              title={t.shuffle}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
              </svg>
            </button>
          )}

          {/* Previous button */}
          <button
            onClick={handlePrevious}
            disabled={isLoading}
            className={`${isMini ? 'w-10 h-10' : 'w-14 h-14'} rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 ${isLoading ? 'opacity-30' : 'hover:scale-110'}`}
            title={t.previous}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <svg
              className={`${isMini ? 'w-4 h-4' : 'w-6 h-6'} text-white`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className={`${isMini ? 'w-14 h-14' : 'w-20 h-20'} rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all duration-200 ${isLoading ? 'opacity-50' : 'hover:scale-110'}`}
            title={isPlaying ? t.pause : t.play}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isLoading ? (
              <div className={`${isMini ? 'w-6 h-6' : 'w-8 h-8'} border-2 border-white/20 border-t-white rounded-full animate-spin`} />
            ) : isPlaying ? (
              <svg
                className={`${isMini ? 'w-6 h-6' : 'w-8 h-8'} text-white`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                className={`${isMini ? 'w-6 h-6' : 'w-8 h-8'} text-white ml-1`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={isLoading}
            className={`${isMini ? 'w-10 h-10' : 'w-14 h-14'} rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 ${isLoading ? 'opacity-30' : 'hover:scale-110'}`}
            title={t.next}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <svg
              className={`${isMini ? 'w-4 h-4' : 'w-6 h-6'} text-white`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
