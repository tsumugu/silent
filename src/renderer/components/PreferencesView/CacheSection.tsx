import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const CacheSection: React.FC = () => {
    const { t } = useTranslation() as { t: any };
    const [cacheSize, setCacheSize] = useState<string>('...');
    const [clearing, setClearing] = useState(false);

    const updateCacheSize = async () => {
        try {
            const sizeInBytes = await window.electronAPI.getCacheSize();
            const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
            setCacheSize(`${sizeInMB} MB`);
        } catch (err) {
            console.error('[CacheSection] Failed to get cache size:', err);
            setCacheSize('Error');
        }
    };

    useEffect(() => {
        updateCacheSize();
    }, []);

    const handleClearCache = async () => {
        if (!confirm(t.clear_cache_confirm || 'Are you sure you want to clear the cache? This will reset all temporarily saved metadata and images.')) return;

        setClearing(true);
        try {
            await window.electronAPI.clearCache();
            await updateCacheSize();
        } catch (err) {
            console.error('[CacheSection] Failed to clear cache:', err);
        } finally {
            setClearing(false);
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5">
            <div className="flex items-center justify-between">
                <div>
                    <label className="text-white font-medium text-sm block">{t.cache_management || 'Cache Management'}</label>
                    <p className="text-white/30 text-xs mt-1">
                        {t.cache_size || 'Current Cache Size'}: <span className="text-white/60">{cacheSize}</span>
                    </p>
                </div>
                <button
                    onClick={handleClearCache}
                    disabled={clearing}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${clearing
                        ? 'bg-white/5 text-white/20'
                        : 'bg-red-500/10 text-red-500/80 hover:bg-red-500/20'
                        }`}
                >
                    {clearing ? t.clearing || 'Clearing...' : t.clear_cache || 'Clear Cache'}
                </button>
            </div>
            <p className="text-white/20 text-[10px] mt-3 leading-relaxed">
                {t.cache_description || 'Persistent cache speeds up loading times for detailed pages and artwork. Metadata is cached for 24 hours, and images are cached for 3 days.'}
            </p>
        </div>
    );
};

export default CacheSection;
