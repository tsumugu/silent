import React from 'react';
import { AppSettings } from '../../../shared/types/settings';
import { useTranslation } from '../../hooks/useTranslation';

interface AppearanceSectionProps {
    settings: AppSettings;
    onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
}

const AppearanceSection: React.FC<AppearanceSectionProps> = ({ settings, onUpdate }) => {
    const { t } = useTranslation();

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        onUpdate({ backgroundOpacity: value });
    };

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 space-y-4">
            <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">{t.player_opacity}</span>
                    <span className="text-white/40 text-xs font-mono">{Math.round(settings.backgroundOpacity * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.backgroundOpacity}
                    onChange={handleOpacityChange}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200 transition-all"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                />
            </div>
        </div>
    );
};

export default AppearanceSection;
