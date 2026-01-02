import { Innertube } from 'youtubei.js';
import { session } from 'electron';

/**
 * YouTube Music API クライアント (Infrastructure Layer)
 * youtubei.js をラップし、認証と生データの取得のみを担当
 */
export class YTMusicClient {
    private innertube: Innertube | null = null;
    private isInitialized = false;

    /**
     * Innertube インスタンスの初期化
     */
    async initialize(force = false): Promise<void> {
        if (this.isInitialized && !force && this.innertube) return;

        try {
            // Electron session から YouTube 関連のクッキーを取得
            const dotYoutube = await session.defaultSession.cookies.get({ domain: '.youtube.com' });
            const musicYoutube = await session.defaultSession.cookies.get({ domain: 'music.youtube.com' });
            const wwwYoutube = await session.defaultSession.cookies.get({ domain: 'www.youtube.com' });
            const accountsYoutube = await session.defaultSession.cookies.get({ domain: 'accounts.youtube.com' });

            // 重複を削除してクッキー文字列を生成
            const allCookies = [...dotYoutube, ...musicYoutube, ...wwwYoutube, ...accountsYoutube];
            const uniqueCookies = Array.from(new Map(allCookies.map(c => [c.name, c])).values());
            const cookieString = uniqueCookies.map(c => `${c.name}=${c.value}`).join('; ');

            // Innertube インスタンスを作成
            const { settingsService } = require('../services/SettingsService');
            const settings = settingsService.getSettings();

            this.innertube = await Innertube.create({
                cookie: cookieString,
                lang: settings.language || 'en',
                location: settings.location || 'US'
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('[YTMusicClient] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * ログイン状態の確認
     */
    isLoggedIn(): boolean {
        return this.innertube?.session.logged_in ?? false;
    }

    /**
     * ログイン状態の非同期チェック
     */
    async checkLoginStatus(): Promise<boolean> {
        await this.initialize();
        return this.isLoggedIn();
    }

    /**
     * ホームフィードの取得 (生データ)
     */
    async getHomeFeed(): Promise<any> {
        await this.initialize();
        if (!this.innertube) {
            throw new Error('[YTMusicClient] Innertube not initialized');
        }

        return await this.innertube.music.getHomeFeed();
    }

    /**
     * アルバム詳細の取得 (生データ)
     */
    async getAlbumRaw(albumId: string): Promise<any> {
        await this.initialize();
        if (!this.innertube) {
            throw new Error('[YTMusicClient] Innertube not initialized');
        }

        return await this.innertube.music.getAlbum(albumId);
    }

    /**
     * プレイリスト詳細の取得 (生データ)
     */
    async getPlaylistRaw(playlistId: string): Promise<any> {
        await this.initialize();
        if (!this.innertube) {
            throw new Error('[YTMusicClient] Innertube not initialized');
        }

        return await this.innertube.music.getPlaylist(playlistId);
    }

    /**
     * アーティスト詳細の取得 (生データ)
     */
    async getArtistRaw(artistId: string): Promise<any> {
        await this.initialize();
        if (!this.innertube) {
            throw new Error('[YTMusicClient] Innertube not initialized');
        }

        return await this.innertube.music.getArtist(artistId);
    }

    /**
     * 楽曲情報の取得 (生データ)
     */
    async getSongInfoRaw(videoId: string): Promise<any> {
        await this.initialize();
        if (!this.innertube) {
            throw new Error('[YTMusicClient] Innertube not initialized');
        }

        return await this.innertube.music.getInfo(videoId);
    }

    /**
     * 検索の実行 (生データ)
     */
    async searchRaw(query: string): Promise<any> {
        await this.initialize();
        if (!this.innertube) {
            throw new Error('[YTMusicClient] Innertube not initialized');
        }

        return await this.innertube.music.search(query);
    }
}
