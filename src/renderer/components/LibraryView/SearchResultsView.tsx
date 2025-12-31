import React, { useState, useEffect } from 'react';
import { MusicSection } from './MusicSection';

interface SearchResults {
  songs: any[];
  albums: any[];
  playlists: any[];
}

interface SearchResultsViewProps {
  query: string;
  results: SearchResults | null;
  onResultsChange: (results: SearchResults | null) => void;
  onBack: () => void;
  onAlbumSelect?: (album: any) => void;
  onPlaylistSelect?: (playlist: any) => void;
  onSongSelect?: (song: any) => void;
}

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-32 gap-4">
    <div className="w-12 h-12 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
    <span className="text-white/50 text-sm font-medium tracking-wide">Searching...</span>
  </div>
);

const ErrorState: React.FC<{ error: string }> = ({ error }) => (
  <div className="flex flex-col items-center justify-center py-32 gap-4 text-center max-w-md mx-auto">
    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div>
      <h3 className="text-white font-bold text-lg mb-2">Search Failed</h3>
      <p className="text-white/60 text-sm">{error}</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ query: string }> = ({ query }) => (
  <div className="flex flex-col items-center justify-center py-32 gap-4 text-center max-w-md mx-auto">
    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-2">
      <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <div>
      <h3 className="text-white font-bold text-xl mb-2">No results found</h3>
      <p className="text-white/50 text-sm">
        No songs, albums, or playlists found for "{query}"
      </p>
    </div>
  </div>
);

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({
  query,
  results,
  onResultsChange,
  onBack,
  onAlbumSelect,
  onPlaylistSelect,
  onSongSelect
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Perform search when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!query || query.trim().length < 2) {
        onResultsChange(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const searchResults = await window.electronAPI.search(query);
        onResultsChange(searchResults);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Failed to search. Please try again.');
        onResultsChange(null);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, onResultsChange]);

  // Keyboard shortcut for back navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const hasResults = results && (
    results.songs.length > 0 ||
    results.albums.length > 0 ||
    results.playlists.length > 0
  );

  return (
    <div className="h-full overflow-y-auto scrollbar-hide">
      {/* Header - Transparent background with backdrop blur */}
      <div className="sticky top-0 z-30 px-8 py-4 backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="text-white/60 hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Search Query Display */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">
              Search Results
            </h2>
            <p className="text-white/40 text-sm mt-0.5">
              {query}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Transparent background */}
      <div className="p-8 pt-4 pb-32">
        {loading && <LoadingState />}

        {error && <ErrorState error={error} />}

        {!loading && !error && results && !hasResults && (
          <EmptyState query={query} />
        )}

        {/* Search Results - Using MusicSection */}
        {!loading && !error && results && hasResults && (
          <>
            {results.songs.length > 0 && (
              <MusicSection
                title="Songs"
                items={results.songs}
                showCount={true}
                onSongSelect={onSongSelect}
              />
            )}

            {results.albums.length > 0 && (
              <MusicSection
                title="Albums"
                items={results.albums}
                showCount={true}
                onAlbumSelect={onAlbumSelect}
              />
            )}

            {results.playlists.length > 0 && (
              <MusicSection
                title="Playlists"
                items={results.playlists}
                showCount={true}
                onPlaylistSelect={onPlaylistSelect}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};
