import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackInfoProps {
  title?: string;
  artist?: string;
  isVisible: boolean;
  isMini?: boolean;
}

export function TrackInfo({ title, artist, isVisible, isMini }: TrackInfoProps) {
  if (!title) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="w-full text-center px-8 flex flex-col items-center overflow-hidden"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Use clamp for fluid font scaling: min-size, preferred-size (vw based), max-size */}
          <h1
            className="text-white font-bold drop-shadow-lg w-full truncate"
            style={{ fontSize: isMini ? 'clamp(1.25rem, 4vw, 1.75rem)' : 'clamp(2rem, 5vw, 3rem)' }}
          >
            {title}
          </h1>
          {artist && (
            <p
              className="text-white/80 mt-2 drop-shadow-md w-full truncate"
              style={{ fontSize: isMini ? 'clamp(0.875rem, 3vw, 1.125rem)' : 'clamp(1.25rem, 4vw, 1.75rem)' }}
            >
              {artist}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
