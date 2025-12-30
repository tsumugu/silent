import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface PlaylistDetailViewProps {
    playlistId: string;
    onBack: () => void;
    onPlaySong: (song: any) => void;
}

export const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({ playlistId, onBack, onPlaySong }) => {
    const [playlist, setPlaylist] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlaylist = async () => {
            try {
                console.log(`[PlaylistDetailView] Requesting playlist ${playlistId}`);
                const data = await window.electronAPI.getPlaylist(playlistId);
                console.log('[PlaylistDetailView] Received data:', data);
                setPlaylist(data);
            } catch (error) {
                console.error('Failed to fetch playlist details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlaylist();
    }, [playlistId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-white/50">
                Loading Playlist...
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-white/50">
                <p>Failed to load playlist</p>
                <button
                    onClick={onBack}
                    className="mt-4 px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                    Back to Library
                </button>
            </div>
        );
    }

    // Extract playlist image
    const thumbnails = playlist.thumbnails || [];
    const coverUrl = thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;

    return (
        <div className="h-full overflow-y-auto scrollbar-hide">
            <div className="p-8 pb-32">
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Back
                </button>

                <div className="flex flex-col md:flex-row gap-8 mb-10">
                    {/* Cover Art */}
                    <div className="w-64 h-64 shrink-0 rounded-lg overflow-hidden shadow-2xl mx-auto md:mx-0">
                        {coverUrl ? (
                            <img src={coverUrl} alt={playlist.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                <span className="text-white/20 text-4xl">♫</span>
                            </div>
                        )}
                    </div>

                    {/* Playlist Info */}
                    <div className="flex flex-col justify-end text-center md:text-left">
                        <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">Playlist</h2>
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{playlist.title || playlist.name}</h1>
                        <div className="flex items-center justify-center md:justify-start gap-4 text-white/80">
                            <span className="font-semibold">{playlist.author?.name || playlist.artist?.name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{(playlist.tracks || playlist.contents || []).length} songs</span>
                        </div>
                    </div>
                </div>

                {/* Song List */}
                <div className="flex flex-col gap-1">
                    {(playlist.tracks || playlist.contents || []).map((song: any, index: number) => {
                        // Some endpoints return different structures
                        const title = song.title || song.name;
                        const artist = song.artists?.[0]?.name || song.artist?.name || '';

                        return (
                            <motion.div
                                key={`${song.videoId}-${index}`}
                                className="group flex items-center gap-4 p-3 rounded-md hover:bg-white/5 cursor-pointer transition-colors"
                                onClick={() => onPlaySong(song)}
                                whileTap={{ scale: 0.99 }}
                            >
                                <div className="w-8 text-center text-white/40 font-medium group-hover:text-white sm:block hidden">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-white font-medium truncate mb-1 group-hover:text-white">
                                        {title}
                                    </div>
                                    <div className="text-white/50 text-sm truncate group-hover:text-white/70">
                                        {artist}
                                    </div>
                                </div>
                                <div className="text-white/40 text-sm font-variant-numeric hidden sm:block">
                                    {song.duration}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
