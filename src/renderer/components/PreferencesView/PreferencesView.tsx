import React, { useEffect, useState } from 'react';
import { AppSettings } from '../../../shared/types/settings';
import GeneralSection from './GeneralSection';
import MenuBarSection from './MenuBarSection';

const PreferencesView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Load settings
    window.electronAPI.getSettings().then((loadedSettings: AppSettings) => {
      setSettings(loadedSettings);
      setLoading(false);
    });

    // Listen for settings changes
    const cleanup = window.electronAPI.onSettingsChanged((newSettings: AppSettings) => {
      setSettings(newSettings);
    });

    return cleanup;
  }, []);

  const handleClose = () => {
    window.electronAPI.closeWindow();
  };

  const handleSettingsUpdate = async (partial: Partial<AppSettings>) => {
    await window.electronAPI.updateSettings(partial);
  };

  if (loading || !settings) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <p className="text-white/40">Loading...</p>
      </div>
    );
  }

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
        <h2 className="text-white/60 text-sm font-medium">Preferences</h2>
        <div className="w-14" /> {/* Spacer for centering */}
      </div>

      {/* Content area: Consolidated view */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="space-y-8 py-4">
          {/* General Section */}
          <section>
            <h3 className="text-white/40 text-[10px] uppercase tracking-widest font-bold ml-1 mb-4">General</h3>
            <GeneralSection settings={settings} onUpdate={handleSettingsUpdate} />
          </section>

          {/* Menu Bar Section - Only show header if settings exist, implementation of visibility can be inside MenuBarSection if preferred, but here we show it if the component doesn't return null */}
          <section>
            <h3 className="text-white/40 text-[10px] uppercase tracking-widest font-bold ml-1 mb-4">Menu Bar</h3>
            <MenuBarSection settings={settings} onUpdate={handleSettingsUpdate} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default PreferencesView;
