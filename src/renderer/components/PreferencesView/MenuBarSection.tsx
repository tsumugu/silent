import React from 'react';
import { AppSettings } from '../../../shared/types/settings';
import { useTranslation } from '../../hooks/useTranslation';

interface MenuBarSectionProps {
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
}

const MenuBarSection: React.FC<MenuBarSectionProps> = ({ settings, onUpdate }) => {
  const { t } = useTranslation();

  const handleToggle = (key: keyof AppSettings['tray']) => {
    onUpdate({
      tray: {
        ...settings.tray,
        [key]: !settings.tray[key],
      },
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 space-y-4">
      {/* Show Track Title */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-white font-medium text-sm block">{t.show_track_title}</label>
        </div>
        <button
          onClick={() => handleToggle('showTrackTitle')}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings.tray.showTrackTitle ? 'bg-white/20' : 'bg-white/5'
            }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white/80 transition-transform duration-200 ${settings.tray.showTrackTitle ? 'translate-x-7' : 'translate-x-1'
              }`}
          />
        </button>
      </div>

      {/* Enable Scrolling */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-white font-medium text-sm block">{t.enable_scrolling}</label>
        </div>
        <button
          onClick={() => handleToggle('enableScrolling')}
          className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings.tray.enableScrolling ? 'bg-white/20' : 'bg-white/5'
            }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white/80 transition-transform duration-200 ${settings.tray.enableScrolling ? 'translate-x-7' : 'translate-x-1'
              }`}
          />
        </button>
      </div>
    </div>
  );
};

export default MenuBarSection;
