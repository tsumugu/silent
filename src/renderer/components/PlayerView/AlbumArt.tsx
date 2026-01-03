import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlbumArtProps {
  src: string | null;
  isHovered: boolean;
  isMini?: boolean;
}

export const AlbumArt = React.memo(({ src, isHovered, isMini }: AlbumArtProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset loading state when src changes
  // EXCEPT if the new src is already a Data URL (likely from cache), 
  // we can assume it's "ready" to avoid a flicker.
  useEffect(() => {
    if (src?.startsWith('data:')) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [src]);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-4">
      {/* Aspect Ratio Container - Ensures stable size */}
      <div className="aspect-square w-full max-w-full max-h-full flex items-center justify-center relative">
        <AnimatePresence mode="wait">
          {!src || !isLoaded ? (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/5 rounded-3xl flex items-center justify-center backdrop-blur-sm shadow-inner"
            >
              <div className="text-white/10 text-6xl animate-pulse">
                ♪
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {src && (
          <motion.img
            src={src}
            alt="Album artwork"
            onLoad={() => setIsLoaded(true)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: isLoaded ? 1 : 0,
              scale: isLoaded ? (isHovered ? 0.95 : 1) : 0.9,
            }}
            transition={{
              duration: 0.4,
              ease: 'easeOut',
            }}
            className="aspect-square h-full rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-gray-900 object-contain"
            onError={() => {
              console.warn('[AlbumArt] Image failed to load:', src);
            }}
          />
        )}
      </div>
    </div>
  );
});
