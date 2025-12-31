import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WindowControls } from './components/WindowControls';
import { PlayerView } from './components/PlayerView/PlayerView';
import { ListView } from './components/LibraryView/ListView';
import { MusicDetailView } from './components/LibraryView/MusicDetailView';
import { useMediaSession } from './hooks/useMediaSession';
import { MiniPlayer } from './components/PlayerView/MiniPlayer';
import { ViewWrapper } from './components/common/ViewWrapper';

import { MusicItem } from '../shared/types/music';

type ViewType = 'home' | 'detail' | 'search';

export default function App() {
  // Initialize MediaSession listener
  useMediaSession();

  // Navigation Stack for Main Content (Library, Album Details, etc.)
  // Does NOT include Player
  const [viewStack, setViewStack] = useState<ViewType[]>(['home']);

  // Overlay State for Player
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState<MusicItem | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any>(null);

  const currentView = viewStack[viewStack.length - 1];

  const navigateTo = useCallback((
    view: 'player' | ViewType,
    item: MusicItem | null = null,
    query?: string
  ) => {
    console.log(`[App] Navigating to ${view}`, item ? `Item: ${item.title} (${item.type})` : '');

    if (view === 'player') {
      setIsPlayerOpen(true);
    } else if (view === 'search' && query !== undefined && query.trim().length >= 1) {
      setSearchQuery(query);
      setViewStack(prev => [...prev, 'search']);
      setIsPlayerOpen(false);
    } else if (view === 'home') {
      setViewStack(['home']);
      setIsPlayerOpen(false);
      setSelectedItem(null);
    } else if (view === 'detail') {
      if (item) {
        setSelectedItem(item);
        setViewStack(prev => [...prev, 'detail']);
        setIsPlayerOpen(false);
      }
    }
  }, []);

  const goBack = useCallback(() => {
    // If player is open, close it first (like a modal)
    if (isPlayerOpen) {
      setIsPlayerOpen(false);
      return;
    }

    // Otherwise navigate back in the stack
    if (viewStack.length > 1) {
      const poppedView = viewStack[viewStack.length - 1];

      // Clear search state when leaving search view
      if (poppedView === 'search') {
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

      {/* Main Content Layer */}
      <div
        className="absolute inset-0 z-0"
        style={{ display: isPlayerOpen ? 'none' : 'block' }}
      >
        <AnimatePresence mode="popLayout" initial={false}>


          {/* Home & Search Results (Unified ListView) */}
          {(currentView === 'home' || currentView === 'search' || (currentView === 'detail' && viewStack.includes('home'))) && (
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
                  onSongSelect={(song) => {
                    if (song.youtube_video_id) {
                      window.electronAPI.play(song.youtube_video_id, 'SONG');
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
              key={`detail-${selectedItem.youtube_browse_id || selectedItem.youtube_playlist_id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10"
            >
              <ViewWrapper>
                <MusicDetailView
                  id={(selectedItem.type === 'PLAYLIST' ? selectedItem.youtube_playlist_id : selectedItem.youtube_browse_id) || selectedItem.youtube_browse_id || selectedItem.youtube_playlist_id || ''}
                  type={selectedItem.type as 'ALBUM' | 'PLAYLIST'}
                  initialItem={selectedItem}
                  onBack={goBack}
                  onPlaySong={(song: MusicItem) => {
                    if (song.youtube_video_id) {
                      window.electronAPI.play(song.youtube_video_id, 'SONG');
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
          <PlayerView onClose={() => setIsPlayerOpen(false)} />
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
