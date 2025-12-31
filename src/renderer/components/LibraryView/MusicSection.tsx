import React from 'react';
import Masonry from 'react-masonry-css';
import { MusicCard } from './MusicCard';

interface MusicSectionProps {
  title: string;
  items: any[];
  showCount?: boolean;
  onAlbumSelect?: (album: any) => void;
  onPlaylistSelect?: (playlist: any) => void;
  onSongSelect?: (song: any) => void;
}

export const MusicSection: React.FC<MusicSectionProps> = ({
  title,
  items,
  showCount = false,
  onAlbumSelect,
  onPlaylistSelect,
  onSongSelect,
}) => {
  const breakpointColumnsObj = {
    default: 6,
    1400: 5,
    1100: 4,
    700: 3,
    500: 2
  };

  return (
    <div className="mb-12 relative">
      <h2 className="text-2xl font-bold text-white mb-6 sticky top-0 z-10 py-2 bg-transparent opacity-90">
        {title}
        {showCount && (
          <span className="text-white/30 text-lg ml-3">({items.length})</span>
        )}
      </h2>

      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {items.map((item: any, itemIdx: number) => (
          <MusicCard
            key={`${item.videoId || item.browseId || item.id || itemIdx}`}
            item={item}
            onAlbumSelect={onAlbumSelect}
            onPlaylistSelect={onPlaylistSelect}
            onSongSelect={onSongSelect}
          />
        ))}
      </Masonry>
    </div>
  );
};
