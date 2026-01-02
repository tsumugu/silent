import React from 'react';
import { motion } from 'framer-motion';
import {
  MusicItem,
  isSongItem,
  isAlbumItem,
  isArtistItem,
  isPlaylistItem,
  isRadioItem
} from '../../../shared/types/music';
import { useTrackAssets } from '../../hooks/useTrackAssets';
import { getImageCacheKey } from '../../../shared/utils/imageKey';

interface MusicCardProps {
  item: MusicItem;
  onAlbumSelect?: (album: MusicItem) => void;
  onPlaylistSelect?: (playlist: MusicItem) => void;
  onArtistSelect?: (artist: MusicItem) => void;
  onSongSelect?: (song: MusicItem) => void;
}

export const MusicCard: React.FC<MusicCardProps> = ({
  item,
  onAlbumSelect,
  onPlaylistSelect,
  onArtistSelect,
  onSongSelect
}) => {
  const thumbnails = item.thumbnails || [];
  const rawImageUrl = thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;

  const title = item.title;
  const artists = (isSongItem(item) || isAlbumItem(item)) ? item.artists : [];
  const artist = artists
    ?.map((a: any) => a.name)
    .filter((name: string) => name && name.trim().length > 0)
    .join(', ') || '';

  const canonicalId = getImageCacheKey(title, artist, {
    browseId: (isAlbumItem(item) || isArtistItem(item)) ? item.youtube_browse_id : undefined,
    playlistId: (isPlaylistItem(item) || isRadioItem(item) || isSongItem(item) || isAlbumItem(item)) ? item.youtube_playlist_id : undefined,
    videoId: isSongItem(item) ? item.youtube_video_id : undefined
  });

  // Use assets from cache (handles proxying, high-res, and stability)
  const { blobUrl: imageUrl } = useTrackAssets(rawImageUrl, canonicalId);

  const normalizedType = item.type === 'ALBUM' ? 'album' :
    item.type === 'PLAYLIST' ? 'playlist' :
      item.type === 'SONG' || item.type === 'RADIO' ? 'song' : item.type === 'ARTIST' ? 'artist' : null;

  const handleClick = () => {
    if (normalizedType === 'album' && onAlbumSelect) {
      onAlbumSelect(item);
    } else if (normalizedType === 'song') {
      if (onSongSelect) {
        onSongSelect(item);
      } else if (isSongItem(item)) {
        window.electronAPI.play(item.youtube_video_id, 'SONG');
      } else if (isRadioItem(item)) {
        // Use seed_video_id as the primary ID and youtube_playlist_id as the context
        const videoId = item.seed_video_id || '';
        window.electronAPI.play(videoId || item.youtube_playlist_id, 'RADIO', videoId ? item.youtube_playlist_id : undefined);
      }
    } else if (normalizedType === 'playlist' && onPlaylistSelect) {
      onPlaylistSelect(item);
    } else if (normalizedType === 'artist' && onArtistSelect) {
      onArtistSelect(item);
    }
  };

  return (
    <motion.div
      key={canonicalId}
      layoutId={normalizedType && canonicalId ? `card - ${normalizedType} -${canonicalId} ` : undefined}
      className="mb-8 cursor-pointer group bg-white/0 rounded-xl overflow-hidden"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      <motion.div
        layoutId={normalizedType && canonicalId ? `art - ${normalizedType} -${canonicalId} ` : undefined}
        className="relative aspect-square overflow-hidden rounded-md shadow-lg bg-white/5 mb-3 group-hover:shadow-2xl transition-shadow"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
          {artist && <p className="text-white/40 text-xs truncate">{artist}</p>}
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
