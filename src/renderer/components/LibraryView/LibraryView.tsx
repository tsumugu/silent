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

                    const normalizedType = item.type === 'ALBUM' || (item.album && item.album.albumId) ? 'album' :
                        (item.type === 'PLAYLIST' || item.browseId || item.playlistId) ? 'playlist' : null;
                    const canonicalId = normalizedType === 'album' ? (item.type === 'ALBUM' ? item.albumId : item.album.albumId) :
                        normalizedType === 'playlist' ? (item.browseId || item.playlistId) : null;

                    return (
                        <motion.div
                            key={`${item.videoId || item.browseId || itemIdx}`}
                            layoutId={normalizedType && canonicalId ? `card-${normalizedType}-${canonicalId}` : undefined}
                            className="mb-8 cursor-pointer group bg-white/0 rounded-xl overflow-hidden"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                if (normalizedType === 'album') {
                                    onAlbumSelect({ ...item, id: canonicalId, name: title, artist } as any);
                                } else if (item.type === 'SONG' || item.videoId) {
                                    window.electronAPI.play(item.videoId, 'SONG');
                                } else if (normalizedType === 'playlist') {
                                    if (canonicalId && (canonicalId.startsWith('RDCL') || canonicalId.startsWith('RD'))) {
                                        window.electronAPI.play(canonicalId, 'PLAYLIST');
                                    } else {
                                        onPlaylistSelect({ ...item, playlistId: canonicalId });
                                    }
                                }
                            }}
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
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                </div>
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
                })}
            </Masonry>
        </div>
    );
};

export const LibraryView: React.FC<LibraryViewProps> = ({ onAlbumSelect, onPlaylistSelect }) => {
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    const checkLoginAndFetch = async () => {
        setLoading(true);
        try {
            const loggedIn = await window.electronAPI.checkLogin();
            setIsLoggedIn(loggedIn);

            if (loggedIn) {
                const homeData = await window.electronAPI.getHome();
                setSections(homeData);
            }
        } catch (error) {
            console.error('Failed to fetch home content:', error);
            setSections([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkLoginAndFetch();

        // Listen for session updates (e.g. after login window is hidden)
        window.electronAPI.onSessionUpdated(() => {
            console.log('Session updated, re-fetching home...');
            checkLoginAndFetch();
        });
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/50 gap-4">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                <span className="text-sm font-medium tracking-wide">Loading Home...</span>
            </div>
        );
    }

    if (isLoggedIn === false) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white gap-6 px-8 text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
                    <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">Login Required</h2>
                    <p className="text-white/60 text-sm leading-relaxed">
                        YouTube Musicのパーソナライズされた体験を楽しむにはログインが必要です。
                        ライブラリやおすすめを表示するにはGoogleアカウントでログインしてください。
                    </p>
                </div>
                <button
                    onClick={() => {
                        window.electronAPI.showLogin();
                        // ログイン画面が閉じられたあとのリトライはここでは難しいが、
                        // 親コンポーネントで監視するか、一定間隔でチェックするなどの検討が必要
                    }}
                    className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-neutral-200 transition-colors shadow-xl"
                >
                    YouTube Musicにログイン
                </button>
                <button
                    onClick={() => checkLoginAndFetch()}
                    className="text-white/40 text-xs hover:text-white/60 transition-colors"
                >
                    ログイン後にここをクリックして更新
                </button>
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
