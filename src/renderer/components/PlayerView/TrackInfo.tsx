import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackInfoProps {
  title?: string;
  artist?: string;
  isVisible: boolean;
  isMini?: boolean;
  onClose?: () => void;
}

export function TrackInfo({ title, artist, isVisible, isMini, onClose }: TrackInfoProps) {
  if (!title) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="w-full px-12 flex flex-col items-center overflow-hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Integrated Close Button (Above Title) */}
          {onClose && (
            <motion.button
              whileHover={{ scale: 1.1, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="mb-4 text-white/40 hover:text-white transition-colors"
              title="Close Player (Esc)"
            >
              <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.button>
          )}

          {/* Title Row */}
          <div className="w-full flex items-center justify-center relative">
            <motion.h1
              layoutId="player-title"
              className="text-white font-bold drop-shadow-lg truncate max-w-[90%]"
              style={{ fontSize: isMini ? 'clamp(1.25rem, 4vw, 1.75rem)' : 'clamp(2rem, 5vw, 3rem)' }}
            >
              {title}
            </motion.h1>
          </div>

          {artist && (
            <motion.p
              layoutId="player-artist"
              className="text-white/80 mt-2 drop-shadow-md w-full truncate text-center"
              style={{ fontSize: isMini ? 'clamp(0.875rem, 3vw, 1.125rem)' : 'clamp(1.25rem, 4vw, 1.75rem)' }}
            >
              {artist}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
