import { MusicItem, MusicArtist, MusicDetail, isAlbumItem, isSongItem } from '../../shared/types/music';
import { YTMusicClient } from '../infrastructure/YTMusicClient';
import { MusicMapper } from '../../shared/mappers/musicMapper';

/**
 * YouTube Music サービス (Application Layer)
 * YTMusicClient (Infrastructure) と MusicMapper (Domain) を組み合わせて、
 * ビジネスロジックとキャッシュ管理を提供
 */
export class YTMusicService {
    private client: YTMusicClient;
    private songDetailsCache: Map<string, MusicItem> = new Map();

    constructor() {
        this.client = new YTMusicClient();
    }

    /**
     * サービスの初期化
     */
    async initialize(force = false): Promise<void> {
        return this.client.initialize(force);
    }

    /**
     * ログイン状態の確認
     */
    async checkLoginStatus(): Promise<boolean> {
        return this.client.checkLoginStatus();
    }

    /**
     * ホームフィードの取得
     */
    async getHome() {
        try {
            const homeFeed: any = await this.client.getHomeFeed();

            const sections = homeFeed.sections || [];
            const result = sections.map((section: any) => {
                const title = section.title?.toString() || section.header?.title?.toString() || 'Untitled Section';
                const items = section.contents || section.items || [];
                const contents = items
                    .map((item: any) => MusicMapper.mapToMusicItem(item))
                    .filter(Boolean);

                return { title, contents };
            }).filter((s: any) => s.contents.length > 0);

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.error('[YTMusicService] getHome failed:', e);
            return [];
        }
    }

    /**
     * ホームフィードからアルバムのみを取得
     */
    async getHomeAlbums(): Promise<MusicItem[]> {
        const sections = await this.getHome();
        const albums = [];
        for (const section of sections) {
            for (const item of section.contents) {
                if (isAlbumItem(item)) albums.push(item);
            }
        }
        // browse_id でユニーク化
        return Array.from(new Map(albums.map(a => [a.youtube_browse_id, a])).values());
    }

    /**
     * アルバム詳細の取得
     */
    async getAlbumDetails(albumId: string): Promise<MusicDetail | null> {
        try {
            const album: any = await this.client.getAlbumRaw(albumId);

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

            const musicItem = MusicMapper.mapToMusicItem({
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
            const fallbackArtists = MusicMapper.normalizeArtists(rawArtists);

            // Map tracks, ensuring we capture as many as possible
            const tracks = contents.map((t: any) => {
                const mapped = MusicMapper.mapToMusicItem(t, fallbackArtists);
                // If it's a track in an album, ensure it has the album info
                if (mapped && 'album' in mapped && !mapped.album) {
                    (mapped as any).album = {
                        youtube_browse_id: albumId,
                        name: musicItem.title
                    };
                }
                // Propagate playlistId for continuous playback
                if (mapped && playlistId) {
                    (mapped as any).youtube_playlist_id = playlistId;
                }
                return mapped;
            }).filter(Boolean) as MusicItem[];

            const result: MusicDetail = {
                ...musicItem,
                description: header?.description?.toString(),
                tracks: tracks,
            };

            // Ensure playlist ID is on the detail object
            if (playlistId) {
                (result as any).youtube_playlist_id = playlistId;
            }

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

    /**
     * アーティスト詳細の取得
     */
    async getArtistDetails(artistId: string): Promise<MusicDetail | null> {
        try {
            const artist: any = await this.client.getArtistRaw(artistId);

            const header = artist.header;
            const topSongs = artist.sections.find((s: any) => s.type === 'MusicShelf' || s.title?.toString().includes('曲') || s.title?.toString().includes('Song'))?.contents || [];
            const albums = artist.sections.find((s: any) => s.title?.toString().includes('アルバム') || s.title?.toString().includes('Album'))?.contents || [];
            const singles = artist.sections.find((s: any) => s.title?.toString().includes('シングル') || s.title?.toString().includes('Single'))?.contents || [];

            const musicItem = MusicMapper.mapToMusicItem({
                ...artist,
                browse_id: artistId,
                type: 'ARTIST',
                title: header?.name?.toString() || artist.name?.toString()
            });

            if (!musicItem) return null;

            const sections = [];
            if (topSongs.length > 0) {
                sections.push({
                    title: 'Top Songs',
                    items: topSongs.map((t: any) => MusicMapper.mapToMusicItem(t)).filter(Boolean) as MusicItem[]
                });
            }
            if (albums.length > 0) {
                sections.push({
                    title: 'Albums',
                    items: albums.map((t: any) => MusicMapper.mapToMusicItem(t)).filter(Boolean) as MusicItem[]
                });
            }
            if (singles.length > 0) {
                sections.push({
                    title: 'Singles & EPs',
                    items: singles.map((t: any) => MusicMapper.mapToMusicItem(t)).filter(Boolean) as MusicItem[]
                });
            }

            const result: MusicDetail = {
                ...musicItem,
                description: header?.description?.toString(),
                tracks: [], // Artists don't have a single track list usually
                sections: sections
            };

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.error(`[YTMusicService] Failed to get artist details for ${artistId}`, e);
            return null;
        }
    }

    /**
     * プレイリスト詳細の取得
     */
    async getPlaylist(playlistId: string): Promise<MusicDetail | null> {
        try {
            const playlist: any = await this.client.getPlaylistRaw(playlistId);
            const header = playlist.header;
            const items = playlist.items || playlist.contents || [];

            // Safely check for header
            if (!header) {
                console.warn(`[YTMusicService] No header found for playlist ${playlistId}`);
                // If it's UC started, it's actually an artist, so redirect
                if (playlistId.startsWith('UC')) return await this.getArtistDetails(playlistId);
            }

            const rawHeaderArtists = header?.artists || playlist.artists || header?.author || playlist.author;
            const fallbackArtists = MusicMapper.normalizeArtists(rawHeaderArtists);

            const musicItem = MusicMapper.mapToMusicItem({
                ...playlist,
                playlist_id: playlistId,
                type: 'PLAYLIST',
                title: header?.title?.toString() || playlist.title?.toString()
            });

            if (!musicItem) return null;

            // Map tracks with fallback artists
            const tracks = items.map((item: any) => MusicMapper.mapToMusicItem(item, fallbackArtists)).filter(Boolean) as MusicItem[];

            const result: MusicDetail = {
                ...musicItem,
                description: header?.description?.toString(),
                tracks: tracks,
            };

            // Ensure playlist ID is on the detail object
            (result as any).youtube_playlist_id = playlistId;

            return JSON.parse(JSON.stringify(result));
        } catch (e) {
            console.warn(`[YTMusicService] Failed to get playlist ${playlistId}`, e);
            return null;
        }
    }

    /**
     * 楽曲詳細の取得 (キャッシュ付き)
     */
    async getSongDetails(videoId: string): Promise<MusicItem | null> {
        // Check cache first
        if (this.songDetailsCache.has(videoId)) {
            return this.songDetailsCache.get(videoId)!;
        }

        try {
            const info: any = await this.client.getSongInfoRaw(videoId);

            if (!info) return null;

            // Extract basic info from the response
            const basicInfo = info.basic_info || info;
            const title = basicInfo.title?.toString() || 'Unknown Title';

            // Extract thumbnails
            const thumbnails = MusicMapper.extractThumbnails(basicInfo.thumbnail || basicInfo.thumbnails);

            // Extract artist info
            const rawArtists = basicInfo.author || basicInfo.artists || basicInfo.artist;
            const artists = MusicMapper.normalizeArtists(rawArtists);

            // Extract album info - this is the key part
            let albumInfo = null;
            if (basicInfo.album) {
                albumInfo = {
                    youtube_browse_id: basicInfo.album.id || basicInfo.album.browse_id,
                    name: basicInfo.album.name?.toString() || 'Unknown Album'
                };
            }

            // Build SongItem manually since we have all required fields
            const musicItem: any = {
                type: 'SONG',
                title,
                thumbnails,
                artists: artists.length > 0 ? artists : [{ name: 'Unknown Artist' }],
                youtube_video_id: videoId,
                album: albumInfo || undefined
            };

            // Quality Check: If missing critical IDs (Album or Artist), try fallback search
            // because strict "info" often lacks clickable IDs for radio/mix tracks
            const hasAlbumId = !!(musicItem.album?.youtube_browse_id);
            const hasArtistId = musicItem.artists.some((a: any) => !!a.id);

            if (!hasAlbumId || !hasArtistId) {
                try {
                    console.log(`[YTMusicService] Song details missing ID for ${videoId}, trying fallback search...`);
                    // Search by Video ID often returns the specific song card with full metadata
                    const searchResults = await this.search(videoId);
                    const betterSong = searchResults.songs.find((s: MusicItem) => isSongItem(s) && s.youtube_video_id === videoId);

                    if (betterSong) {
                        if (!hasAlbumId && betterSong.album) {
                            musicItem.album = betterSong.album;
                        }
                        if (!hasArtistId && betterSong.artists && betterSong.artists.length > 0 && betterSong.artists[0].id) {
                            musicItem.artists = betterSong.artists;
                        }
                    }
                } catch (fallbackErr) {
                    console.warn('[YTMusicService] Fallback search failed', fallbackErr);
                }
            }

            const result = JSON.parse(JSON.stringify(musicItem));

            // Cache the result
            this.songDetailsCache.set(videoId, result);

            return result;
        } catch (e) {
            console.error(`[YTMusicService] Failed to get song details for ${videoId}`, e);
            return null;
        }
    }

    /**
     * 検索の実行
     */
    async search(query: string) {
        try {
            const searchResults: any = await this.client.searchRaw(query);

            const songs: MusicItem[] = [];
            const albums: MusicItem[] = [];
            const playlists: MusicItem[] = [];

            const processItems = (items: any[]) => {
                if (!Array.isArray(items)) return;
                for (const item of items) {
                    const mappedItem = MusicMapper.mapToMusicItem(item);
                    if (!mappedItem) continue;

                    if (mappedItem.type === 'SONG') songs.push(mappedItem);
                    else if (mappedItem.type === 'ALBUM') albums.push(mappedItem);
                    else if (mappedItem.type === 'PLAYLIST' || mappedItem.type === 'RADIO') playlists.push(mappedItem);
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
                            // Handle MusicCardShelf - extract all needed data
                            if (section.type === 'MusicCardShelf' || section.item_type === 'MusicCardShelf') {
                                // Extract videoId from buttons
                                const videoId = section.buttons?.[0]?.endpoint?.payload?.videoId;

                                // Extract artist and album from menu items
                                let artistId: string | undefined;
                                let albumId: string | undefined;

                                for (const menuItem of section.menu?.items || []) {
                                    const pageType = menuItem.endpoint?.payload?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
                                    const browseId = menuItem.endpoint?.payload?.browseId;

                                    if (pageType === 'MUSIC_PAGE_TYPE_ARTIST' && browseId) {
                                        artistId = browseId;
                                    } else if (pageType === 'MUSIC_PAGE_TYPE_ALBUM' && browseId) {
                                        albumId = browseId;
                                    }
                                }

                                // Extract artist name from subtitle (format: "曲 • アーティスト名 • 時間")
                                let artistName = 'Unknown Artist';
                                const subtitle = section.subtitle?.toString() || '';
                                const subtitleParts = subtitle.split(' • ');
                                if (subtitleParts.length >= 2) {
                                    artistName = subtitleParts[1]; // Second part is the artist
                                }

                                if (videoId) {
                                    // Create a proper SongItem from MusicCardShelf data
                                    const shelfSongItem = {
                                        type: 'SONG',
                                        title: section.title?.toString() || 'Unknown',
                                        video_id: videoId,
                                        artists: [{
                                            name: artistName,
                                            id: artistId,
                                            browse_id: artistId
                                        }],
                                        album: albumId ? {
                                            id: albumId,
                                            browse_id: albumId,
                                            name: 'Unknown Album'
                                        } : undefined,
                                        thumbnails: section.thumbnail
                                    };

                                    console.log('[YTMusicService] Extracted from MusicCardShelf:', {
                                        title: shelfSongItem.title,
                                        videoId,
                                        artistId,
                                        albumId,
                                        artistName
                                    });

                                    processItems([shelfSongItem]);
                                    continue; // Don't fall through to other handlers
                                }
                            }

                            // Check specifically for other shelf types with contents/items
                            if (section.contents) {
                                processItems(section.contents);
                            } else if (section.items) {
                                processItems(section.items);
                            }
                            // もし section 自体がアイテムなら
                            else {
                                processItems([section]);
                            }
                        }
                    } else {
                        processItems(obj.contents);
                    }
                }

                // Specific recursive paths
                if (obj.top_result) processItems([obj.top_result]); // Top result is often a single item or CardShelf

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
}

export const ytMusicService = new YTMusicService();
