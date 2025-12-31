import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrackInfoProps {
  title?: string;
  artist?: string;
  album?: string;
  onAlbumClick?: () => void;
  isVisible: boolean;
  isMini?: boolean;
}

export function TrackInfo({ title, artist, album, onAlbumClick, isVisible, isMini }: TrackInfoProps) {
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
          {/* Title Row */}
          <div className="w-full flex items-center justify-center relative">
            <motion.h1
              layoutId="player-title"
              className="text-white font-bold drop-shadow-lg truncate max-w-[90%] leading-tight"
              style={{ fontSize: isMini ? 'clamp(1rem, 3.5vh, 1.25rem)' : 'clamp(1.5rem, 4.5vh, 2.5rem)' }}
            >
              {title}
            </motion.h1>
          </div>

          <div className="flex flex-col items-center justify-center w-full gap-0.5">
            {artist && (
              <motion.p
                layoutId="player-artist"
                className={isMini ? 'text-white/80 mt-0.5 drop-shadow-md w-full truncate text-center leading-tight' : 'text-white/80 mt-1 drop-shadow-md w-full truncate text-center leading-tight'}
                style={{ fontSize: isMini ? 'clamp(0.75rem, 2.5vh, 0.875rem)' : 'clamp(0.875rem, 3vh, 1.5rem)' }}
              >
                {artist}
              </motion.p>
            )}

            {album && (
              <motion.button
                layoutId="player-album"
                onClick={(e) => {
                  e.stopPropagation();
                  onAlbumClick?.();
                }}
                className={isMini ? 'text-white/60 hover:text-white/90 drop-shadow-md truncate text-center leading-tight transition-colors cursor-pointer w-full' : 'text-white/60 hover:text-white/90 drop-shadow-md truncate text-center leading-tight transition-colors cursor-pointer w-full'}
                style={{
                  fontSize: isMini ? 'clamp(0.7rem, 2.2vh, 0.8rem)' : 'clamp(0.8rem, 2.7vh, 1.2rem)',
                  WebkitAppRegion: 'no-drag'
                } as React.CSSProperties}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {album}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
