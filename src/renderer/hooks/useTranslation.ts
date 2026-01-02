import { useState, useEffect } from 'react';
import { Language, translations, Translations } from '../../shared/i18n';

export const useTranslation = () => {
    const [lang, setLang] = useState<Language>('en');

    useEffect(() => {
        // Initial load
        window.electronAPI.getSettings().then((settings) => {
            if (settings.language) {
                setLang(settings.language as Language);
            }
        });

        // Listen for changes
        const cleanup = window.electronAPI.onSettingsChanged((settings) => {
            if (settings.language) {
                setLang(settings.language as Language);
            }
        });

        return cleanup;
    }, []);

    const t = translations[lang] || translations.en;

    return { t, lang };
};
