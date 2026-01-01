import React, { useState } from 'react';
import { AppSettings, DisplayMode } from '../../../shared/types/settings';

interface GeneralSectionProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
}

const GeneralSection: React.FC<GeneralSectionProps> = ({ settings, onUpdate }) => {
  const [pendingDisplayMode, setPendingDisplayMode] = useState<DisplayMode | null>(null);

  const handleDisplayModeChange = async (newMode: DisplayMode) => {
    if (newMode === settings.displayMode) {
      setPendingDisplayMode(null);
      return;
    }

    // Save the setting first
    await onUpdate({ displayMode: newMode });
    setPendingDisplayMode(newMode);

    // Show restart dialog after a short delay
    setTimeout(() => {
      const isDevelopment = window.electronAPI.platform === 'darwin' &&
                           window.location.hostname === 'localhost';

      const message = isDevelopment
        ? 'Display mode changed. Silent needs to restart for this change to take effect.\n\nThe app will quit now. Please restart it manually from your terminal or IDE.'
        : 'Display mode changed. Silent needs to restart for this change to take effect.\n\nRestart now?';

      const shouldRestart = confirm(message);

      if (shouldRestart) {
        window.electronAPI.requestRestart();
      }
      // Keep the warning visible even if user declines
    }, 100);
  };

  const handleLaunchAtLoginToggle = async () => {
    await onUpdate({ launchAtLogin: !settings.launchAtLogin });
  };

  return (
    <div className="pt-4">
      <div className="space-y-6">
        {/* Display Mode */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5">
          <label className="text-white font-medium text-sm block mb-3">Display Mode</label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleDisplayModeChange('dock')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                settings.displayMode === 'dock'
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              Dock App
            </button>
            <button
              onClick={() => handleDisplayModeChange('menuBar')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                settings.displayMode === 'menuBar'
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              Menu Bar App
            </button>
          </div>
          {pendingDisplayMode && pendingDisplayMode !== settings.displayMode && (
            <p className="text-yellow-400/80 text-xs mt-2 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Restart required to apply changes
            </p>
          )}
        </div>

        {/* Launch at Login */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 flex items-center justify-between">
          <label className="text-white font-medium text-sm">Launch at Login</label>
          <button
            onClick={handleLaunchAtLoginToggle}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              settings.launchAtLogin ? 'bg-white/20' : 'bg-white/5'
            }`}
            aria-label="Toggle launch at login"
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white/80 transition-transform duration-200 ${
                settings.launchAtLogin ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSection;
