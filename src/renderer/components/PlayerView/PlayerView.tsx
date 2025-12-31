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
import { MusicItem } from '../../../shared/types/music';

interface PlayerViewProps {
  onClose?: () => void;
  onNavigateToAlbum?: (albumItem: MusicItem) => void;
}

export function PlayerView({ onClose, onNavigateToAlbum }: PlayerViewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [albumInfo, setAlbumInfo] = useState<{ id: string; name: string } | null>(null);
  const { playbackInfo } = usePlayerStore();
  const { height } = useWindowDimensions();

  // Responsive logic for visibility/font-sizes only
  const isMini = height < 450;

  // Extract original artwork URL from metadata
  const originalArtwork = playbackInfo?.metadata?.artwork?.[0]?.src || null;
  const videoId = playbackInfo?.metadata?.videoId;

  // Fetch album info when videoId changes
  useEffect(() => {
    if (!videoId) {
      setAlbumInfo(null);
      return;
    }

    window.electronAPI.getSongDetails(videoId)
      .then((songDetails) => {
        if (songDetails?.album) {
          setAlbumInfo({
            id: songDetails.album.youtube_browse_id,
            name: songDetails.album.name
          });
        } else {
          setAlbumInfo(null);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch album info:', err);
        setAlbumInfo(null);
      });
  }, [videoId]);

  const handleAlbumClick = () => {
    if (albumInfo && onNavigateToAlbum) {
      const albumItem: MusicItem = {
        type: 'ALBUM',
        title: albumInfo.name,
        youtube_browse_id: albumInfo.id,
        thumbnails: [],
        artists: []
      };
      onNavigateToAlbum(albumItem);
    }
  };

  // Generate stable cache key
  const cacheKey = getImageCacheKey(
    playbackInfo?.metadata?.title || '',
    playbackInfo?.metadata?.artist || '',
    { videoId }
  );

  // Use the integrated hook for high-quality blob URL and colors
  const { blobUrl, colors } = useTrackAssets(originalArtwork, cacheKey);

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
          maxWidth: isHovered || isMini ? '500px' : '100%',
          maxHeight: isHovered || isMini ? '800px' : '100%'
        }}
      >
        {/* Top Section: Track Info - only present when needed to keep center clean */}
        {(isHovered || isMini) && (
          <motion.div layout className="w-full h-min flex flex-col items-center">
            <TrackInfo
              title={playbackInfo?.metadata?.title}
              artist={playbackInfo?.metadata?.artist}
              album={albumInfo?.name}
              onAlbumClick={handleAlbumClick}
              isVisible={isHovered || isMini}
              isMini={isMini}
            />
          </motion.div>
        )}

        {/* Middle Section: Album Art (Primary element) */}
        <motion.div
          layout
          layoutId="player-artwork"
          className="aspect-square flex-1 min-h-0 flex items-center justify-center max-w-full"
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
              currentTime={playbackInfo?.position || 0}
              duration={playbackInfo?.duration || 0}
              isVisible={isHovered || isMini}
              isMini={isMini}
              isPlaying={playbackInfo?.playbackState === 'playing'}
            />
            <ControlBar
              isPlaying={playbackInfo?.playbackState === 'playing'}
              isVisible={isHovered || isMini}
              isMini={isMini}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
