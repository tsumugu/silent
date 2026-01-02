import React, { useState } from 'react';
import { AppSettings, DisplayMode } from '../../../shared/types/settings';
import { useTranslation } from '../../hooks/useTranslation';

interface DisplayModeSectionProps {
    settings: AppSettings;
    onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
    onRestartPrompt: () => void;
}

const DisplayModeSection: React.FC<DisplayModeSectionProps> = ({ settings, onUpdate, onRestartPrompt }) => {
    const { t } = useTranslation();
    const [pendingDisplayMode, setPendingDisplayMode] = useState<DisplayMode | null>(null);

    const handleDisplayModeChange = async (newMode: DisplayMode) => {
        if (newMode === settings.displayMode) {
            setPendingDisplayMode(null);
            return;
        }

        await onUpdate({ displayMode: newMode });
        setPendingDisplayMode(newMode);
        onRestartPrompt();
    };

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5">
            <div className="flex items-center space-x-3">
                <button
                    onClick={() => handleDisplayModeChange('dock')}
                    className={`px-4 py-2 rounded-lg transition-colors ${settings.displayMode === 'dock'
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                >
                    {t.dock_app}
                </button>
                <button
                    onClick={() => handleDisplayModeChange('menuBar')}
                    className={`px-4 py-2 rounded-lg transition-colors ${settings.displayMode === 'menuBar'
                        ? 'bg-white/20 text-white'
                        : 'bg-white/5 text-white/40 hover:bg-white/10'
                        }`}
                >
                    {t.menu_bar_app}
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
                    {t.restart_required_notice}
                </p>
            )}
        </div>
    );
};

export default DisplayModeSection;
