import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '../../store/playerStore';
import { AlbumArt } from './AlbumArt';
import { TrackInfo } from './TrackInfo';
import { ControlBar } from './ControlBar';
import { SeekBar } from './SeekBar';
import { useTrackAssets } from '../../hooks/useTrackAssets';
import { useWindowDimensions } from '../../hooks/useWindowDimensions';
import { getImageCacheKey } from '../../../shared/utils/imageKey';
import { MusicItem, MusicArtist } from '../../../shared/types/music';

interface PlayerViewProps {
  onClose?: () => void;
  onNavigateToAlbum?: (albumItem: MusicItem) => void;
  onNavigateToArtist?: (artistItem: MusicItem) => void;
}

export function PlayerView({ onClose, onNavigateToAlbum, onNavigateToArtist }: PlayerViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [albumInfo, setAlbumInfo] = useState<{ id: string; name: string } | null>(null);

  // Use granular selectors to prevent re-rendering PlayerView on every position update
  // metadata and playbackState change much less frequently than position.
  const metadata = usePlayerStore(state => state.playbackInfo?.metadata);
  const playbackState = usePlayerStore(state => state.playbackInfo?.playbackState);
  const position = usePlayerStore(state => state.playbackInfo?.position);
  const duration = usePlayerStore(state => state.playbackInfo?.duration);

  const { height } = useWindowDimensions();

  // Responsive logic for visibility/font-sizes only
  const isMini = height < 450;

  // Extract original artwork URL from metadata
  const originalArtwork = metadata?.artwork?.[0]?.src || null;
  const videoId = metadata?.videoId;

  // Extract Album info from metadata
  const albumName = metadata?.album;
  const albumId = metadata?.albumId;

  const handleAlbumClick = React.useCallback(() => {
    if (albumName && albumId && onNavigateToAlbum) {
      const albumItem: MusicItem = {
        type: 'ALBUM',
        title: albumName,
        youtube_browse_id: albumId,
        thumbnails: [],
        artists: []
      };
      onNavigateToAlbum(albumItem);
    }
  }, [albumName, albumId, onNavigateToAlbum]);

  const handleArtistClick = React.useCallback((artist: MusicArtist) => {
    if (artist.id && onNavigateToArtist) {
      const artistItem: MusicItem = {
        type: 'ARTIST',
        title: artist.name,
        youtube_browse_id: artist.id,
        thumbnails: []
      };
      onNavigateToArtist(artistItem);
    }
  }, [onNavigateToArtist]);

  // Generate stable cache key
  const cacheKey = getImageCacheKey(
    metadata?.title || '',
    metadata?.artist || '',
    { videoId }
  );

  // Use the integrated hook for high-quality blob URL and colors
  const { blobUrl, colors } = useTrackAssets(originalArtwork, cacheKey);

  const isLoading = playbackState === 'loading';
  const isPlaying = playbackState === 'playing';

  return (
    /*
    不透明度の Hex 換算表（よく使うもの）
    100% — FF
    90% — E6
    80% — CC
    75% — BF
    70% — B3
    60% — 99
    50% — 80
    40% — 66
    30% — 4D
    20% — 33
    10% — 1A
    0% — 00
    */
    <motion.div
      layoutId="player-shell"
      className="absolute inset-0 z-50 w-full h-full flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(-135deg, ${colors.primary}B3 0%, ${colors.secondary}B3 100%)`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="absolute inset-0 opacity-20 transition-all duration-1000"
      />

      {/* Close Button - Absolute Position */}
      <AnimatePresence>
        {(isHovered || isMini) && onClose && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`absolute top-6 left-1/2 transform-translate-x-1/2 text-white/40 hover:text-white transition-colors z-50 ${isMini ? 'mb-1' : 'mb-2'} `}
            title="Close Player (Esc)"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <svg className={isMini ? 'w-4 h-4 rotate-180' : 'w-5 h-5 rotate-180'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Content Container - Centered with Gap-based spacing */}
      <div
        className="flex flex-col items-center justify-center w-full h-full gap-8 md:gap-10 transition-all duration-500 p-12"
        style={{
          maxHeight: isHovered || isMini ? '800px' : '100%'
        }}
      >
        {/* Top Section: Track Info - only present when needed to keep center clean */}
        {(isHovered || isMini) && (
          <motion.div layout className="w-full h-min flex flex-col items-center">
            <TrackInfo
              title={metadata?.title}
              artist={metadata?.artist}
              artists={metadata?.artists}
              album={albumName}
              onAlbumClick={handleAlbumClick}
              onArtistClick={handleArtistClick}
              isVisible={isHovered || isMini}
              isMini={isMini}
            />
          </motion.div>
        )}

        <motion.div
          layout
          layoutId="player-artwork"
          className="flex-1 min-h-0 flex items-center justify-center w-full"
          style={{
            maxHeight: isHovered ? '100%' : '800px'
          }}
        >
          <AlbumArt
            src={blobUrl}
            isHovered={isHovered}
            isMini={isMini}
          />
        </motion.div>

        {/* Bottom Section: Controls - only present when needed */}
        {(isHovered || isMini) && (
          <motion.div layout className="w-full flex-shrink-0 flex flex-col items-center gap-6">
            <SeekBar
              currentTime={position || 0}
              duration={duration || 0}
              isPlaying={isPlaying}
              isVisible={isHovered || isMini}
              isMini={isMini}
            />
            <ControlBar
              isPlaying={isPlaying}
              isLoading={isLoading}
              isVisible={isHovered || isMini}
              isMini={isMini}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
