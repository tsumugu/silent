import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ControlBarProps {
  isPlaying: boolean;
  isVisible: boolean;
  isMini?: boolean;
}

export function ControlBar({ isPlaying, isVisible, isMini }: ControlBarProps) {
  const handlePrevious = () => {
    window.electronAPI.playbackPrevious();
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      window.electronAPI.playbackPause();
    } else {
      window.electronAPI.playbackPlay();
    }
  };

  const handleNext = () => {
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
          {/* Previous button */}
          <button
            onClick={handlePrevious}
            className={`${isMini ? 'w-10 h-10' : 'w-14 h-14'} rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110`}
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
            className={`${isMini ? 'w-14 h-14' : 'w-20 h-20'} rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {isPlaying ? (
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
            className={`${isMini ? 'w-10 h-10' : 'w-14 h-14'} rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-200 hover:scale-110`}
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
