import React from 'react';
import { motion } from 'framer-motion';

interface AlbumArtProps {
  src: string | null;
  isHovered: boolean;
  isMini?: boolean;
}

export function AlbumArt({ src, isHovered, isMini }: AlbumArtProps) {
  // Fluid layout using flexbox
  if (!src) {
    return (
      <div className="aspect-square w-full max-w-[320px] bg-gray-800/30 rounded-3xl flex items-center justify-center backdrop-blur-sm shadow-inner mx-auto">
        <div className="text-white/20 text-6xl animate-pulse">
          ♪
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="w-full h-full flex items-center justify-center p-4"
      animate={{
        scale: isHovered ? 0.95 : 1,
      }}
      transition={{
        duration: 0.3,
        ease: 'easeOut',
      }}
    >
      <img
        src={src}
        alt="Album artwork"
        key={src}
        className={`max-h-full max-w-full aspect-square rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-contain bg-gray-900`}
        onError={() => {
          console.warn('[AlbumArt] Image failed to load:', src);
        }}
      />
    </motion.div>
  );
}
