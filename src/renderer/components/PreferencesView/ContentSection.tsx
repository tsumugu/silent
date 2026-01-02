import React from 'react';
import { AppSettings } from '../../../shared/types/settings';
import { useTranslation } from '../../hooks/useTranslation';

const LANGUAGE_TO_LOCATION: Record<string, string> = {
    en: 'US',
    ja: 'JP',
};

interface ContentSectionProps {
    settings: AppSettings;
    onUpdate: (partial: Partial<AppSettings>) => Promise<void>;
    onRestartPrompt: () => void;
}

const ContentSection: React.FC<ContentSectionProps> = ({ settings, onUpdate, onRestartPrompt }) => {
    const { t } = useTranslation();

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5 space-y-4">
            <div>
                <label className="text-white font-medium text-sm block mb-3">{t.content_language}</label>
                <select
                    value={settings.language}
                    onChange={(e) => {
                        const newLang = e.target.value;
                        const updates: Partial<AppSettings> = { language: newLang };
                        if (LANGUAGE_TO_LOCATION[newLang]) {
                            updates.location = LANGUAGE_TO_LOCATION[newLang];
                        }
                        onUpdate(updates);
                        onRestartPrompt();
                    }}
                    className="w-full bg-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none border border-white/5 focus:border-white/20 transition-colors"
                >
                    <option value="en" className="bg-zinc-900">English</option>
                    <option value="ja" className="bg-zinc-900">日本語 (Japanese)</option>
                </select>
                <p className="text-white/20 text-[10px] mt-2">
                    {t.content_language_desc}
                </p>
            </div>
        </div>
    );
};

export default ContentSection;
