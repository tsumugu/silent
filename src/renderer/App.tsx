import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WindowControls } from './components/WindowControls';
import { PlayerView } from './components/PlayerView/PlayerView';
import { ListView } from './components/LibraryView/ListView';
import { MusicDetailView } from './components/LibraryView/MusicDetailView';
import { useMediaSession } from './hooks/useMediaSession';
import { MiniPlayer } from './components/PlayerView/MiniPlayer';
import { ViewWrapper } from './components/common/ViewWrapper';
import { useNavigationStore, ViewType } from './store/navigationStore';

import {
  MusicItem,
  isAlbumItem,
  isArtistItem,
  isPlaylistItem,
  isSongItem,
  isRadioItem
} from '../shared/types/music';

import { ArtistDetailView } from './components/LibraryView/ArtistDetailView';

export default function App() {
  // Initialize MediaSession listener
  useMediaSession();

  // Get navigation state from store
  const {
    viewStack,
    isPlayerOpen,
    searchQuery,
    searchResults,
    pushView,
    popView,
    resetToHome,
    openPlayer,
    closePlayer,
    setSearchQuery,
    setSearchResults
  } = useNavigationStore();

  // Compute current view and item from viewStack
  const currentEntry = viewStack[viewStack.length - 1];
  const currentView = currentEntry?.view || 'home';
  const selectedItem = currentEntry?.item || null;

  const navigateTo = useCallback((
    view: 'player' | ViewType,
    item: MusicItem | null = null,
    query?: string
  ) => {
    if (view === 'player') {
      openPlayer();
    } else if (view === 'search' && query !== undefined && query.trim().length >= 1) {
      setSearchQuery(query);
      pushView('search');
    } else if (view === 'home') {
      resetToHome();
    } else {
      pushView(view, item);
    }
  }, [pushView, resetToHome, openPlayer, setSearchQuery]);

  const goBack = useCallback(() => {
    popView();
  }, [popView]);

  // Handle scroll to switch between Player and Main View
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Ignore small scrolls
      if (Math.abs(e.deltaY) < 20) return;

      if (isPlayerOpen) {
        // If Player is open, scroll DOWN to close it
        if (e.deltaY < -50) {
          closePlayer();
        }
      }
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isPlayerOpen, closePlayer]);

  // Handle keyboard shortcuts (Esc to close player only, not to go back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Always prevent default / stop propagation for Escape to avoid
        // accidental back navigation or other system behaviors.
        // Using capture: true in the listener ensures we catch this before anyone else.
        e.preventDefault();
        e.stopPropagation();

        if (isPlayerOpen) {
          closePlayer();
        } else if (searchQuery) {
          // If player is not open but search is active, clear search
          setSearchQuery('');
          setSearchResults(null);

          // Also blur any active input
          if (document.activeElement instanceof HTMLInputElement) {
            document.activeElement.blur();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isPlayerOpen, closePlayer]);

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
                  onSongSelect={(item) => {
                    window.electronAPI.play(item);
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
              key={`detail-${(isAlbumItem(selectedItem) || isArtistItem(selectedItem))
                ? selectedItem.youtube_browse_id
                : (isPlaylistItem(selectedItem) || isRadioItem(selectedItem))
                  ? selectedItem.youtube_playlist_id
                  : ''
                }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10"
            >
              <ViewWrapper>
                <MusicDetailView
                  id={
                    (isPlaylistItem(selectedItem) || isRadioItem(selectedItem))
                      ? selectedItem.youtube_playlist_id
                      : (isAlbumItem(selectedItem) || isArtistItem(selectedItem))
                        ? selectedItem.youtube_browse_id
                        : ''
                  }
                  type={selectedItem.type as 'ALBUM' | 'PLAYLIST'}
                  initialItem={selectedItem}
                  onBack={goBack}
                  onPlaySong={(song: MusicItem) => {
                    window.electronAPI.play(song, (isPlaylistItem(selectedItem) || isRadioItem(selectedItem))
                      ? selectedItem.youtube_playlist_id
                      : (isAlbumItem(selectedItem) || isArtistItem(selectedItem))
                        ? selectedItem.youtube_browse_id
                        : undefined);
                  }}
                  onNavigateToArtist={(artistId) => navigateTo('artist', { type: 'ARTIST', title: '', thumbnails: [], youtube_browse_id: artistId })}
                />
              </ViewWrapper>
            </motion.div>
          )}

          {/* Artist Detail */}
          {currentView === 'artist' && selectedItem && (
            <motion.div
              key={`artist-${(isAlbumItem(selectedItem) || isArtistItem(selectedItem))
                ? selectedItem.youtube_browse_id
                : ''
                }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10"
            >
              <ViewWrapper>
                <ArtistDetailView
                  id={
                    (isAlbumItem(selectedItem) || isArtistItem(selectedItem))
                      ? selectedItem.youtube_browse_id
                      : ''
                  }
                  initialItem={selectedItem}
                  onBack={goBack}
                  onPlaySong={(song: MusicItem) => {
                    window.electronAPI.play(song);
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
            onClose={closePlayer}
            onNavigateToAlbum={(albumItem) => {
              navigateTo('detail', albumItem);
              closePlayer();
            }}
            onNavigateToArtist={(artistItem) => {
              navigateTo('artist', artistItem);
              closePlayer();
            }}
          />
        ) : (
          <MiniPlayer
            key="player-mini"
            onClick={openPlayer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
