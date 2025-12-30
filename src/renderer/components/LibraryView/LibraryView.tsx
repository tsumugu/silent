import React, { useEffect, useState } from 'react';
import Masonry from 'react-masonry-css';
import { motion } from 'framer-motion';

interface Album {
    id: string;
    name: string;
    artist: string;
    thumbnails: any[];
    type: string;
}

interface LibraryViewProps {
    onAlbumSelect: (album: Album) => void;
    onPlaylistSelect: (playlist: any) => void;
}

interface SectionProps {
    title: string;
    items: any[];
    onAlbumSelect: (album: Album) => void;
    onPlaylistSelect: (playlist: any) => void;
}

const Section: React.FC<SectionProps> = ({ title, items, onAlbumSelect, onPlaylistSelect }) => {
    const breakpointColumnsObj = {
        default: 5,
        1400: 4,
        1100: 3,
        700: 2,
        500: 2
    };

    return (
        <div className="mb-12 relative">
            <h2 className="text-2xl font-bold text-white mb-6 sticky top-0 z-10 py-2 bg-transparent opacity-90">
                {title}
            </h2>

            <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex -ml-4 w-auto"
                columnClassName="pl-4 bg-clip-padding"
            >
                {items.map((item: any, itemIdx: number) => {
                    const thumbnails = item.thumbnails || item.thumbnail;
                    const imageUrl = thumbnails?.[thumbnails.length - 1]?.url || thumbnails?.[0]?.url;
                    const title = item.name || item.title;
                    const artist = item.artist?.name || item.subtitle || (item.artists ? item.artists.map((a: any) => a.name).join(', ') : '');

                    return (
                        <motion.div
                            key={`${item.videoId || item.browseId || itemIdx}`}
                            className="mb-8 cursor-pointer group"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                if (item.type === 'ALBUM' || (item.album && item.album.albumId)) {
                                    const albumId = item.type === 'ALBUM' ? item.albumId : item.album.albumId;
                                    onAlbumSelect({ ...item, id: albumId, name: title, artist } as any);
                                } else if (item.type === 'SONG' || item.videoId) {
                                    window.electronAPI.play(item.videoId, 'SONG');
                                } else if (item.type === 'PLAYLIST' || item.browseId) {
                                    onPlaylistSelect({ ...item, playlistId: item.browseId || item.playlistId });
                                }
                            }}
                        >
                            <div className="relative aspect-square overflow-hidden rounded-md shadow-lg bg-white/5 mb-3 group-hover:shadow-2xl transition-shadow">
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
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="px-1">
                                <h3 className="text-white font-medium truncate text-sm mb-1">{title}</h3>
                                <p className="text-white/50 text-xs truncate">{artist}</p>
                                {item.type && (
                                    <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">{item.type}</p>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </Masonry>
        </div>
    );
};

export const LibraryView: React.FC<LibraryViewProps> = ({ onAlbumSelect, onPlaylistSelect }) => {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHome = async () => {
            try {
                const homeData = await window.electronAPI.getHome();
                const recommendations = await window.electronAPI.getRecommendations();
                let combinedData = homeData || [];
                if (recommendations) {
                    combinedData = [recommendations, ...combinedData];
                }
                setSections(combinedData);
            } catch (error) {
                console.error('Failed to fetch home content:', error);
                setSections([]);
            } finally {
                setLoading(false);
            }
        };
        fetchHome();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-white/50">
                Loading Home...
            </div>
        );
    }

    return (
        <div className="p-8 pb-32 overflow-y-auto h-full scrollbar-hide">
            {sections.map((section, sectionIdx) => {
                if (!section.contents || section.contents.length === 0) return null;
                return (
                    <Section
                        key={`${section.title}-${sectionIdx}`}
                        title={section.title}
                        items={section.contents}
                        onAlbumSelect={onAlbumSelect}
                        onPlaylistSelect={onPlaylistSelect}
                    />
                );
            })}
        </div>
    );
};
