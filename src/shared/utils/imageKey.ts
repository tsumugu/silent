/**
 * Generates a stable and unique key for image caching.
 * Priority: browseId > playlistId > videoId > Metadata Hash
 */
export function getImageCacheKey(
    title: string,
    artist?: string,
    ids?: { browseId?: string; videoId?: string; playlistId?: string }
): string {
    // 1. YouTube Browse ID (Albums, Artists)
    if (ids?.browseId) return ids.browseId;

    // 2. Playlist ID
    if (ids?.playlistId) return ids.playlistId;

    // 3. Video ID (Songs)
    if (ids?.videoId) return ids.videoId;

    // 4. Fallback: Metadata-based hash (Deterministic)
    const t = (title || "").trim();
    const a = (artist || "").trim();

    if (!t && !a) return "unknown-asset";

    try {
        // Basic deterministic hash using Base64 of UTF-8 string
        const combined = `${t}|${a}`;
        let encoded: string;

        if (typeof btoa !== 'undefined') {
            // Browser / UI context
            encoded = btoa(unescape(encodeURIComponent(combined)));
        } else {
            // Node.js / Main context
            encoded = Buffer.from(combined).toString('base64');
        }

        // Prefix to differentiate from raw IDs and sanitize for potential filename usage
        return "key-" + encoded.substring(0, 20).replace(/[/+=]/g, '_');
    } catch (e) {
        console.warn('[ImageKey] Hash generation failed, using fallback:', e);
        return "key-fallback-" + (t.length + a.length);
    }
}
