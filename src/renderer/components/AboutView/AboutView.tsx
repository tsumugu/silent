import React from 'react';

const AboutView: React.FC = () => {
  const version = '1.0.227';

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Custom title bar with draggable area */}
      <div className="draggable flex-none h-14 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-2">
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-gray-500/60 hover:bg-gray-500/80 transition-colors"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              aria-label="Close"
            />
            <div className="w-3 h-3 rounded-full bg-gray-500/60" />
            <div className="w-3 h-3 rounded-full bg-gray-500/60" />
          </div>
        </div>
        <h2 className="text-white/60 text-sm font-medium">About</h2>
        <div className="w-14" /> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          {/* App icon placeholder */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
            <span className="text-white/60 text-4xl">
              ♫
            </span>
          </div>

          {/* App name */}
          <h1 className="text-white font-semibold text-2xl mb-2">Silent</h1>

          {/* Version */}
          <p className="text-white/40 text-sm mb-8">Version {version}</p>

          {/* Copyright */}
          <p className="text-white/30 text-xs mb-1">© 2025 tsumugu</p>

          {/* License */}
          <p className="text-white/30 text-xs">MIT License</p>
        </div>
      </div>
    </div>
  );
};

export default AboutView;
