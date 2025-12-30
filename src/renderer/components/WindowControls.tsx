import React, { useState, useEffect } from 'react';

export function WindowControls() {
  const [isHovered, setIsHovered] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    window.electronAPI.onFullscreenChange((fullscreen) => {
      setIsFullscreen(fullscreen);
    });

    // Track mouse position for fullscreen hover
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  const handleMinimize = () => {
    window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI.maximizeWindow();
  };

  // In fullscreen, only show when cursor is near top
  if (isFullscreen && mouseY > 50) {
    return null;
  }

  return (
    <div
      className="draggable fixed top-4 left-4 flex items-center gap-2 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleClose}
        className="w-3 h-3 rounded-full bg-gray-500/60 hover:bg-gray-500/80 transition-colors flex items-center justify-center group"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {isHovered && (
          <svg
            className="w-1.5 h-1.5 text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
            viewBox="0 0 43 43"
            stroke="currentColor"
            strokeWidth="0"
            fill="currentColor"
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M1.05001 36.35L36.35 1.05C37.75 -0.35 39.95 -0.35 41.35 1.05L41.45 1.15C42.85 2.55 42.85 4.75 41.45 6.15L6.15001 41.45C4.75001 42.85 2.55001 42.85 1.15001 41.45L1.05001 41.35C-0.249988 39.95 -0.249988 37.75 1.05001 36.35Z" />
            <path fillRule="evenodd" clipRule="evenodd" d="M6.15 1.05001L41.45 36.35C42.85 37.75 42.85 39.95 41.45 41.35L41.35 41.45C39.95 42.85 37.75 42.85 36.35 41.45L1.05 6.15001C-0.35 4.75001 -0.35 2.55001 1.05 1.15001L1.15 1.05001C2.55 -0.249988 4.75 -0.249988 6.15 1.05001Z" />
          </svg>
        )}
      </button>

      <button
        onClick={handleMinimize}
        className="w-3 h-3 rounded-full bg-gray-500/60 hover:bg-gray-500/80 transition-colors flex items-center justify-center group"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {isHovered && (
          <svg
            className="w-2 h-[1px] text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
            viewBox="0 0 57 8"
            stroke="currentColor"
            strokeWidth="0"
            fill="currentColor"
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M3.5 0H53.4C55.3 0 56.9 1.6 56.9 3.5V3.6C56.9 5.5 55.3 7.1 53.4 7.1H3.5C1.6 7.1 0 5.5 0 3.6V3.5C0 1.6 1.5 0 3.5 0Z" />
          </svg>
        )}
      </button>

      <button
        onClick={handleMaximize}
        className="w-3 h-3 rounded-full bg-gray-500/60 hover:bg-gray-500/80 transition-colors flex items-center justify-center group"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {isHovered && (
          <svg
            className="w-1.5 h-1.5 text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
            viewBox="0 0 44 44"
            stroke="currentColor"
            strokeWidth="0"
            fill="currentColor"
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M10.1 0H36.8C40.4 0 43.3 2.9 43.3 6.5V33.2L10.1 0ZM33.3 43.7H6.5C2.9 43.7 0 40.8 0 37.2V10.4L33.3 43.7Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
