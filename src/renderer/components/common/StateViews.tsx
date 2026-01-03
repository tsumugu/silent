import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
    const { t } = useTranslation();
    const displayMessage = message || t.loading;

    return (
        <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="relative">
                <div className="w-12 h-12 border-2 border-white/5 border-t-white/40 rounded-full animate-spin" />
                <div className="absolute inset-0 blur-sm w-12 h-12 border-2 border-transparent border-t-white/20 rounded-full animate-spin" />
            </div>
            <span className="text-white/30 text-xs font-medium uppercase tracking-[0.2em]">{displayMessage}</span>
        </div>
    );
};

export const ErrorState: React.FC<{ error: string }> = ({ error }) => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center ring-1 ring-red-500/20">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div>
                <h3 className="text-white font-bold text-lg mb-2">{t.error_title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{error}</p>
            </div>
        </div>
    );
};

export const EmptyState: React.FC<{ message: string; subMessage?: string }> = ({ message, subMessage }) => (
    <div className="flex flex-col items-center justify-center py-32 gap-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center ring-1 ring-white/10">
            <svg className="w-10 h-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
        <div>
            <h3 className="text-white font-bold text-xl mb-2">{message}</h3>
            {subMessage && <p className="text-white/40 text-sm leading-relaxed">{subMessage}</p>}
        </div>
    </div>
);
