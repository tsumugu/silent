export type ItemType = 'SONG' | 'ALBUM' | 'PLAYLIST' | 'ARTIST' | 'UNKNOWN';

export interface MusicThumbnail {
    url: string;
    width?: number;
    height?: number;
}

export interface MusicArtist {
    name: string;
    id?: string;
}

/** 
 * UI が扱う最小単位の音楽アイテム
 */
export interface MusicItem {
    type: ItemType;
    title: string;
    thumbnails: MusicThumbnail[];
    artists: MusicArtist[];
    subtitle?: string;
    album?: {
        youtube_browse_id: string;
        name: string;
    };
    duration?: {
        text?: string;
        seconds?: number;
    };

    // API リクエスト用の YouTube 識別子
    youtube_video_id?: string;
    youtube_browse_id?: string;
    youtube_playlist_id?: string;
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
 */
export interface MusicDetail extends MusicItem {
    description?: string;
    tracks: MusicItem[];
    sections?: MusicSection[];
}
