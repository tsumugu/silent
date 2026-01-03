import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const AboutView: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string>('');
  const [isHovered, setIsHovered] = useState(false);

  React.useEffect(() => {
    window.electronAPI.getVersion().then(setVersion);
  }, []);

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      {/* Custom title bar with draggable area */}
      <div className="draggable flex-none h-14 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <div
            className="flex space-x-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-gray-500/60 hover:bg-gray-500/80 transition-colors flex items-center justify-center group"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              aria-label="Close"
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
              className="w-3 h-3 rounded-full bg-gray-500/20 cursor-default"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              disabled
            />
            <button
              className="w-3 h-3 rounded-full bg-gray-500/20 cursor-default"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              disabled
            />
          </div>
        </div>
        <h2 className="text-white/60 text-sm font-medium">{t.about}</h2>
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
          <p className="text-white/40 text-sm mb-8">{t.version} {version}</p>

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
