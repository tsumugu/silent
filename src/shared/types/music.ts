export type ItemType = 'SONG' | 'ALBUM' | 'PLAYLIST' | 'ARTIST' | 'CHART' | 'RADIO';

export interface MusicThumbnail {
    url: string;
    width: number;
    height: number;
}

export interface MusicArtist {
    name: string;
    id?: string;
}

/**
 * 共通ベース定義
 */
interface BaseMusicItem {
    type: ItemType;
    title: string;
    thumbnails: MusicThumbnail[];
    subtitle?: string;
}

/**
 * 楽曲アイテム (再生可能)
 */
export interface SongItem extends BaseMusicItem {
    type: 'SONG';
    youtube_video_id: string; // 必須: 再生に必要
    artists: MusicArtist[];
    album?: {
        name: string;
        youtube_browse_id: string;
    };
    duration?: {
        text: string;
        seconds: number;
    };
    youtube_playlist_id?: string; // 再生コンテキスト用
}

/**
 * アルバムアイテム (トラックリストを持つ)
 */
export interface AlbumItem extends BaseMusicItem {
    type: 'ALBUM';
    youtube_browse_id: string; // 必須: 詳細取得に必要
    artists: MusicArtist[];
    year?: string;
    youtube_playlist_id?: string; // 連続再生用
}

/**
 * プレイリストアイテム
 */
export interface PlaylistItem extends BaseMusicItem {
    type: 'PLAYLIST';
    youtube_playlist_id: string; // 必須: 詳細取得・再生に必要
    author?: string;
    item_count?: number;
}

/**
 * アーティストアイテム
 */
export interface ArtistItem extends BaseMusicItem {
    type: 'ARTIST';
    youtube_browse_id: string; // 必須: 詳細取得に必要
    subscriber_count?: string;
}

/**
 * チャートアイテム (ランキング)
 */
export interface ChartItem extends BaseMusicItem {
    type: 'CHART';
    youtube_playlist_id: string; // 必須: チャートはプレイリスト形式
    region?: string;
}

/**
 * ラジオ/ミックスアイテム
 */
export interface RadioItem extends BaseMusicItem {
    type: 'RADIO';
    youtube_playlist_id: string; // 必須: RD... プレフィックス
    seed_video_id?: string; // ラジオの起点となった楽曲
}

/**
 * UI が扱う最小単位の音楽アイテム (Discriminated Union)
 */
export type MusicItem = SongItem | AlbumItem | PlaylistItem | ArtistItem | ChartItem | RadioItem;

// 型ガード関数
export function isSongItem(item: MusicItem): item is SongItem {
    return item.type === 'SONG';
}

export function isAlbumItem(item: MusicItem): item is AlbumItem {
    return item.type === 'ALBUM';
}

export function isPlaylistItem(item: MusicItem): item is PlaylistItem {
    return item.type === 'PLAYLIST';
}

export function isArtistItem(item: MusicItem): item is ArtistItem {
    return item.type === 'ARTIST';
}

export function isChartItem(item: MusicItem): item is ChartItem {
    return item.type === 'CHART';
}

export function isRadioItem(item: MusicItem): item is RadioItem {
    return item.type === 'RADIO';
}

/** 
 * セクション単位のアイテムリスト（アーティスト詳細などで使用）
 */
export interface MusicSection {
    title: string;
    items: MusicItem[];
    type?: string;
}

/**
 * アルバムやプレイリスト、アーティストの詳細ページ（Header + Tracks/Sections）
 * 注: MusicItem の全ての型をサポートするため、共通フィールドのみを定義
 */
export interface MusicDetail {
    // BaseMusicItem fields (always present)
    type: ItemType;
    title: string;
    thumbnails: MusicThumbnail[];
    subtitle?: string;

    // Type-specific IDs (optional)
    youtube_browse_id?: string;
    youtube_playlist_id?: string;
    youtube_video_id?: string;

    // Type-specific fields (optional)
    artists?: MusicArtist[];
    album?: {
        name: string;
        youtube_browse_id: string;
    };

    // MusicDetail-specific fields
    description?: string;
    tracks: MusicItem[];
    sections?: MusicSection[];
}
