import React, { useState } from 'react';
import { usePlayerStore } from '../../store/playerStore';
import { AlbumArt } from './AlbumArt';
import { TrackInfo } from './TrackInfo';
import { ControlBar } from './ControlBar';
import { useTrackAssets } from '../../hooks/useTrackAssets';
import { useWindowDimensions } from '../../hooks/useWindowDimensions';

export function PlayerView() {
  const [isHovered, setIsHovered] = useState(false);
  const { playbackInfo } = usePlayerStore();
  const { height } = useWindowDimensions();

  // Responsive logic for visibility/font-sizes only
  const isMini = height < 450;

  // Extract original artwork URL from metadata
  const originalArtwork = playbackInfo?.metadata?.artwork?.[0]?.src || null;
  const videoId = playbackInfo?.metadata?.videoId;

  // Use the integrated hook for high-quality blob URL and colors
  const { blobUrl, colors } = useTrackAssets(originalArtwork, videoId);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center pt-16 pb-4 px-8 transition-all duration-1000 ease-in-out backdrop-blur-3xl overflow-hidden"
      style={{
        background: `radial-gradient(circle at center, ${colors.secondary}88 0%, ${colors.secondary}33 100%)`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="absolute inset-0 opacity-20 transition-all duration-1000"
        style={{
          background: `linear-gradient(45deg, ${colors.primary}88 0%, transparent 100%)`,
        }}
      />

      {/* Top Section: Track Info centered in top area */}
      <div className="flex-1 w-full flex items-center justify-center min-h-[80px]">
        <TrackInfo
          title={playbackInfo?.metadata?.title}
          artist={playbackInfo?.metadata?.artist}
          isVisible={isHovered || isMini}
          isMini={isMini}
        />
      </div>

      {/* Middle Section: Album Art (Primary element) */}
      <div className="flex-shrink flex-grow-0 w-full max-w-[400px] min-h-0 flex items-center justify-center">
        <AlbumArt
          src={blobUrl}
          isHovered={isHovered}
        />
      </div>

      {/* Bottom Section: Controls centered in bottom area */}
      <div className="flex-1 w-full flex items-center justify-center min-h-[100px]">
        <ControlBar
          isPlaying={playbackInfo?.playbackState === 'playing'}
          isVisible={isHovered || isMini}
          isMini={isMini}
        />
      </div>
    </div>
  );
}
