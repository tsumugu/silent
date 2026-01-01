import React from 'react';
import { AppSettings } from '../../../shared/types/settings';

interface MenuBarSectionProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
}

const MenuBarSection: React.FC<MenuBarSectionProps> = ({ settings, onUpdate }) => {

  const handleTraySettingToggle = (key: keyof typeof settings.tray) => {
    onUpdate({
      tray: {
        ...settings.tray,
        [key]: !settings.tray[key]
      }
    });
  };

  return (
    <div>
      <div className="space-y-4">
        {/* Show Track Title */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 flex items-center justify-between">
          <div className="flex-1">
            <label className="text-white font-medium text-sm block">Show track title in menu bar</label>
            <p className="text-white/30 text-xs mt-1">
              Display currently playing track in the menu bar tooltip
            </p>
          </div>
          <button
            onClick={() => handleTraySettingToggle('showTrackTitle')}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings.tray.showTrackTitle ? 'bg-white/20' : 'bg-white/5'
              }`}
            aria-label="Toggle show track title"
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white/80 transition-transform duration-200 ${settings.tray.showTrackTitle ? 'translate-x-7' : 'translate-x-1'
                }`}
            />
          </button>
        </div>


        {/* Enable Marquee Scrolling */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 flex items-center justify-between">
          <div className="flex-1">
            <label className="text-white font-medium text-sm block">Enable marquee scrolling</label>
            <p className="text-white/30 text-xs mt-1">
              Scroll long track titles in menu bar
            </p>
          </div>
          <button
            onClick={() => handleTraySettingToggle('enableScrolling')}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings.tray.enableScrolling ? 'bg-white/20' : 'bg-white/5'
              }`}
            aria-label="Toggle scrolling"
          >
            <div
              className={`absolute top-1 w-4 h-4 rounded-full bg-white/80 transition-transform duration-200 ${settings.tray.enableScrolling ? 'translate-x-7' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuBarSection;
