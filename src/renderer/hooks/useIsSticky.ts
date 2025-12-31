import { useState, useEffect, RefObject } from 'react';

export const useIsSticky = <T extends HTMLElement>(ref: RefObject<T | null>) => {
    const [isSticky, setIsSticky] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // The threshold trick for sticky detection:
        // Root margin top: -1px means the intersection happens when the element is 1px above the top.
        const observer = new IntersectionObserver(
            ([e]) => {
                // Determine if stuck: ratio < 1 (pushing against the 1px margin)
                // AND it must be at the top of the viewport (top <= 1).
                // This prevents elements below the fold (ratio 0 but top > 1) from being marked as sticky.
                setIsSticky(e.intersectionRatio < 1 && e.boundingClientRect.top <= 1);
            },
            { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);

    return isSticky;
};
