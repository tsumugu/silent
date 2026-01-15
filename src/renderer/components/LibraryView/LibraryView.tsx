import React, { useEffect, useState, useRef } from 'react';
import { MusicSection } from './MusicSection';
import { SearchBar } from './SearchBar';
import { MusicItem } from '../../../shared/types/music';
import { useIsSticky } from '../../hooks/useIsSticky';
import { LoadingState, ErrorState, EmptyState } from '../common/StateViews';
import { useTranslation } from '../../hooks/useTranslation';

interface LibraryViewProps {
    query?: string;
    onAlbumSelect: (album: MusicItem) => void;
    onPlaylistSelect: (playlist: MusicItem) => void;
    onSongSelect?: (song: MusicItem) => void;
    onSearch?: (query: string) => void;
    onBack?: () => void;
    searchResults?: any;
    onResultsChange?: (results: any) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
    query,
    onAlbumSelect,
    onPlaylistSelect,
    onSongSelect,
    onSearch,
    onBack,
    searchResults,
    onResultsChange
}) => {
    const { t } = useTranslation();
    const [sections, setSections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    const headerRef = useRef<HTMLDivElement>(null);
    const isSearchMode = !!(query && query.trim().length >= 1);
    const isStuck = useIsSticky(headerRef);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const loggedIn = await window.electronAPI.checkLogin();
            setIsLoggedIn(loggedIn);

            if (!loggedIn) {
                setLoading(false);
                return;
            }

            if (isSearchMode) {
                // Search Mode
                const results = await window.electronAPI.search(query!);
                if (onResultsChange) onResultsChange(results);

                const mappedSections = [];
                if (results) {
                    if (results.songs.length > 0) mappedSections.push({ title: t.songs, contents: results.songs });
                    if (results.albums.length > 0) mappedSections.push({ title: t.albums, contents: results.albums });
                    if (results.playlists.length > 0) mappedSections.push({ title: t.playlists, contents: results.playlists });
                }
                setSections(mappedSections);
            } else {
                // Home Mode
                const homeData = await window.electronAPI.getHome();

                // Add Liked Music section at the top
                const likedSection = {
                    title: t.liked_music,
                    contents: [{
                        type: 'PLAYLIST' as const,
                        title: t.liked_music,
                        youtube_playlist_id: 'LM',
                        thumbnails: [{
                            url: 'https://www.gstatic.com/youtube/media/ytm/images/pbg/liked-music-@224.png',
                            width: 224,
                            height: 224
                        }],
                        author: 'YouTube Music'
                    }]
                };

                setSections([likedSection, ...homeData]);
            }
        } catch (err) {
            console.error('Failed to fetch content:', err);
            setError(isSearchMode ? t.failed_search : t.failed_home);
            setSections([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        window.electronAPI.onSessionUpdated(() => {

            fetchData();
        });
    }, [query]);

    // Login screen is handled locally if not logged in
    if (isLoggedIn === false) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white gap-6 px-8 text-center max-w-md mx-auto">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2 ring-1 ring-white/10">
                    <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">{t.login_required}</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                        {t.login_message}
                    </p>
                </div>
                <button
                    onClick={() => window.electronAPI.showLogin()}
                    className="px-8 py-3 bg-white text-black rounded-full font-bold hover:bg-neutral-200 transition-colors shadow-xl active:scale-95"
                >
                    {t.login_button}
                </button>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto scrollbar-hide relative bg-transparent">
            {/* Sticky Header */}
            <div
                ref={isSearchMode ? headerRef : null}
                className={isSearchMode ? `sticky-glass-header transition-all duration-300 ${isStuck ? 'is-stuck' : ''}` : ''}
            >
                <div className={`flex items-center gap-4 px-8 ${isSearchMode ? 'py-4' : 'pt-8 pb-4'}`}>
                    {isSearchMode && onBack && (
                        <button
                            onClick={onBack}
                            className="text-white/60 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5 active:scale-90"
                            title={t.back}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div className="flex-1 flex flex-col gap-2">
                        <SearchBar
                            onSearch={onSearch || (() => { })}
                            placeholder={t.search_placeholder}
                            value={query}
                        />
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="p-8 pb-32">
                {loading && <LoadingState message={isSearchMode ? t.searching : t.fetching} />}

                {error && <ErrorState error={error} />}

                {!loading && !error && isSearchMode && sections.length === 0 && (
                    <EmptyState
                        message={t.no_results}
                        subMessage={t.no_results_sub(query)}
                    />
                )}

                {!loading && !error && sections.map((section, idx) => (
                    <MusicSection
                        key={`${section.title}-${idx}`}
                        title={section.title}
                        items={section.contents}
                        onAlbumSelect={onAlbumSelect}
                        onPlaylistSelect={onPlaylistSelect}
                        onSongSelect={onSongSelect}
                    />
                ))}
            </div>
        </div>
    );
};
