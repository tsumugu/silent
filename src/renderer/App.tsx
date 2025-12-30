import React from 'react';
import { WindowControls } from './components/WindowControls';
import { PlayerView } from './components/PlayerView/PlayerView';
import { useMediaSession } from './hooks/useMediaSession';

export default function App() {
  // Initialize MediaSession listener
  useMediaSession();

  return (
    <div className="w-full h-screen">
      <div className="draggable absolute top-0 left-0 right-0 h-10 z-50" />
      <WindowControls />
      <PlayerView />
    </div>
  );
}
