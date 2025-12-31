import React, { useEffect, useState } from 'react';
import { MusicSection } from './MusicSection';
import { SearchBar } from './SearchBar';

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
    onSearch?: (query: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onAlbumSelect, onPlaylistSelect, onSearch }) => {
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
        <div className="h-full overflow-y-auto scrollbar-hide relative">
            {onSearch && (
                <SearchBar onSearch={onSearch} placeholder="Search songs, albums, playlists..." />
            )}
            <div className="p-8 pb-32">
                {sections.map((section, sectionIdx) => {
                    if (!section.contents || section.contents.length === 0) return null;
                    return (
                        <MusicSection
                            key={`${section.title}-${sectionIdx}`}
                            title={section.title}
                            items={section.contents}
                            onAlbumSelect={onAlbumSelect}
                            onPlaylistSelect={onPlaylistSelect}
                        />
                    );
                })}
            </div>
        </div>
    );
};
