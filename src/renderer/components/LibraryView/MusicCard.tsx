import React from 'react';
import { motion } from 'framer-motion';

interface MusicCardProps {
  item: any;
  onAlbumSelect?: (album: any) => void;
  onPlaylistSelect?: (playlist: any) => void;
  onSongSelect?: (song: any) => void;
}

export const MusicCard: React.FC<MusicCardProps> = ({
  item,
  onAlbumSelect,
  onPlaylistSelect,
  onSongSelect,
}) => {
  const thumbnails = item.thumbnails || item.thumbnail;
  const imageUrl = thumbnails?.[thumbnails.length - 1]?.url || thumbnails?.[0]?.url;
  const title = item.name || item.title;
  const artist = item.artist?.name || item.subtitle || (item.artists ? item.artists.map((a: any) => a.name).join(', ') : '');

  const normalizedType = item.type === 'ALBUM' || (item.album && item.album.albumId) ? 'album' :
    (item.type === 'PLAYLIST' || item.browseId || item.playlistId) ? 'playlist' :
      (item.type === 'SONG' || item.videoId) ? 'song' : null;

  const canonicalId = normalizedType === 'album' ? (item.type === 'ALBUM' ? item.albumId : item.album?.albumId) :
    normalizedType === 'playlist' ? (item.browseId || item.playlistId) :
      normalizedType === 'song' ? item.videoId : null;

  const handleClick = () => {
    if (normalizedType === 'album' && onAlbumSelect) {
      onAlbumSelect({ ...item, id: canonicalId, name: title, artist });
    } else if (normalizedType === 'song' && onSongSelect) {
      onSongSelect(item);
    } else if (normalizedType === 'song' && item.videoId) {
      // Fallback for songs when onSongSelect is not provided
      window.electronAPI.play(item.videoId, 'SONG');
    } else if (normalizedType === 'playlist' && onPlaylistSelect) {
      if (canonicalId && (canonicalId.startsWith('RDCL') || canonicalId.startsWith('RD'))) {
        window.electronAPI.play(canonicalId, 'PLAYLIST');
      } else {
        onPlaylistSelect({ ...item, playlistId: canonicalId });
      }
    }
  };

  return (
    <motion.div
      key={`${item.videoId || item.browseId || item.id}`}
      layoutId={normalizedType && canonicalId ? `card-${normalizedType}-${canonicalId}` : undefined}
      className="mb-8 cursor-pointer group bg-white/0 rounded-xl overflow-hidden"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      <motion.div
        layoutId={normalizedType && canonicalId ? `art-${normalizedType}-${canonicalId}` : undefined}
        className="relative aspect-square overflow-hidden rounded-md shadow-lg bg-white/5 mb-3 group-hover:shadow-2xl transition-shadow"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
            <span className="text-white/20 text-4xl">♫</span>
          </div>
        )}
        {normalizedType === 'song' && (
          <>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </>
        )}
      </motion.div>
      <div className="px-1">
        <h3 className="text-white font-medium truncate text-sm mb-1">{title}</h3>
        <div className="flex items-center gap-1.5 overflow-hidden leading-none">
          <p className="text-white/40 text-xs truncate">{artist}</p>
          {item.type && (
            <span className="text-white/20 text-[8px] font-bold uppercase tracking-widest flex-shrink-0 ring-1 ring-white/10 px-1 py-0.5 rounded-[2px]">
              {item.type}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
