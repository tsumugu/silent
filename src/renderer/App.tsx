import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WindowControls } from './components/WindowControls';
import { PlayerView } from './components/PlayerView/PlayerView';
import { ListView } from './components/LibraryView/ListView';
import { MusicDetailView } from './components/LibraryView/MusicDetailView';
import { useMediaSession } from './hooks/useMediaSession';
import { MiniPlayer } from './components/PlayerView/MiniPlayer';
import { ViewWrapper } from './components/common/ViewWrapper';

import {
  MusicItem,
  isAlbumItem,
  isArtistItem,
  isPlaylistItem,
  isSongItem,
  isRadioItem
} from '../shared/types/music';

import { ArtistDetailView } from './components/LibraryView/ArtistDetailView';

type ViewType = 'home' | 'detail' | 'search' | 'artist';

interface StackEntry {
  view: ViewType;
  item: MusicItem | null;
}

// Helper functions to safely get IDs from MusicItem
function getBrowseId(item: MusicItem): string | undefined {
  if (isAlbumItem(item) || isArtistItem(item)) {
    return item.youtube_browse_id;
  }
  return undefined;
}

function getPlaylistId(item: MusicItem): string | undefined {
  if (isPlaylistItem(item) || isRadioItem(item)) {
    return item.youtube_playlist_id;
  }
  if (isAlbumItem(item) || isSongItem(item)) {
    return item.youtube_playlist_id;
  }
  return undefined;
}

function getVideoId(item: MusicItem): string | undefined {
  if (isSongItem(item)) {
    return item.youtube_video_id;
  }
  return undefined;
}

export default function App() {
  // Initialize MediaSession listener
  useMediaSession();

  // Navigation Stack for Main Content (Library, Album Details, etc.)
  const [viewStack, setViewStack] = useState<StackEntry[]>([{ view: 'home', item: null }]);

  // Overlay State for Player
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any>(null);

  const currentEntry = viewStack[viewStack.length - 1];
  const currentView = currentEntry.view;
  const selectedItem = currentEntry.item;

  const navigateTo = useCallback((
    view: 'player' | ViewType,
    item: MusicItem | null = null,
    query?: string
  ) => {
    console.log(`[App] Navigating to ${view}`, item);

    if (view === 'player') {
      setIsPlayerOpen(true);
    } else if (view === 'search' && query !== undefined && query.trim().length >= 1) {
      setSearchQuery(query);
      // Only push if not already on search with same query
      if (currentView !== 'search' || searchQuery !== query) {
        setViewStack(prev => [...prev, { view: 'search', item: null }]);
      }
      setIsPlayerOpen(false);
    } else if (view === 'home') {
      setViewStack([{ view: 'home', item: null }]);
      setIsPlayerOpen(false);
    } else if (view === 'detail') {
      if (item) {
        // Only push if not already looking at this item
        const isSameDetail = currentView === 'detail' && selectedItem &&
          (getBrowseId(selectedItem) === getBrowseId(item) ||
            getPlaylistId(selectedItem) === getPlaylistId(item));

        if (!isSameDetail) {
          setViewStack(prev => [...prev, { view: 'detail', item }]);
        }
        setIsPlayerOpen(false);
      }
    } else if (view === 'artist') {
      if (item) {
        // Only push if not already looking at this artist
        const isSameArtist = currentView === 'artist' && selectedItem &&
          getBrowseId(selectedItem) === getBrowseId(item);

        if (!isSameArtist) {
          setViewStack(prev => [...prev, { view: 'artist', item }]);
        }
        setIsPlayerOpen(false);
      }
    }
  }, [currentView, searchQuery, selectedItem]);

  const goBack = useCallback(() => {
    // If player is open, close it first (like a modal)
    if (isPlayerOpen) {
      setIsPlayerOpen(false);
      return;
    }

    // Otherwise navigate back in the stack
    if (viewStack.length > 1) {
      const poppedEntry = viewStack[viewStack.length - 1];

      // Clear search state when leaving search view
      if (poppedEntry.view === 'search') {
        setSearchQuery('');
        setSearchResults(null);
      }

      setViewStack(prev => prev.slice(0, -1));
    }
  }, [isPlayerOpen, viewStack]);

  // Handle scroll to switch between Player and Main View
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Ignore small scrolls
      if (Math.abs(e.deltaY) < 20) return;

      if (isPlayerOpen) {
        // If Player is open, scroll DOWN to close it
        if (e.deltaY < -50) {
          // Standard scroll direction check might be reversed depending on OS/Setting.
          // Usually "pull down" gesture y < 0 ? No, deltaY < 0 is scrolling UP content (swiping down).
          // Let's stick to the previous feeling: 
          // Previous: "if currentView === 'player' && e.deltaY < -50 => nav to home"
          setIsPlayerOpen(false);
        }
      } else {
        // If Player is closed, scroll UP (swiping up) to open it?
        // Usually swiping UP moves content DOWN.
        // Let's assume standard "pull up" gesture to open player.
        // e.deltaY > 0 is scrolling DOWN content (swiping up).
        // Let's rely on click for now to Open, and Scroll/Click to close to keep it simple,
        // unless previously defined.
        // Previous logic didn't seem to have "open by scroll".
      }
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isPlayerOpen]);

  // Handle keyboard shortcuts (Esc to close player)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlayerOpen) {
        setIsPlayerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerOpen]);

  // Dynamically control window vibrancy based on player state
  useEffect(() => {
    if (isPlayerOpen) {
      window.electronAPI.setVibrancy(null);
    } else {
      window.electronAPI.setVibrancy('under-window');
    }
  }, [isPlayerOpen]);

  return (
    <div className="w-full h-screen overflow-hidden relative font-sans select-none">
      <div className="draggable absolute top-0 left-0 right-0 h-10 z-50" />
      <WindowControls />

      <div
        className="absolute inset-0 z-0"
        style={{
          visibility: isPlayerOpen ? 'hidden' : 'visible',
          pointerEvents: isPlayerOpen ? 'none' : 'auto'
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>


          {/* Home & Search Results (Unified ListView) */}
          {(currentView === 'home' || currentView === 'search' || (currentView === 'detail' && viewStack.some(e => e.view === 'home'))) && (
            <motion.div
              key="library-main"
              initial={{ opacity: 0 }}
              animate={{ opacity: (currentView === 'home' || currentView === 'search') ? 1 : 0.001 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-0"
              style={{
                pointerEvents: (currentView === 'home' || currentView === 'search') ? 'auto' : 'none'
              }}
            >
              <ViewWrapper>
                <ListView
                  query={currentView === 'search' ? searchQuery : undefined}
                  onAlbumSelect={(album) => navigateTo('detail', album)}
                  onPlaylistSelect={(playlist) => navigateTo('detail', playlist)}
                  onArtistSelect={(artist) => navigateTo('artist', artist)}
                  onSongSelect={(song) => {
                    if (isSongItem(song)) {
                      const artists = song.artists;
                      const albumId = song.album?.youtube_browse_id;
                      window.electronAPI.play(song.youtube_video_id, 'SONG', undefined, artists, albumId);
                    }
                  }}
                  onSearch={(query) => navigateTo('search', null, query)}
                  onBack={goBack}
                  searchResults={searchResults}
                  onResultsChange={setSearchResults}
                />
              </ViewWrapper>
            </motion.div>
          )}

          {/* Music Detail (Album/Playlist) */}
          {currentView === 'detail' && selectedItem && (
            <motion.div
              key={`detail-${getBrowseId(selectedItem) || getPlaylistId(selectedItem)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10"
            >
              <ViewWrapper>
                <MusicDetailView
                  id={(isPlaylistItem(selectedItem) || isRadioItem(selectedItem) ? getPlaylistId(selectedItem) : getBrowseId(selectedItem)) || getBrowseId(selectedItem) || getPlaylistId(selectedItem) || ''}
                  type={selectedItem.type as 'ALBUM' | 'PLAYLIST'}
                  initialItem={selectedItem}
                  onBack={goBack}
                  onPlaySong={(song: MusicItem) => {
                    if (isSongItem(song)) {
                      // Get artists from song or fallback to album/playlist artist
                      const selectedArtists = (isSongItem(selectedItem) || isAlbumItem(selectedItem)) ? selectedItem.artists : [];
                      const artists = (song.artists && song.artists.length > 0) ? song.artists : selectedArtists;
                      // Get albumId if it's an album context
                      const albumId = isAlbumItem(selectedItem) ? (getBrowseId(selectedItem) || getPlaylistId(selectedItem)) : undefined;
                      window.electronAPI.play(
                        song.youtube_video_id,
                        'SONG',
                        song.youtube_playlist_id || (isPlaylistItem(selectedItem) || isRadioItem(selectedItem) ? getPlaylistId(selectedItem) : getBrowseId(selectedItem)),
                        artists,
                        albumId
                      );
                    }
                  }}
                  onNavigateToArtist={(artistId) => navigateTo('artist', { type: 'ARTIST', title: '', thumbnails: [], youtube_browse_id: artistId })}
                />
              </ViewWrapper>
            </motion.div>
          )}

          {/* Artist Detail */}
          {currentView === 'artist' && selectedItem && (
            <motion.div
              key={`artist-${getBrowseId(selectedItem)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10"
            >
              <ViewWrapper>
                <ArtistDetailView
                  id={getBrowseId(selectedItem) || ''}
                  initialItem={selectedItem}
                  onBack={goBack}
                  onPlaySong={(song: MusicItem) => {
                    if (isSongItem(song)) {
                      const artists: any[] = [];
                      const albumId = song.album?.youtube_browse_id;
                      window.electronAPI.play(
                        song.youtube_video_id,
                        'SONG',
                        undefined,
                        artists,
                        albumId
                      );
                    }
                  }}
                  onNavigateToItem={(item: MusicItem) => {
                    if (item.type === 'ARTIST') {
                      navigateTo('artist', item);
                    } else {
                      navigateTo('detail', item);
                    }
                  }}
                />
              </ViewWrapper>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player Layers (Full & Mini) */}
      <AnimatePresence mode="popLayout">
        {isPlayerOpen ? (
          <PlayerView
            onClose={() => setIsPlayerOpen(false)}
            onNavigateToAlbum={(albumItem) => {
              navigateTo('detail', albumItem);
              setIsPlayerOpen(false);
            }}
            onNavigateToArtist={(artistItem) => {
              navigateTo('artist', artistItem);
              setIsPlayerOpen(false);
            }}
          />
        ) : (
          <MiniPlayer
            key="player-mini"
            onClick={() => setIsPlayerOpen(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
