export type Language = 'en' | 'ja';

export const translations = {
    en: {
        // App / Common
        back: "Back",
        loading: "Loading...",
        searching: "Searching...",
        fetching: "Fetching content...",
        no_results: "No results found",
        no_results_sub: (query: string) => `No songs, albums, or playlists found for "${query}"`,
        login_required: "Login Required",
        login_message: "Please login to enjoy your personalized YouTube Music experience.",
        login_button: "Login to YouTube Music",
        search_placeholder: "Search songs, albums, playlists...",
        error_title: "Something went wrong",
        failed_search: "Search failed. Please try again.",
        failed_home: "Failed to fetch home content.",
        failed_load_type: (type: string) => `Failed to load ${type}`,
        back_to_library: "Back to Library",
        songs_count: (count: number) => count === 1 ? "1 song" : `${count} songs`,
        title_label: "Title",
        time_label: "Time",
        loading_tracks: "Loading tracks...",
        no_tracks: "No tracks found",
        close_player: "Close Player (Esc)",
        current_version: "Current Version",
        artist_label: "Artist",
        album_label: "Album",
        playlist_label: "Playlist",
        about: "About",
        version: "Version",
        previous: "Previous",
        next: "Next",
        play: "Play",
        pause: "Pause",
        unknown_title: "Unknown Title",
        unknown_artist: "",

        // Preferences - General
        preferences: "Preferences",
        general: "General",
        software: "Software",
        update_check: "Check for Updates",
        update_checking: "Checking...",
        update_available: (v: string) => `New version available: v${v}`,
        update_up_to_date: "Your version is up to date.",
        view_on_github: "View on GitHub",
        cache_management: "Cache Management",
        cache_size: "Current Cache Size",
        clear_cache: "Clear Cache",
        clearing: "Clearing...",
        clear_cache_confirm: "Are you sure you want to clear the cache? This will reset all temporarily saved metadata and images.",
        cache_description: "Metadata is cached for 24 hours, and images are cached for 3 days.",

        // Preferences - Mode
        mode: "Mode",
        dock_app: "Dock",
        menu_bar_app: "Menu Bar",
        restart_required_notice: "Restart required to apply changes",

        // Preferences - Content
        content: "Content",
        content_language: "Content Language",
        content_language_desc: "Language of recommendations and metadata. Changes take effect after restart.",

        // Preferences - Menu Bar
        menu_bar: "Menu Bar",
        show_track_title: "Show Track Title in Menu Bar",
        enable_scrolling: "Enable Scrolling Marquee",

        // Preferences - Startup
        startup: "Startup",
        launch_at_login: "Launch at Login",

        // Restart Prompt
        restart_prompt_title: "Settings changed",
        restart_prompt_message: "Silent needs to restart for these changes to take effect.",
        restart_prompt_confirm: "Restart now?",
        restart_dev_message: "The app will quit now. Please restart it manually from your terminal or IDE.",

        // Genres / Sections
        songs: "Songs",
        albums: "Albums",
        playlists: "Playlists",
        artists: "Artists",
        recommended: "Recommended",
        new_releases: "New Releases",
        shuffle: "Shuffle",
        shuffle_play: "Shuffle Play",
        liked_music: "Liked Music",
        share: "Share",
    },
    ja: {
        // App / Common
        back: "戻る",
        loading: "読み込み中...",
        searching: "検索中...",
        fetching: "取得中...",
        no_results: "結果が見つかりませんでした",
        no_results_sub: (query: string) => `"${query}" に一致する曲、アルバム、プレイリストが見つかりません`,
        login_required: "ログインが必要です",
        login_message: "YouTube Musicのパーソナライズされた体験を楽しむにはログインが必要です。",
        login_button: "YouTube Musicにログイン",
        search_placeholder: "曲、アルバム、プレイリストを検索...",
        error_title: "問題が発生しました",
        failed_search: "検索に失敗しました。もう一度お試しください。",
        failed_home: "ホームコンテンツの取得に失敗しました。",
        failed_load_type: (type: string) => `${type}の読み込みに失敗しました`,
        back_to_library: "ライブラリに戻る",
        songs_count: (count: number) => `${count} 曲`,
        title_label: "Title",
        time_label: "Time",
        loading_tracks: "曲を読み込み中...",
        no_tracks: "曲が見つかりませんでした",
        close_player: "プレーヤーを閉じる (Esc)",
        current_version: "現在のバージョン",
        artist_label: "Artist",
        album_label: "Album",
        playlist_label: "Playlist",
        about: "このアプリについて",
        version: "バージョン",
        previous: "前へ",
        next: "次へ",
        play: "再生",
        pause: "一時停止",
        unknown_title: "タイトル不明",
        unknown_artist: "",

        // Preferences - General
        preferences: "設定",
        general: "一般",
        software: "ソフトウェア",
        update_check: "アップデートを確認",
        update_checking: "確認中...",
        update_available: (v: string) => `新しいバージョンが利用可能です: v${v}`,
        update_up_to_date: "現在のバージョンは最新です。",
        view_on_github: "GitHubで見る",
        cache_management: "キャッシュ管理",
        cache_size: "現在のキャッシュサイズ",
        clear_cache: "キャッシュをクリア",
        clearing: "削除中...",
        clear_cache_confirm: "キャッシュをクリアしてもよろしいですか？保存されているメタデータや画像がリセットされます。",
        cache_description: "メタデータは24時間、画像は3日間保持されます。",

        // Preferences - Mode
        mode: "表示モード",
        dock_app: "Dock",
        menu_bar_app: "メニューバー",
        restart_required_notice: "変更を適用するには再起動が必要です",

        // Preferences - Content
        content: "コンテンツ",
        content_language: "コンテンツの言語",
        content_language_desc: "おすすめやメタデータの言語設定。再起動後に反映されます。",

        // Preferences - Menu Bar
        menu_bar: "メニューバー",
        show_track_title: "メニューバーに曲名を表示",
        enable_scrolling: "曲名をスクロールさせる",

        // Preferences - Startup
        startup: "起動設定",
        launch_at_login: "ログイン時に自動起動",

        // Restart Prompt
        restart_prompt_title: "設定を変更しました",
        restart_prompt_message: "変更を適用するには、Silentを再起動する必要があります。",
        restart_prompt_confirm: "今すぐ再起動しますか？",
        restart_dev_message: "アプリを終了します。ターミナルまたはIDEから手動で再起動してください。",

        // Genres / Sections
        songs: "曲",
        albums: "アルバム",
        playlists: "プレイリスト",
        artists: "アーティスト",
        recommended: "おすすめ",
        new_releases: "新着",
        shuffle: "シャッフル",
        shuffle_play: "シャッフル再生",
        liked_music: "高評価した曲",
        share: "共有",
    },
};

export type Translations = typeof translations.en;
