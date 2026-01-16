/**
 * Generates a YouTube Music URL for sharing.
 * 
 * @param videoId The ID of the video/song
 * @param listId Optional ID of the album or playlist
 * @returns A formatted music.youtube.com URL
 */
export const getShareUrl = (videoId: string, listId?: string): string => {
    let url = `https://music.youtube.com/watch?v=${videoId}`;
    if (listId) {
        // If listId starts with VL, it's a browse ID for a playlist/album.
        // YouTube watch URLs usually expect the underlying playlist ID (often stripped of VL).
        const normalizedListId = listId.startsWith('VL') ? listId.substring(2) : listId;
        url += `&list=${normalizedListId}`;
    }
    return url;
};

/**
 * Generates a YouTube Music URL for a collection (Album or Playlist).
 * 
 * @param id The ID of the collection (browseId or playlistId)
 * @param type The type of collection
 * @returns A formatted music.youtube.com URL
 */
export const getCollectionShareUrl = (id: string, type: 'ALBUM' | 'PLAYLIST'): string => {
    if (type === 'ALBUM') {
        return `https://music.youtube.com/browse/${id}`;
    } else {
        // For playlists, we use the playlist?list= format
        const normalizedListId = id.startsWith('VL') ? id.substring(2) : id;
        return `https://music.youtube.com/playlist?list=${normalizedListId}`;
    }
};
