import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Song {
    videoId: string;
    name: string;
    artist: { name: string; artistId: string };
    duration: number;
}

interface AlbumDetails {
    albumId: string;
    name: string;
    artist: { name: string; artistId: string };
    thumbnails: { url: string }[];
    songs: Song[];
}

interface AlbumDetailViewProps {
    albumId: string;
    onBack: () => void;
    onPlaySong: (song: Song) => void;
}

export const AlbumDetailView: React.FC<AlbumDetailViewProps> = ({ albumId, onBack, onPlaySong }) => {
    const [details, setDetails] = useState<AlbumDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await window.electronAPI.getAlbumDetails(albumId);
                setDetails(data);
            } catch (error) {
                console.error('Failed to fetch album details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [albumId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-white/50">
                Loading Album...
            </div>
        );
    }

    if (!details) return null;

    return (
        <div className="p-8 pb-32 overflow-y-auto h-full scrollbar-hide">
            <button
                onClick={onBack}
                className="mb-8 text-white/50 hover:text-white transition-colors flex items-center gap-2"
            >
                <span>←</span> Back to Home
            </button>

            <div className="flex flex-col md:flex-row gap-8 mb-12">
                <motion.div
                    layoutId={`album-${details.albumId}`}
                    className="w-48 h-48 md:w-64 md:h-64 flex-shrink-0 shadow-2xl rounded-2xl overflow-hidden"
                >
                    <img
                        src={details.thumbnails?.[details.thumbnails.length - 1]?.url}
                        alt={details.name}
                        className="w-full h-full object-cover"
                    />
                </motion.div>

                <div className="flex flex-col justify-end">
                    <p className="text-white/50 text-sm font-medium mb-2 uppercase tracking-widest">Album</p>
                    <h1 className="text-4xl font-bold text-white mb-4 line-clamp-2">{details.name}</h1>
                    <div className="flex items-center gap-2">
                        <p className="text-white/80 font-medium">{details.artist?.name}</p>
                        <span className="text-white/30">•</span>
                        <p className="text-white/40">{details.songs?.length || 0} songs</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1">
                {details.songs?.map((song, index) => (
                    <motion.div
                        key={song.videoId || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                        onClick={() => onPlaySong(song)}
                    >
                        <span className="w-8 text-white/30 group-hover:text-white/50 transition-colors text-right font-medium">
                            {index + 1}
                        </span>
                        <div className="flex-grow">
                            <h4 className="text-white font-medium line-clamp-1">{song.name}</h4>
                            <p className="text-white/40 text-sm line-clamp-1">{song.artist?.name}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
