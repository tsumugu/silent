import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { WindowControls } from './components/WindowControls';
import { PlayerView } from './components/PlayerView/PlayerView';
import { LibraryView } from './components/LibraryView/LibraryView';
import { AlbumDetailView } from './components/LibraryView/AlbumDetailView';
import { useMediaSession } from './hooks/useMediaSession';
import { PlaylistDetailView } from './components/LibraryView/PlaylistDetailView';
import { MiniPlayer } from './components/PlayerView/MiniPlayer';
import { ViewWrapper } from './components/common/ViewWrapper';

type ViewType = 'home' | 'album-detail' | 'playlist-detail';

export default function App() {
  // Initialize MediaSession listener
  useMediaSession();

  // Navigation Stack for Main Content (Library, Album Details, etc.)
  // Does NOT include Player
  const [viewStack, setViewStack] = useState<ViewType[]>(['home']);

  // Overlay State for Player
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  const currentView = viewStack[viewStack.length - 1];

  const navigateTo = useCallback((view: 'player' | ViewType, id: string | null = null) => {
    if (view === 'player') {
      setIsPlayerOpen(true);
    } else if (view === 'home') {
      // Reset stack to home, close player if open? 
      // User likely wants to go to Library root.
      setViewStack(['home']);
      setIsPlayerOpen(false);
    } else if (view === 'album-detail') {
      setSelectedAlbumId(id);
      setViewStack(prev => [...prev, 'album-detail']);
      // Don't auto-close player here, usually we navigate from library so player is likely closed or mini.
      // If we navigate from somewhere else, we might want to ensure underlying view is correct.
      setIsPlayerOpen(false);
    } else if (view === 'playlist-detail') {
      setSelectedPlaylistId(id);
      setViewStack(prev => [...prev, 'playlist-detail']);
      setIsPlayerOpen(false);
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
      setViewStack(prev => prev.slice(0, -1));
    }
  }, [isPlayerOpen, viewStack.length]);

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


          // ... (inside the component)

          {/* Home (Library) */}
          {(currentView === 'home' || viewStack.includes('home')) && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 ${currentView === 'home' ? 'block' : 'hidden'}`}
              // If detailed view is active, we might want to hide home strictly or keep it for perf
              // With opacity/z-index management.
              style={{
                zIndex: 0
              }}
            >
              <ViewWrapper>
                <LibraryView
                  onAlbumSelect={(album) => navigateTo('album-detail', album.id)}
                  onPlaylistSelect={(playlist) => navigateTo('playlist-detail', playlist.playlistId || playlist.browseId)}
                />
              </ViewWrapper>
            </motion.div>
          )}

          {/* Album Detail */}
          {currentView === 'album-detail' && selectedAlbumId && (
            <motion.div
              key="album-detail"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              className="absolute inset-0 z-10"
            >
              <ViewWrapper>
                <AlbumDetailView
                  albumId={selectedAlbumId}
                  onBack={goBack}
                  onPlaySong={(song) => {
                    window.electronAPI.play(song.videoId, 'SONG');
                    setIsPlayerOpen(true);
                  }}
                />
              </ViewWrapper>
            </motion.div>
          )}

          {/* Playlist Detail */}
          {currentView === 'playlist-detail' && selectedPlaylistId && (
            <motion.div
              key="playlist-detail"
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              className="absolute inset-0 z-10"
            >
              <ViewWrapper>
                <PlaylistDetailView
                  playlistId={selectedPlaylistId}
                  onBack={goBack}
                  onPlaySong={(song) => {
                    window.electronAPI.play(song.videoId, 'SONG');
                    setIsPlayerOpen(true);
                  }}
                />
              </ViewWrapper>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Player Overlay Layer */}
      <AnimatePresence>
        {isPlayerOpen && (
          <motion.div
            key="player"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50" // High z-index to cover everything
          >
            <PlayerView onClose={() => setIsPlayerOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player */}
      <AnimatePresence>
        {!isPlayerOpen && (
          <MiniPlayer
            onClick={() => setIsPlayerOpen(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
