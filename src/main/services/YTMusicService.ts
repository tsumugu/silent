import { Innertube } from 'youtubei.js';
import { session } from 'electron';
import { MusicItem, MusicArtist, MusicThumbnail, ItemType, MusicDetail } from '../../shared/types/music';

export class YTMusicService {
    private innertube: Innertube | null = null;
    private isInitialized = false;
    private songDetailsCache: Map<string, MusicItem> = new Map();

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

        await this.initialize();
        if (!this.innertube) return null;

        try {
            const album: any = await this.innertube.music.getAlbum(albumId);

            const header = album.header;

            // Smarter content discovery: find the section that actually has MusicItems/Songs
            let contents = album.contents || album.items || [];
            if (contents.length === 0 && album.sections) {
                // Try to find a section that has contents
                const trackSection = album.sections.find((s: any) => s.contents && s.contents.length > 0);
                if (trackSection) {
                    contents = trackSection.contents;

                } else if (album.sections[0]?.contents) {
                    contents = album.sections[0].contents;
                }
            }

            const musicItem = this.mapMusicItem({
                ...album,
                browse_id: albumId,
                type: 'ALBUM',
                title: header?.title?.toString() || album.title?.toString()
            });

            if (!musicItem) return null;

            // Improved playlistId extraction
            let playlistId = album.playlist_id ||
                header?.play_button?.endpoint?.payload?.playlistId ||
                header?.play_button?.button_renderer?.navigation_endpoint?.watch_playlist_endpoint?.playlist_id;

            // Fallback: try to extract from URL if possible
            if (!playlistId && album.url?.includes('list=')) {
                try {
                    const url = new URL(album.url, 'https://music.youtube.com');
                    playlistId = url.searchParams.get('list');
                } catch (e) { /* ignore */ }
            }


            // アーティスト情報の抽出: より多くのフィールドをチェック
            const rawArtists = header?.artists || album?.artists || header?.strapline_text_one || header?.author || album?.author || header?.artist || album?.artist || header?.author?.name;
            const fallbackArtists = this.normalizeArtists(rawArtists);

            // Map tracks, ensuring we capture as many as possible
            const tracks = contents.map((t: any) => {
                const mapped = this.mapMusicItem(t, fallbackArtists);
                // If it's a track in an album, ensure it has the album info
                if (mapped && !mapped.album) {
                    mapped.album = {
                        youtube_browse_id: albumId,
                        name: musicItem.title
                    };
                }
                // Propagate playlistId for continuous playback
                if (mapped && playlistId) {
                    mapped.youtube_playlist_id = playlistId;
                }
                return mapped;
            }).filter(Boolean);

            const result: MusicDetail = {
                ...musicItem,
                description: header?.description?.toString(),
                tracks: tracks,
                youtube_playlist_id: playlistId // Ensure playlist ID is on the detail object
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.warn(`[YTMusicService] Failed to fetch as album ${albumId}, trying as playlist...`, e);
            try {
                // Failsafe: Try to get as playlist if album fetch fails
                return await this.getPlaylist(albumId);
            } catch (playlistError) {
                console.error(`[YTMusicService] Both album and playlist fetch failed for ${albumId}`, playlistError);
                return null;
            }
        }
    }

    async getPlaylist(playlistId: string): Promise<MusicDetail | null> {

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
                tracks: tracks,
                youtube_playlist_id: playlistId // Ensure playlist ID is on the detail object
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.warn(`[YTMusicService] Failed to get playlist ${playlistId}`, e);
            return null;
        }
    }

    async getSongDetails(videoId: string): Promise<MusicItem | null> {
        // Check cache first
        if (this.songDetailsCache.has(videoId)) {
            return this.songDetailsCache.get(videoId)!;
        }

        await this.initialize();
        if (!this.innertube) return null;

        try {
            const info: any = await this.innertube.music.getInfo(videoId);

            if (!info) return null;

            // Extract basic info from the response
            const basicInfo = info.basic_info || info;
            const title = basicInfo.title?.toString() || 'Unknown Title';

            // Extract thumbnails
            const thumbnails = this.extractThumbnails(basicInfo.thumbnail || basicInfo.thumbnails);

            // Extract artist info
            const rawArtists = basicInfo.author || basicInfo.artists || basicInfo.artist;
            const artists = this.normalizeArtists(rawArtists);

            // Extract album info - this is the key part
            let albumInfo = null;
            if (basicInfo.album) {
                albumInfo = {
                    youtube_browse_id: basicInfo.album.id || basicInfo.album.browse_id,
                    name: basicInfo.album.name?.toString() || 'Unknown Album'
                };
            }

            const musicItem: MusicItem = {
                type: 'SONG',
                title,
                thumbnails,
                artists: artists.length > 0 ? artists : [{ name: 'Unknown Artist' }],
                youtube_video_id: videoId,
                album: albumInfo || undefined
            };

            const result = JSON.parse(JSON.stringify(musicItem));

            // Cache the result
            this.songDetailsCache.set(videoId, result);

            return result;
        } catch (e) {
            console.error(`[YTMusicService] Failed to get song details for ${videoId}`, e);
            return null;
        }
    }

    async search(query: string) {

        await this.initialize();
        if (!this.innertube) return { songs: [], albums: [], playlists: [] };

        try {
            const searchResults: any = await this.innertube.music.search(query);


            const songs: MusicItem[] = [];
            const albums: MusicItem[] = [];
            const playlists: MusicItem[] = [];

            const processItems = (items: any[]) => {
                if (!Array.isArray(items)) return;
                for (const item of items) {
                    const mappedItem = this.mapMusicItem(item);
                    if (!mappedItem) continue;

                    if (mappedItem.type === 'SONG') songs.push(mappedItem);
                    else if (mappedItem.type === 'ALBUM') albums.push(mappedItem);
                    else if (mappedItem.type === 'PLAYLIST') playlists.push(mappedItem);
                }
            };

            // 1. 深層探索: shelf/contents を探す
            const findAndProcessShelves = (obj: any) => {
                if (!obj || typeof obj !== 'object') return;

                // 直接的な結果
                if (obj.results && Array.isArray(obj.results)) processItems(obj.results);
                if (obj.contents && Array.isArray(obj.contents)) {
                    // contents が直接アイテムの配列である場合と、Section/Shelf の配列である場合がある
                    const firstItem = obj.contents[0];
                    if (firstItem && (firstItem.type || firstItem.item_type || firstItem.contents)) {
                        // Section/Shelf の可能性が高い
                        for (const section of obj.contents) {
                            if (section.contents) processItems(section.contents);
                            else if (section.items) processItems(section.items);
                            // もし section 自体がアイテムなら
                            else processItems([section]);
                        }
                    } else {
                        processItems(obj.contents);
                    }
                }

                // 特定のカテゴリーシェルフ
                if (obj.songs?.contents) processItems(obj.songs.contents);
                if (obj.albums?.contents) processItems(obj.albums.contents);
                if (obj.playlists?.contents) processItems(obj.playlists.contents);
            };

            findAndProcessShelves(searchResults);



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

        if (thumbnails.length === 0 && rawThumbnails.length > 0) {
            console.warn('[YTMusicService] Failed to extract thumbnails from raw data:', rawThumbnails);
        }

        return thumbnails.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    }

    private normalizeArtists(rawArtists: any): MusicArtist[] {
        if (!rawArtists) return [];
        const artists: MusicArtist[] = [];

        if (Array.isArray(rawArtists)) {
            artists.push(...rawArtists
                .map((a: any) => ({
                    name: a.name?.toString().trim() || a.text?.toString().trim() || a.toString().trim() || '',
                    id: a.id || a.browse_id || a.channel_id || a.endpoint?.payload?.browseId
                }))
                .filter(a => a.name.length > 0 && a.name !== 'Unknown Artist' && a.name !== '[object Object]')
            );
        } else if (typeof rawArtists === 'object') {
            // runs があればそこから抽出
            if (rawArtists.runs && Array.isArray(rawArtists.runs)) {
                artists.push(...rawArtists.runs
                    .map((a: any) => ({
                        name: a.text?.toString().trim() || '',
                        id: a.endpoint?.payload?.browseId || a.id || a.browse_id
                    }))
                    .filter((a: any) => a.name.length > 0 && a.name !== 'Unknown Artist')
                );
            }

            // それ以外、または runs で取得できなかった場合に単体として処理
            if (artists.length === 0) {
                const name = rawArtists.name?.toString().trim() || rawArtists.text?.toString().trim();
                if (name && name.length > 0 && name !== 'Unknown Artist' && name !== '[object Object]') {
                    artists.push({
                        name,
                        id: rawArtists.id || rawArtists.browse_id || rawArtists.endpoint?.payload?.browseId
                    });
                } else if (rawArtists.toString() !== '[object Object]') {
                    const toStringName = rawArtists.toString().trim();
                    if (toStringName.length > 0 && toStringName !== 'Unknown Artist') {
                        artists.push({
                            name: toStringName,
                            id: rawArtists.id || rawArtists.browse_id || rawArtists.endpoint?.payload?.browseId
                        });
                    }
                }
            }
        } else if (typeof rawArtists === 'string') {
            const name = rawArtists.trim();
            if (name && name.length > 0 && name !== 'Unknown Artist') {
                artists.push({
                    name,
                    id: undefined
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

        // ID の抽出 (タイプ判定の前に ID を取得しておく)
        let browseId = item.browse_id;
        let playlistId = item.playlist_id;
        let videoId = item.video_id;

        // 汎用的な id フィールドを振り分け
        if (item.id) {
            if (!videoId && (item.id.length === 11)) videoId = item.id;
            else if (!browseId && (item.id.startsWith('MPRE') || item.id.startsWith('Fm') || item.id.startsWith('UC'))) browseId = item.id;
            else if (!playlistId && (item.id.startsWith('PL') || item.id.startsWith('RD') || item.id.startsWith('VL'))) playlistId = item.id;
        }

        // youtubei.js の item_type または type からタイプを判定
        const rawType = (item.item_type || item.type || '').toUpperCase();
        let type: ItemType = 'UNKNOWN';

        // 1. 強力な ID プレフィックスによる判定 (Mix/Radio は最優先で PLAYLIST)
        if (playlistId?.startsWith('RD') || browseId?.startsWith('Fm')) {
            type = 'PLAYLIST';
        }
        // 2. 明示的なタイプラベルによる判定
        else if (rawType.includes('ALBUM') || rawType === 'SINGLE' || rawType === 'EP') {
            type = 'ALBUM';
        }
        else if (rawType.includes('PLAYLIST')) {
            type = 'PLAYLIST';
        }
        else if (rawType.includes('SONG') || rawType.includes('VIDEO')) {
            type = 'SONG';
        }
        else if (rawType.includes('ARTIST')) {
            type = 'ARTIST';
        }
        // 3. ID の存在による判定 (フォールバック)
        else if (videoId) {
            type = 'SONG';
        }
        else if (playlistId) {
            type = 'PLAYLIST';
        }
        else if (browseId) {
            if (browseId.startsWith('MPRE')) type = 'ALBUM';
            else if (browseId.startsWith('VL') || browseId.startsWith('PL')) type = 'PLAYLIST';
            else type = 'ARTIST';
        }

        // アーティスト情報の抽出
        const rawArtists = header.artists || item.artists || header.author || item.author || header.artist || item.artist;
        const artists = this.normalizeArtists(rawArtists);

        // フォールバック
        let finalArtists = artists;
        if (finalArtists.length === 0) {
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

        const mapped: MusicItem = {
            type,
            title,
            thumbnails,
            artists: finalArtists,
            subtitle,
        };

        if (videoId && type === 'SONG') mapped.youtube_video_id = videoId;
        if (browseId && (type === 'ALBUM' || type === 'ARTIST')) mapped.youtube_browse_id = browseId;
        if (playlistId && type === 'PLAYLIST') mapped.youtube_playlist_id = playlistId;

        // 特殊ケース: プレイリストなのに browse_id を持っている場合などは、詳細取得に備えて両方保持しておく
        if (playlistId && !mapped.youtube_playlist_id) mapped.youtube_playlist_id = playlistId;
        if (browseId && !mapped.youtube_browse_id) mapped.youtube_browse_id = browseId;
        // ミックスリスト(RD)の場合、playlist_id が browse_id に入っていることがある
        if (type === 'PLAYLIST' && browseId?.startsWith('RD') && !mapped.youtube_playlist_id) {
            mapped.youtube_playlist_id = browseId;
        }
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
