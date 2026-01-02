import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MusicArtist } from '../../../shared/types/music';

interface TrackInfoProps {
  title?: string;
  artist?: string;
  artists?: MusicArtist[];
  album?: string;
  onAlbumClick?: () => void;
  onArtistClick?: (artist: MusicArtist) => void;
  isVisible: boolean;
  isMini?: boolean;
}

export function TrackInfo({ title, artist, artists, album, onAlbumClick, onArtistClick, isVisible, isMini }: TrackInfoProps) {
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
              className="text-white font-bold drop-shadow-lg truncate max-w-[90%] leading-tight text-center"
              style={{ fontSize: isMini ? 'clamp(1rem, 3.5vh, 1.25rem)' : 'clamp(1.5rem, 4.5vh, 2.5rem)' }}
            >
              {title}
            </motion.h1>
          </div>

          <motion.div
            layoutId="player-artist"
            className="flex items-center justify-center flex-wrap gap-x-2 w-full px-4 mt-1"
          >
            {artists && artists.length > 0 ? (
              artists.map((art, index) => (
                <React.Fragment key={index}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArtistClick?.(art);
                    }}
                    className={isMini ? 'text-white/80 mt-0.5 drop-shadow-md truncate max-w-[150px] hover:text-white transition-colors cursor-pointer' : 'text-white/80 mt-1 drop-shadow-md truncate max-w-[300px] hover:text-white transition-colors cursor-pointer'}
                    style={{
                      fontSize: isMini ? 'clamp(0.75rem, 2.5vh, 0.875rem)' : 'clamp(0.875rem, 3vh, 1.5rem)',
                      WebkitAppRegion: 'no-drag',
                      background: 'none',
                      border: 'none',
                      padding: 0
                    } as React.CSSProperties}
                  >
                    {art.name}
                  </button>
                  {index < artists.length - 1 && (
                    <span className="text-white/20 mt-1 select-none">•</span>
                  )}
                </React.Fragment>
              ))
            ) : artist && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArtistClick?.({ name: artist });
                }}
                className={isMini ? 'text-white/80 mt-0.5 drop-shadow-md w-full truncate text-center leading-tight hover:text-white transition-colors cursor-pointer' : 'text-white/80 mt-1 drop-shadow-md w-full truncate text-center leading-tight hover:text-white transition-colors cursor-pointer'}
                style={{
                  fontSize: isMini ? 'clamp(0.75rem, 2.5vh, 0.875rem)' : 'clamp(0.875rem, 3vh, 1.5rem)',
                  WebkitAppRegion: 'no-drag',
                  background: 'none',
                  border: 'none',
                  padding: 0
                } as React.CSSProperties}
              >
                {artist}
              </button>
            )}
          </motion.div>

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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
