import React from 'react';
import { AppSettings } from '../../../shared/types/settings';
import { useTranslation } from '../../hooks/useTranslation';

interface LaunchSectionProps {
    settings: AppSettings;
    onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
}

const LaunchSection: React.FC<LaunchSectionProps> = ({ settings, onUpdate }) => {
    const { t } = useTranslation();

    const handleLaunchAtLoginToggle = async () => {
        await onUpdate({ launchAtLogin: !settings.launchAtLogin });
    };

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 flex items-center justify-between">
            <label className="text-white font-medium text-sm">{t.launch_at_login}</label>
            <button
                onClick={handleLaunchAtLoginToggle}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${settings.launchAtLogin ? 'bg-white/20' : 'bg-white/5'
                    }`}
                aria-label="Toggle launch at login"
            >
                <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white/80 transition-transform duration-200 ${settings.launchAtLogin ? 'translate-x-7' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
};

export default LaunchSection;
