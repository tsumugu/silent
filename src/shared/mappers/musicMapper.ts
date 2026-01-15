import {
    MusicItem,
    MusicThumbnail,
    MusicArtist,
    ItemType,
    SongItem,
    AlbumItem,
    PlaylistItem,
    ArtistItem,
    ChartItem,
    RadioItem,
    MusicDetail,
    MusicSection
} from '../types/music';

/**
 * YouTube Music API の生データを MusicItem (Discriminated Union) に変換する純粋関数群
 */
export class MusicMapper {
    /**
     * サムネイル画像の抽出と最適化
     */
    static extractThumbnails(data: any): MusicThumbnail[] {
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
            // 高解像度 URL に変換
            if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
                url = url.replace(/=w\d+-h\d+/, '=w1000-h1000');
            } else if (url.includes('ytimg.com')) {
                if (url.includes('/default.jpg')) url = url.replace('/default.jpg', '/maxresdefault.jpg');
                if (url.includes('/hqdefault.jpg')) url = url.replace('/hqdefault.jpg', '/maxresdefault.jpg');
            }
            return {
                url,
                width: t.width || 0,
                height: t.height || 0
            };
        }).filter(t => t.url && t.url.startsWith('http'));

        if (thumbnails.length === 0 && rawThumbnails.length > 0) {
            console.warn('[MusicMapper] Failed to extract thumbnails from raw data:', rawThumbnails);
        }

        return thumbnails.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    }

    /**
     * アーティスト情報の正規化
     */
    static normalizeArtists(rawArtists: any): MusicArtist[] {
        if (!rawArtists) return [];
        const artists: MusicArtist[] = [];

        if (Array.isArray(rawArtists)) {
            artists.push(...rawArtists
                .map((a: any) => ({
                    name: a.name?.toString().trim() || a.text?.toString().trim() || a.toString().trim() || '',
                    id: a.id || a.browseId || a.browse_id || a.channel_id ||
                        a.endpoint?.payload?.browseId ||
                        a.navigation_endpoint?.browse_endpoint?.browse_id ||
                        a.navigationEndpoint?.browseEndpoint?.browseId ||
                        a.navigation_endpoint?.payload?.browseId ||
                        a.navigationEndpoint?.payload?.browseId
                }))
                .filter(a => a.name.length > 0 && a.name !== 'Unknown Artist' && a.name !== '[object Object]')
            );
        } else if (typeof rawArtists === 'object') {
            // runs があればそこから抽出
            if (rawArtists.runs && Array.isArray(rawArtists.runs)) {
                artists.push(...rawArtists.runs
                    .map((a: any) => ({
                        name: a.text?.toString().trim() || '',
                        id: a.endpoint?.payload?.browseId ||
                            a.navigation_endpoint?.browse_endpoint?.browse_id ||
                            a.navigationEndpoint?.browseEndpoint?.browseId ||
                            a.navigation_endpoint?.payload?.browseId ||
                            a.navigationEndpoint?.payload?.browseId ||
                            a.id || a.browseId || a.browse_id
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
                        id: rawArtists.id || rawArtists.browse_id ||
                            rawArtists.endpoint?.payload?.browseId ||
                            rawArtists.navigation_endpoint?.browse_endpoint?.browse_id ||
                            rawArtists.navigationEndpoint?.browseEndpoint?.browseId
                    });
                } else if (rawArtists.toString() !== '[object Object]') {
                    const toStringName = rawArtists.toString().trim();
                    if (toStringName.length > 0 && toStringName !== 'Unknown Artist') {
                        artists.push({
                            name: toStringName,
                            id: rawArtists.id || rawArtists.browse_id ||
                                rawArtists.endpoint?.payload?.browseId ||
                                rawArtists.navigation_endpoint?.browse_endpoint?.browse_id ||
                                rawArtists.navigationEndpoint?.browseEndpoint?.browseId
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

        return artists.filter(a => a.name.length > 0);
    }

    /**
     * メイン変換関数: 生データ → MusicItem (Discriminated Union)
     */
    static mapToMusicItem(item: any, fallbackArtists?: MusicArtist[]): MusicItem | null {
        if (!item) return null;

        // 詳細ビュー（Album/Playlist）の場合、メタデータが header に入っていることがある
        const header = item.header || item;

        const title = (header.title?.toString() || item.title?.toString() || item.name?.toString() || 'Untitled').trim();
        if (!title && !header.thumbnails && !item.thumbnails) return null;

        const thumbnails = this.extractThumbnails(header.thumbnails || header.thumbnail || item.thumbnails || item.thumbnail);
        const subtitle = header.subtitle?.toString();

        // 評価ステータスの抽出
        let likeStatus: 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | undefined;
        if (item.is_liked === true || item.like_status === 'LIKE') likeStatus = 'LIKE';
        else if (item.is_disliked === true || item.like_status === 'DISLIKE') likeStatus = 'DISLIKE';
        else if (item.is_liked === false && item.is_disliked === false) likeStatus = 'INDIFFERENT';

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

        // Additional ID extraction from endpoints
        const endpoint = item.endpoint || item.navigation_endpoint || item.navigationEndpoint;
        if (endpoint) {
            const payload = endpoint.payload || endpoint;
            if (!browseId) browseId = payload.browseId || payload.browse_id;
            if (!playlistId) playlistId = payload.playlistId || payload.playlist_id;
            if (!videoId) videoId = payload.videoId || payload.video_id;
        }

        // youtubei.js の item_type または type からタイプを判定
        const rawType = (item.item_type || item.type || '').toUpperCase();
        let type: ItemType;

        // 1. 強力な ID プレフィックスによる判定 (Radio/Mix は最優先)
        if (playlistId?.startsWith('RD') || browseId?.startsWith('RD')) {
            type = 'RADIO';
        } else if (browseId?.startsWith('Fm')) {
            type = 'PLAYLIST';
        }
        // 2. 明示的なタイプラベルによる判定
        else if (rawType.includes('ALBUM') || rawType === 'SINGLE' || rawType === 'EP') {
            type = 'ALBUM';
        }
        else if (rawType.includes('PLAYLIST') || rawType === 'CHART') {
            // CHART は一旦 PLAYLIST として扱う (将来的に chart 判定ロジック追加可能)
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
            else if (browseId.startsWith('UC')) type = 'ARTIST';
            else {
                // どれにも該当しない場合は null を返す (fail-fast)
                console.warn('[MusicMapper] Cannot determine type for item:', { title, browseId, playlistId, videoId, rawType });
                return null;
            }
        }
        else {
            // ID が何もない場合は null を返す
            console.warn('[MusicMapper] No valid ID found for item:', { title, rawType });
            return null;
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
                if (type === 'PLAYLIST' || type === 'RADIO') {
                    finalArtists = [{ name: 'YouTube' }];
                } else {
                    finalArtists = [{ name: 'Unknown Artist' }];
                }
            }
        }

        // 共通フィールド
        const baseItem = {
            title,
            thumbnails,
            subtitle,
            likeStatus
        };

        // タイプ別に discriminated union を構築
        if (type === 'SONG') {
            if (!videoId) {
                console.warn('[MusicMapper] SONG item missing youtube_video_id:', { title });
                return null;
            }

            const songItem: SongItem = {
                ...baseItem,
                type: 'SONG',
                youtube_video_id: videoId,
                artists: finalArtists,
                youtube_playlist_id: playlistId
            };

            // Optional fields
            if (item.album) {
                songItem.album = {
                    youtube_browse_id: item.album.id || item.album.browse_id,
                    name: item.album.name?.toString() || 'Unknown Album'
                };
            }

            if (item.duration) {
                const durationText = item.duration.text?.toString();
                const durationSeconds = typeof item.duration.seconds === 'number' ? item.duration.seconds : undefined;
                if (durationText && durationSeconds !== undefined) {
                    songItem.duration = {
                        text: durationText,
                        seconds: durationSeconds
                    };
                }
            }

            return songItem;
        }
        else if (type === 'ALBUM') {
            if (!browseId) {
                console.warn('[MusicMapper] ALBUM item missing youtube_browse_id:', { title });
                return null;
            }

            const albumItem: AlbumItem = {
                ...baseItem,
                type: 'ALBUM',
                youtube_browse_id: browseId,
                artists: finalArtists,
                youtube_playlist_id: playlistId
            };

            return albumItem;
        }
        else if (type === 'PLAYLIST') {
            // 特殊ケース: browse_id が RD で始まる場合、playlist_id として使用
            if (!playlistId && browseId?.startsWith('RD')) {
                playlistId = browseId;
            }

            if (!playlistId) {
                console.warn('[MusicMapper] PLAYLIST item missing youtube_playlist_id:', { title, browseId });
                return null;
            }

            const playlistItem: PlaylistItem = {
                ...baseItem,
                type: 'PLAYLIST',
                youtube_playlist_id: playlistId,
                author: item.author?.name?.toString() || item.author?.toString()
            };

            return playlistItem;
        }
        else if (type === 'ARTIST') {
            if (!browseId) {
                console.warn('[MusicMapper] ARTIST item missing youtube_browse_id:', { title });
                return null;
            }

            const artistItem: ArtistItem = {
                ...baseItem,
                type: 'ARTIST',
                youtube_browse_id: browseId
            };

            return artistItem;
        }
        else if (type === 'RADIO') {
            // 特殊ケース: browse_id が RD で始まる場合、playlist_id として使用
            if (!playlistId && browseId?.startsWith('RD')) {
                playlistId = browseId;
            }

            if (!playlistId) {
                console.warn('[MusicMapper] RADIO item missing youtube_playlist_id:', { title, browseId });
                return null;
            }

            const radioItem: RadioItem = {
                ...baseItem,
                type: 'RADIO',
                youtube_playlist_id: playlistId,
                seed_video_id: videoId
            };

            return radioItem;
        }
        else if (type === 'CHART') {
            if (!playlistId) {
                console.warn('[MusicMapper] CHART item missing youtube_playlist_id:', { title });
                return null;
            }

            const chartItem: ChartItem = {
                ...baseItem,
                type: 'CHART',
                youtube_playlist_id: playlistId
            };

            return chartItem;
        }

        // Should never reach here
        console.error('[MusicMapper] Unhandled item type:', type);
        return null;
    }

    /**
     * MusicDetail (アルバム、プレイリスト、アーティスト詳細) へのマッピング
     */
    static mapToMusicDetail(rawData: any, expectedType: ItemType): MusicDetail | null {
        const baseItem = this.mapToMusicItem(rawData, undefined);
        if (!baseItem) return null;

        // MusicDetail として拡張
        const detail: MusicDetail = {
            ...baseItem,
            description: rawData.description?.toString() || rawData.header?.description?.toString(),
            tracks: [],
            sections: []
        };

        return detail;
    }

    /**
     * MusicSection (セクション) へのマッピング
     */
    static mapToMusicSection(rawSection: any, fallbackArtists?: MusicArtist[]): MusicSection | null {
        if (!rawSection) return null;

        const title = rawSection.title?.toString() || 'Untitled Section';
        const items = (rawSection.contents || rawSection.items || [])
            .map((item: any) => this.mapToMusicItem(item, fallbackArtists))
            .filter((item: MusicItem | null) => item !== null) as MusicItem[];

        return {
            title,
            items,
            type: rawSection.type?.toString()
        };
    }
}
