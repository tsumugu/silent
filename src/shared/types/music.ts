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
 * アルバムやプレイリストの詳細ページ（Header + Tracks）
 */
export interface MusicDetail extends MusicItem {
    description?: string;
    tracks: MusicItem[];
}
