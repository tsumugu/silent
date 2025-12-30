import React from 'react';

interface ViewWrapperProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Common wrapper for all main views (Library, AlbumDetail, PlaylistDetail).
 * Centralizes common layout (padding top) and background styling.
 * 
 * Current styling: Transparent background, 10 unit top padding for window drag area.
 */
export const ViewWrapper: React.FC<ViewWrapperProps> = ({ children, className = '' }) => {
    return (
        // Common view styles
        // - w-full h-full: Fill the motion.div container
        // - pt-10: Space for window controls/drag area
        // - bg-transparent: Explicitly transparent (as requested to match LibraryView)
        // - No backdrop-blur: As requested
        <div className={`w-full h-full pt-10 ${className}`}>
            {children}
        </div>
    );
};
