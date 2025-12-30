import YTMusic from 'ytmusic-api';
import { session } from 'electron';

export class YTMusicService {
    private ytmusic: YTMusic;
    private isInitialized = false;

    constructor() {
        this.ytmusic = new YTMusic();
    }

    async initialize(force = false) {
        if (this.isInitialized && !force) return;

        try {
            // Get cookies for the entire youtube.com domain
            const cookies = await session.defaultSession.cookies.get({ domain: '.youtube.com' });
            const musicCookies = await session.defaultSession.cookies.get({ url: 'https://music.youtube.com' });

            const allCookies = [...cookies, ...musicCookies];
            // Remove duplicates by name
            const uniqueCookies = Array.from(new Map(allCookies.map(c => [c.name, c])).values());

            const cookieString = uniqueCookies.map(c => `${c.name}=${c.value}`).join('; ');

            // Initialize the API with cookies
            await this.ytmusic.initialize({ cookies: cookieString });

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize YTMusicService:', error);
        }
    }

    async getHome() {
        await this.initialize();
        const sections = await this.ytmusic.getHomeSections();
        return sections;
    }

    async getHomeAlbums() {
        await this.initialize();

        const sections = await this.ytmusic.getHomeSections();

        // Filter sections that look like album lists
        // Titles can be "Albums for you", "Quick picks", "New releases", etc.
        const albumSections = sections.filter(s =>
            s.title?.toLowerCase().includes('album') ||
            s.title?.toLowerCase().includes('pick') ||
            s.title?.toLowerCase().includes('recent') ||
            s.title?.toLowerCase().includes('home')
        );

        const albums = [];
        for (const section of albumSections) {
            if (section.contents) {
                for (const item of section.contents) {
                    // Map to a consistent format
                    if (item.type === 'ALBUM' || (item.type === 'SONG' && item.album)) {
                        albums.push({
                            id: item.type === 'ALBUM' ? (item as any).albumId : item.album?.albumId,
                            name: item.type === 'ALBUM' ? (item as any).name : item.album?.name,
                            artist: item.artist?.name,
                            thumbnails: item.thumbnails,
                            type: item.type
                        });
                    }
                }
            }
        }

        const uniqueAlbums = Array.from(new Map(albums.map(a => [a.id, a])).values());
        return uniqueAlbums;
    }

    /**
     * Fetch album details. If the response does not contain track information,
     * we ensure a `tracks` array is present (empty) so the UI can safely iterate.
     * Additional logging is added for debugging.
     */
    async getAlbumDetails(albumId: string) {
        console.log(`[YTMusicService] Fetching album: ${albumId}`);
        await this.initialize();

        try {
            return await this.ytmusic.getAlbum(albumId);
        } catch (e) {
            console.error(`[YTMusicService] Failed to fetch album ${albumId}`, e);
            return { id: albumId, title: 'Unknown Album', tracks: [] };
        }
    }
    // async getAlbumDetails(albumId: string) {
    //     console.log(`[YTMusicService] Fetching album: ${albumId}`);
    //     await this.initialize();

    //     const album = await this.ytmusic.getAlbum(albumId);
    //     console.log(`[YTMusicService] Base album data:`, {
    //         id: (album as any).id || (album as any).albumId,
    //         title: (album as any).title || (album as any).name,
    //         hasTracks: !!(album as any).tracks,
    //         trackCount: (album as any).tracks?.length ?? 0
    //     });

    //     // Ensure tracks array is present, even if empty
    //     const tracks: any[] = (album as any).tracks ?? [];

    //     const result = {
    //         ...(album as any),
    //         tracks: tracks
    //     };

    //     console.log(`[YTMusicService] Final album payload:`, {
    //         id: result.id,
    //         title: result.title,
    //         trackCount: result.tracks?.length ?? 0
    //     });
    //     return result;
    // }

    async getPlaylist(playlistId: string) {
        console.log(`[YTMusicService] Fetching playlist: ${playlistId}`);
        await this.initialize();

        const isSpecialId = playlistId.startsWith('RDCL') || playlistId.startsWith('RD');
        let base: any = {};
        try {
            // まずは基本情報だけ取得
            base = await this.ytmusic.getPlaylist(playlistId);
        } catch (e: any) {
            console.warn(`[YTMusicService] Failed to get initial playlist data for ${playlistId}${isSpecialId ? ' (Special ID)' : ''}.`, e.message);
        }

        // 曲情報が無い場合は別メソッドで取得
        let tracks: any[] = base.tracks ?? base.contents ?? [];
        if (tracks.length === 0) {
            try {
                console.log(`[YTMusicService] Attempting getPlaylistVideos for ${playlistId}`);
                const videos = await this.ytmusic.getPlaylistVideos(playlistId);
                tracks = videos ?? [];
            } catch (e: any) {
                console.warn(`[YTMusicService] Fallback getPlaylistVideos failed for ${playlistId}.`, e.message);
            }
        }

        // 送出オブジェクトの構築
        const title = base.title || base.name || (isSpecialId ? 'YouTube Music Mix / Charts' : 'Untitled Playlist');

        const result = {
            ...base,
            id: base.id || base.playlistId || playlistId,
            title: title,
            tracks,
            contents: tracks
        };

        console.log(`[YTMusicService] Final playlist payload:`, {
            id: result.id,
            title: result.title,
            trackCount: result.tracks?.length ?? 0
        });
        return result;
    }

    async getRecommendations() {
        await this.initialize();
        console.log('[YTMusicService] Fetching recommendations...');

        const queries = [
            'My Supermix',
            'Discover Mix',
            'New Release Mix',
            'My Replay Mix'
        ];

        const results = await Promise.all(queries.map(async (query) => {
            try {
                const searchResults = await this.ytmusic.search(query);
                // Find the best match (usually top result or first playlist)
                const match = searchResults.find(item =>
                    (item.type === 'PLAYLIST' || item.type === 'SONG') &&
                    item.name.toLowerCase().includes(query.toLowerCase().replace('my ', ''))
                ) || searchResults[0];

                return match ? { ...match, _query: query } : null;
            } catch (e) {
                console.error(`Failed to fetch recommendation: ${query}`, e);
                return null;
            }
        }));

        const validResults = results.filter((item): item is NonNullable<typeof item> => item !== null);

        if (validResults.length === 0) return null;

        return {
            title: 'Recommendations For You',
            contents: validResults.map(item => ({
                type: item.type === 'PLAYLIST' ? 'PLAYLIST' : 'SONG',
                name: item.name,
                artist: (item as any).artist?.name || 'YouTube Music',
                thumbnails: item.thumbnails,
                playlistId: item.type === 'PLAYLIST' ? (item as any).playlistId : undefined,
                videoId: item.type === 'SONG' ? (item as any).videoId : undefined,
                browseId: item.type === 'PLAYLIST' ? (item as any).playlistId : undefined
            }))
        };
    }
}

export const ytMusicService = new YTMusicService();
