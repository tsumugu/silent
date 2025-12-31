import { Innertube } from 'youtubei.js';
import { session } from 'electron';
import { MusicItem, MusicArtist, MusicThumbnail, ItemType, MusicDetail } from '../../shared/types/music';

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
            return [];
        }
    }

    async getHomeAlbums(): Promise<MusicItem[]> {
        const sections = await this.getHome();
        const albums = [];
        for (const section of sections) {
            for (const item of section.contents) {
                if (item.type === 'ALBUM') albums.push(item);
            }
        }
        return Array.from(new Map(albums.map(a => [a.youtube_browse_id, a])).values());
    }

    async getAlbumDetails(albumId: string): Promise<MusicDetail | null> {
        console.log(`[YTMusicService] Fetching album: ${albumId}`);
        await this.initialize();
        if (!this.innertube) return null;

        try {
            const album: any = await this.innertube.music.getAlbum(albumId);
            const header = album.header;
            const contents = album.sections?.[0]?.contents || album.contents || [];

            const musicItem = this.mapMusicItem({
                ...album,
                browse_id: albumId,
                type: 'ALBUM',
                title: header?.title?.toString() || album.title?.toString()
            });

            if (!musicItem) return null;

            const rawArtists = header.artists || album.artists || header.author || album.author || header.artist || album.artist;
            const fallbackArtists = this.normalizeArtists(rawArtists); // 正規化したアーティストを使用
            const tracks = contents.map((t: any) => this.mapMusicItem(t, fallbackArtists)).filter(Boolean);

            const result: MusicDetail = {
                ...musicItem,
                description: header?.description?.toString(),
                tracks: tracks
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.error(`[YTMusicService] Failed to fetch album ${albumId}`, e);
            return null;
        }
    }

    async getPlaylist(playlistId: string): Promise<MusicDetail | null> {
        console.log(`[YTMusicService] Fetching playlist: ${playlistId}`);
        await this.initialize();
        if (!this.innertube) return null;

        try {
            const playlist: any = await this.innertube.music.getPlaylist(playlistId);
            const header = playlist.header;
            const items = playlist.items || playlist.contents || [];

            // ヘッダーアーティストを先に抽出して正規化
            const rawHeaderArtists = header.artists || playlist.artists || header.author || playlist.author;
            const fallbackArtists = this.normalizeArtists(rawHeaderArtists);

            const musicItem = this.mapMusicItem({
                ...playlist,
                playlist_id: playlistId,
                type: 'PLAYLIST',
                title: header?.title?.toString() || playlist.title?.toString()
            });

            if (!musicItem) return null;

            // musicItem.artists の代わりに正規化済みの fallbackArtists を使用
            const tracks = items.map((item: any) => this.mapMusicItem(item, fallbackArtists)).filter(Boolean);

            const result: MusicDetail = {
                ...musicItem,
                description: header?.description?.toString(),
                tracks: tracks
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.warn(`[YTMusicService] Failed to get playlist ${playlistId}`, e);
            return null;
        }
    }

    async search(query: string) {
        console.log(`[YTMusicService] Searching for: ${query}`);
        await this.initialize();
        if (!this.innertube) return { songs: [], albums: [], playlists: [] };

        try {
            const searchResults: any = await this.innertube.music.search(query);

            const songs: MusicItem[] = [];
            const albums: MusicItem[] = [];
            const playlists: MusicItem[] = [];

            // Parse results from different possible structures
            if (searchResults.results) {
                for (const result of searchResults.results) {
                    const mappedItem = this.mapMusicItem(result);
                    if (!mappedItem) continue;

                    if (mappedItem.type === 'SONG') songs.push(mappedItem);
                    else if (mappedItem.type === 'ALBUM') albums.push(mappedItem);
                    else if (mappedItem.type === 'PLAYLIST') playlists.push(mappedItem);
                }
            }

            // Alternative structure: check for shelf properties
            if (searchResults.songs?.contents) {
                songs.push(...searchResults.songs.contents.map((item: any) => this.mapMusicItem(item)).filter((i: any): i is MusicItem => i !== null));
            }
            if (searchResults.albums?.contents) {
                albums.push(...searchResults.albums.contents.map((item: any) => this.mapMusicItem(item)).filter((i: any): i is MusicItem => i !== null));
            }
            if (searchResults.playlists?.contents) {
                playlists.push(...searchResults.playlists.contents.map((item: any) => this.mapMusicItem(item)).filter((i: any): i is MusicItem => i !== null));
            }

            const result = {
                songs: songs.slice(0, 20),
                albums: albums.slice(0, 20),
                playlists: playlists.slice(0, 20),
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.error(`[YTMusicService] Search failed for query "${query}"`, e);
            return { songs: [], albums: [], playlists: [] };
        }
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

    private normalizeArtists(rawArtists: any): MusicArtist[] {
        const artists: MusicArtist[] = [];

        if (Array.isArray(rawArtists)) {
            artists.push(...rawArtists
                .map((a: any) => ({
                    name: a.name?.toString().trim() || '',
                    id: a.id || a.browse_id || a.channel_id
                }))
                .filter(a => a.name.length > 0 && a.name !== 'Unknown Artist')
            );
        } else if (rawArtists && typeof rawArtists === 'object') {
            const name = rawArtists.name?.toString().trim();
            if (name && name.length > 0 && name !== 'Unknown Artist') {
                artists.push({
                    name,
                    id: rawArtists.id || rawArtists.browse_id
                });
            }
        }

        return artists;
    }

    private mapMusicItem(item: any, fallbackArtists?: MusicArtist[]): MusicItem | null {
        if (!item) return null;

        // 詳細ビュー（Album/Playlist）の場合、メタデータが header に入っていることがある
        const header = item.header || item;

        const title = (header.title?.toString() || item.title?.toString() || item.name?.toString() || 'Untitled').trim();
        if (!title && !header.thumbnails && !item.thumbnails) return null;

        const thumbnails = this.extractThumbnails(header.thumbnails || header.thumbnail || item.thumbnails || item.thumbnail);
        const subtitle = header.subtitle?.toString();

        // youtubei.js の item_type または type からタイプを判定
        const rawType = (item.item_type || item.type || '').toUpperCase();
        let type: ItemType = 'UNKNOWN';

        if (rawType.includes('ALBUM') || rawType === 'SINGLE' || rawType === 'EP') type = 'ALBUM';
        else if (rawType.includes('PLAYLIST')) type = 'PLAYLIST';
        else if (rawType.includes('SONG') || rawType.includes('VIDEO')) type = 'SONG';
        else if (rawType.includes('ARTIST')) type = 'ARTIST';
        // フォールバック: プロパティの存在からタイプを推測
        else if (item.video_id) type = 'SONG';
        else if (item.playlist_id) type = 'PLAYLIST';
        else if (item.browse_id) {
            const bid = item.browse_id;
            if (bid.startsWith('MPRE') || bid.startsWith('Fm')) type = 'ALBUM';
            else if (bid.startsWith('VL') || bid.startsWith('PL')) type = 'PLAYLIST';
            else type = 'ARTIST';
        }

        // アーティスト情報の抽出
        const rawArtists = header.artists || item.artists || header.author || item.author || header.artist || item.artist;
        const artists = this.normalizeArtists(rawArtists);

        // フォールバック
        let finalArtists = artists;
        if (finalArtists.length === 0) {
            console.log(`[YTMusicService] No structural artists for: "${title}". FallbackArtists:`, fallbackArtists);

            // フォールバックアーティストを検証してから使用
            if (fallbackArtists && fallbackArtists.length > 0) {
                const validFallbacks = fallbackArtists.filter(a => a.name && a.name.trim().length > 0);
                if (validFallbacks.length > 0) {
                    finalArtists = validFallbacks;
                }
            }

            // まだ有効なアーティストがない場合、デフォルトを使用
            if (finalArtists.length === 0) {
                if (type === 'PLAYLIST') {
                    finalArtists = [{ name: 'YouTube' }];
                } else {
                    finalArtists = [{ name: 'Unknown Artist' }];
                }
            }
        }

        // デバッグ用の警告
        if (finalArtists.some(a => a.name === 'Unknown Artist')) {
            console.warn(`[YTMusicService] Mapping resulted in Unknown Artist for "${title}". RawArtists:`, rawArtists ? JSON.stringify(rawArtists).substring(0, 200) : 'none');
        }

        const mapped: MusicItem = {
            type,
            title,
            thumbnails,
            artists: finalArtists,
            subtitle,
        };

        // ID の抽出
        let browseId = item.browse_id;
        let playlistId = item.playlist_id;
        let videoId = item.video_id;

        // 汎用的な id フィールドをタイプに応じて振り分け
        if (item.id) {
            if (type === 'SONG' && !videoId) videoId = item.id;
            else if ((type === 'ALBUM' || type === 'ARTIST') && !browseId) browseId = item.id;
            else if (type === 'PLAYLIST' && !playlistId) playlistId = item.id;
            // 未知のタイプで browse_id も playlist_id もない場合、とりあえず browseId に入れる（詳細取得のため）
            else if (type === 'UNKNOWN' && !browseId && !playlistId && !videoId) browseId = item.id;
        }

        if (videoId && type === 'SONG') mapped.youtube_video_id = videoId;
        if (browseId && (type === 'ALBUM' || type === 'ARTIST')) mapped.youtube_browse_id = browseId;
        if (playlistId && type === 'PLAYLIST') mapped.youtube_playlist_id = playlistId;

        // 特殊ケース: プレイリストなのに browse_id を持っている場合や、動画なのにプレイリスト ID を持っている場合など
        if (playlistId && !mapped.youtube_playlist_id) mapped.youtube_playlist_id = playlistId;
        if (browseId && !mapped.youtube_browse_id) mapped.youtube_browse_id = browseId;
        if (videoId && !mapped.youtube_video_id && type === 'SONG') mapped.youtube_video_id = videoId;

        if (item.album) {
            mapped.album = {
                youtube_browse_id: item.album.id || item.album.browse_id,
                name: item.album.name?.toString() || 'Unknown Album'
            };
        }

        if (item.duration) {
            mapped.duration = {
                text: item.duration.text?.toString(),
                seconds: typeof item.duration.seconds === 'number' ? item.duration.seconds : undefined
            };
        }

        const canonicalId = mapped.youtube_browse_id || mapped.youtube_playlist_id || mapped.youtube_video_id;
        if (!canonicalId) {
            console.warn(`[YTMusicService] No canonical ID found for item: ${title} (${type})`, { rawType, browseId, playlistId, videoId });
        }

        return mapped;
    }
}

export const ytMusicService = new YTMusicService();
