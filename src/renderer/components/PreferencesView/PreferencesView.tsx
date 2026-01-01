import React, { useEffect, useState } from 'react';
import { AppSettings } from '../../../shared/types/settings';
import GeneralSection from './GeneralSection';
import MenuBarSection from './MenuBarSection';

type Tab = 'general' | 'menubar';

const PreferencesView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('general');

  useEffect(() => {
    // Load settings
    window.electronAPI.getSettings().then((loadedSettings: AppSettings) => {
      setSettings(loadedSettings);
      setLoading(false);
    });

    // Listen for settings changes
    const cleanup = window.electronAPI.onSettingsChanged((newSettings: AppSettings) => {
      setSettings(newSettings);
      // If switched to Dock mode while on Menu Bar tab, switch to General tab
      if (newSettings.displayMode === 'dock' && activeTab === 'menubar') {
        setActiveTab('general');
      }
    });

    return cleanup;
  }, [activeTab]);

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
        <h2 className="text-white/60 text-sm font-medium">Preferences</h2>
        <div className="w-14" /> {/* Spacer for centering */}
      </div>

      {/* Tab toolbar - macOS style */}
      <div className="flex-none flex justify-center items-center space-x-1 py-4 px-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg transition-all ${activeTab === 'general'
            ? 'bg-white/10'
            : 'hover:bg-white/5'
            }`}
        >
          <svg className={`w-7 h-7 mb-1 transition-colors ${activeTab === 'general' ? 'text-white' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className={`text-xs transition-colors ${activeTab === 'general' ? 'text-white' : 'text-white/40'}`}>General</span>
        </button>

        <button
          onClick={() => settings.displayMode === 'menuBar' && setActiveTab('menubar')}
          disabled={settings.displayMode !== 'menuBar'}
          className={`flex flex-col items-center justify-center w-20 h-20 rounded-lg transition-all ${settings.displayMode !== 'menuBar'
            ? 'opacity-30 cursor-not-allowed'
            : activeTab === 'menubar'
              ? 'bg-white/10'
              : 'hover:bg-white/5'
            }`}
        >
          <svg className={`w-7 h-7 mb-1 transition-colors ${activeTab === 'menubar' && settings.displayMode === 'menuBar' ? 'text-white' : 'text-white/40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className={`text-xs transition-colors ${activeTab === 'menubar' && settings.displayMode === 'menuBar' ? 'text-white' : 'text-white/40'}`}>Menu Bar</span>
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'general' && (
          <GeneralSection settings={settings} onUpdate={handleSettingsUpdate} />
        )}
        {activeTab === 'menubar' && (
          <MenuBarSection settings={settings} onUpdate={handleSettingsUpdate} />
        )}
      </div>
    </div>
  );
};

export default PreferencesView;
