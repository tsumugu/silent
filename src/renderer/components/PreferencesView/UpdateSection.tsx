import React, { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface UpdateSectionProps {
    currentVersion: string;
}

const UpdateSection: React.FC<UpdateSectionProps> = ({ currentVersion }) => {
    const { t } = useTranslation();
    const [updateStatus, setUpdateStatus] = useState<{
        loading: boolean;
        error: string | null;
        result: any | null;
    }>({
        loading: false,
        error: null,
        result: null
    });

    const checkUpdates = async () => {
        setUpdateStatus({ loading: true, error: null, result: null });
        try {
            const result = await window.electronAPI.checkForUpdates();
            setUpdateStatus({ loading: false, error: null, result });
        } catch (error) {
            console.error('[UpdateSection] Update check failed:', error);
            setUpdateStatus({ loading: false, error: 'Failed to check for updates.', result: null });
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <label className="text-white font-medium text-sm block">{t.software}</label>
                    <p className="text-white/30 text-xs mt-1">
                        Current Version: <span className="text-white/60">{currentVersion}</span>
                    </p>
                </div>
                <button
                    onClick={checkUpdates}
                    disabled={updateStatus.loading}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${updateStatus.loading
                            ? 'bg-white/5 text-white/20'
                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                        }`}
                >
                    {updateStatus.loading ? t.update_checking : t.update_check}
                </button>
            </div>

            {updateStatus.error && (
                <p className="text-red-400/80 text-xs mt-2">{updateStatus.error}</p>
            )}

            {updateStatus.result && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    {updateStatus.result.hasUpdate ? (
                        <div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-green-400 font-medium">
                                    {t.update_available(updateStatus.result.latestVersion)}
                                </span>
                                <a
                                    href={updateStatus.result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white/60 hover:text-white underline"
                                >
                                    {t.view_on_github}
                                </a>
                            </div>
                            {updateStatus.result.notes && (
                                <div className="mt-2 p-3 bg-black/20 rounded-lg max-h-32 overflow-y-auto">
                                    <pre className="text-[10px] text-white/40 whitespace-pre-wrap font-sans">
                                        {updateStatus.result.notes}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-white/30 text-xs text-center">Your version is up to date.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default UpdateSection;
