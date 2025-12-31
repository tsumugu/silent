import React from 'react';
import Masonry from 'react-masonry-css';
import { MusicCard } from './MusicCard';
import { MusicItem } from '../../../shared/types/music';

interface MusicSectionProps {
  title: string;
  items: MusicItem[];
  showCount?: boolean;
  onAlbumSelect?: (album: MusicItem) => void;
  onPlaylistSelect?: (playlist: MusicItem) => void;
  onSongSelect?: (song: MusicItem) => void;
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
        {items.map((item, itemIdx) => (
          <MusicCard
            key={item.youtube_video_id || item.youtube_browse_id || item.youtube_playlist_id || itemIdx}
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
