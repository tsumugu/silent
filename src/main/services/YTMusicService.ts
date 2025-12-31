import { Innertube } from 'youtubei.js';
import { session } from 'electron';

export class YTMusicService {
    private innertube: Innertube | null = null;
    private isInitialized = false;

    constructor() { }

    async initialize(force = false) {
        if (this.isInitialized && !force && this.innertube) return;

        try {
            const dotYoutube = await session.defaultSession.cookies.get({ domain: '.youtube.com' });
            const musicYoutube = await session.defaultSession.cookies.get({ domain: 'music.youtube.com' });
            const wwwYoutube = await session.defaultSession.cookies.get({ domain: 'www.youtube.com' });
            const accountsYoutube = await session.defaultSession.cookies.get({ domain: 'accounts.youtube.com' });

            const allCookies = [...dotYoutube, ...musicYoutube, ...wwwYoutube, ...accountsYoutube];
            const uniqueCookies = Array.from(new Map(allCookies.map(c => [c.name, c])).values());
            const cookieString = uniqueCookies.map(c => `${c.name}=${c.value}`).join('; ');

            this.innertube = await Innertube.create({
                cookie: cookieString,
                lang: 'ja',
                location: 'JP'
            });

            console.log(`[YTMusicService] Initialized. Cookies: ${uniqueCookies.length}. Login: ${this.innertube.session.logged_in}`);
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize YTMusicService:', error);
        }
    }

    private isLoggedIn(): boolean {
        return this.innertube?.session.logged_in ?? false;
    }

    async checkLoginStatus(): Promise<boolean> {
        await this.initialize();
        return this.isLoggedIn();
    }

    async getHome() {
        await this.initialize();
        if (!this.innertube) return [];

        try {
            const homeFeed: any = await this.innertube.music.getHomeFeed();
            console.log(`[YTMusicService] Home feed fetched. Sections: ${homeFeed.sections?.length}`);

            const sections = homeFeed.sections || [];
            const result = sections.map((section: any) => {
                const title = section.title?.toString() || section.header?.title?.toString() || 'Untitled Section';
                const items = section.contents || section.items || [];
                const contents = items
                    .map((item: any) => this.mapMusicItem(item))
                    .filter(Boolean);

                return { title, contents };
            }).filter((s: any) => s.contents.length > 0);

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.error('[YTMusicService] getHome failed:', e);
            await this.initialize(true);
            const homeFeed: any = await this.innertube.music.getHomeFeed();
            const sections = homeFeed.sections || [];
            return JSON.parse(JSON.stringify(sections.map((section: any) => ({
                title: section.title?.toString() || section.header?.title?.toString() || 'Untitled Section',
                contents: (section.contents || section.items || []).map((item: any) => this.mapMusicItem(item)).filter(Boolean) || []
            })).filter((s: any) => s.contents.length > 0)));
        }
    }

    async getHomeAlbums() {
        const sections = await this.getHome();
        const albums = [];
        for (const section of sections) {
            for (const item of section.contents) {
                if (item.type === 'ALBUM') albums.push(item);
            }
        }
        return Array.from(new Map(albums.map(a => [a.id, a])).values());
    }

    async getAlbumDetails(albumId: string) {
        console.log(`[YTMusicService] Fetching album: ${albumId}`);
        await this.initialize();
        if (!this.innertube) return null;

        try {
            const album: any = await this.innertube.music.getAlbum(albumId);
            const header = album.header;
            const contents = album.sections?.[0]?.contents || album.contents || [];

            const thumbnails = this.extractThumbnails(header?.thumbnails || header?.thumbnail || album.thumbnails || album.thumbnail);

            const authorName = this.extractArtistName(header || album.header);
            const artistId = header?.author?.id || header?.artist?.id || album.header?.browse_id;
            const albumTitle = header?.title?.toString() || album.title?.toString();

            const result = {
                albumId: albumId,
                id: albumId,
                name: albumTitle,
                title: albumTitle,
                artist: {
                    name: authorName,
                    artistId: artistId
                },
                thumbnails: thumbnails,
                year: header?.year,
                songs: contents.map((t: any) => ({
                    videoId: t.id || t.video_id,
                    name: t.title?.toString(),
                    title: t.title?.toString(),
                    artist: {
                        name: t.author?.name || authorName,
                        artistId: t.author?.id || artistId
                    },
                    duration: t.duration?.text || t.duration?.seconds,
                    thumbnails: thumbnails
                })),
                tracks: contents.map((t: any) => ({
                    videoId: t.id || t.video_id,
                    name: t.title?.toString(),
                    title: t.title?.toString(),
                    artist: t.author?.name || authorName,
                    duration: t.duration?.text,
                    thumbnails: thumbnails
                }))
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.error(`[YTMusicService] Failed to fetch album ${albumId}`, e);
            return { id: albumId, albumId: albumId, name: 'Unknown Album', title: 'Unknown Album', tracks: [], songs: [] };
        }
    }

    async getPlaylist(playlistId: string) {
        console.log(`[YTMusicService] Fetching playlist: ${playlistId}`);
        await this.initialize();
        if (!this.innertube) return null;

        try {
            const playlist: any = await this.innertube.music.getPlaylist(playlistId);
            const header = playlist.header;
            const items = playlist.items || playlist.contents || [];

            const thumbnails = this.extractThumbnails(header?.thumbnails || header?.thumbnail || playlist.thumbnails || playlist.thumbnail);

            const authorName = this.extractArtistName(header || playlist.header) || 'YouTube Music';
            const playlistTitle = header?.title?.toString() || playlist.title?.toString();

            const tracks = items.map((item: any) => {
                const itemThumbnails = this.extractThumbnails(item.thumbnails || item.thumbnail);
                return {
                    videoId: item.id || item.video_id,
                    name: item.title?.toString(),
                    title: item.title?.toString(),
                    artist: {
                        name: item.author?.name || item.artists?.[0]?.name || item.subtitle?.toString() || authorName
                    },
                    duration: item.duration?.text,
                    thumbnails: itemThumbnails.length > 0 ? itemThumbnails : thumbnails
                };
            });

            const result = {
                id: playlistId,
                playlistId: playlistId,
                name: playlistTitle,
                title: playlistTitle,
                description: header?.description?.toString(),
                thumbnails: thumbnails,
                artist: { name: authorName },
                author: { name: authorName },
                tracks: tracks,
                songs: tracks,
                contents: tracks
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.warn(`[YTMusicService] Failed to get playlist ${playlistId}`, e);
            return { id: playlistId, playlistId: playlistId, name: 'Untitled Playlist', title: 'Untitled Playlist', tracks: [], songs: [] };
        }
    }

    private extractArtistName(header: any): string {
        if (!header) return 'Unknown Artist';

        // 1. YouTube Music specific properties
        if (header.author?.name) return header.author.name.toString();
        if (header.artist?.name) return header.artist.name.toString();
        if (header.artists?.[0]?.name) return header.artists[0].name.toString();

        // 2. Strapline
        if (header.strapline_text_one?.toString()) return header.strapline_text_one.toString();

        // 3. Subtitle parsing (Extract artist from "Album • Artist")
        const subtitle = header.subtitle?.toString();
        if (subtitle) {
            const parts = subtitle.split(/[•·]/).map((s: string) => s.trim());
            const categories = ['Album', 'Single', 'Playlist', 'EP', 'Video', 'Song', 'アルバム', 'シングル', 'プレイリスト'];

            // If the first part is a category, the second is likely the artist
            if (categories.some(cat => parts[0].toLowerCase() === cat.toLowerCase())) {
                return parts[1] || parts[0];
            }

            return parts[0];
        }

        return 'Unknown Artist';
    }

    private extractThumbnails(data: any): any[] {
        if (!data) return [];
        let rawThumbnails: any[] = [];
        if (Array.isArray(data)) {
            rawThumbnails = data;
        } else if (data.contents && Array.isArray(data.contents)) {
            rawThumbnails = data.contents;
        } else if (typeof data === 'object') {
            if (data.url) rawThumbnails = [data];
            else if (data.thumbnails && Array.isArray(data.thumbnails)) rawThumbnails = data.thumbnails;
            else rawThumbnails = Object.values(data).filter(v => v && typeof v === 'object' && (v as any).url);
        }

        const thumbnails = rawThumbnails.map(t => {
            let url = (typeof t === 'string' ? t : t.url)?.toString() || '';
            if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
                url = url.replace(/=w\d+-h\d+/, '=w1000-h1000');
            } else if (url.includes('ytimg.com')) {
                if (url.includes('/default.jpg')) url = url.replace('/default.jpg', '/maxresdefault.jpg');
                if (url.includes('/hqdefault.jpg')) url = url.replace('/hqdefault.jpg', '/maxresdefault.jpg');
            }
            return { url, width: t.width || 0, height: t.height || 0 };
        }).filter(t => t.url && t.url.startsWith('http'));

        return thumbnails.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    }

    private mapMusicItem(item: any) {
        if (!item) return null;

        const title = item.title?.toString() || item.name?.toString();
        if (!title) return null;

        const id = item.id || item.video_id || item.browse_id || item.playlist_id;
        if (!id) return null;

        const artistName = this.extractArtistName(item);
        const thumbnails = this.extractThumbnails(item.thumbnails || item.thumbnail);

        const itemType = item.type || item.constructor?.name || 'UNKNOWN';
        let type = itemType.toUpperCase();

        // Refine type by ID or content
        if (id.startsWith('MPRE') || id.startsWith('Fm')) type = 'ALBUM';
        else if (id.startsWith('VL') || id.startsWith('PL') || id.startsWith('RD')) type = 'PLAYLIST';
        else if (id.length > 5 && !id.includes(' ')) type = 'SONG';

        if (itemType.includes('Album')) type = 'ALBUM';
        if (itemType.includes('Playlist')) type = 'PLAYLIST';
        if (itemType.includes('Video') || itemType.includes('Song')) type = 'SONG';

        const mapped: any = {
            id,
            type,
            name: title,
            title,
            artist: { name: artistName, id: item.author?.id || item.browse_id },
            subtitle: artistName,
            thumbnails,
        };

        if (type === 'ALBUM') {
            mapped.albumId = id;
            mapped.browseId = id;
        } else if (type === 'PLAYLIST') {
            mapped.playlistId = id;
            mapped.browseId = id;
        } else if (type === 'SONG') {
            mapped.videoId = id;
        }

        return mapped;
    }
}

export const ytMusicService = new YTMusicService();
