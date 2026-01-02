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

        // Preferences - General
        preferences: "Preferences",
        software: "Software",
        update_check: "Check for Updates",
        update_checking: "Checking...",
        update_available: (v: string) => `New version available: v${v}`,
        update_up_to_date: "Your version is up to date.",
        view_on_github: "View on GitHub",

        // Preferences - Mode
        mode: "Mode",
        dock_app: "Dock App",
        menu_bar_app: "Menu Bar App",
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

        // Preferences - General
        preferences: "設定",
        software: "ソフトウェア",
        update_check: "アップデートを確認",
        update_checking: "確認中...",
        update_available: (v: string) => `新しいバージョンが利用可能です: v${v}`,
        update_up_to_date: "現在のバージョンは最新です。",
        view_on_github: "GitHubで見る",

        // Preferences - Mode
        mode: "表示モード",
        dock_app: "Dockアプリ",
        menu_bar_app: "メニューバーアプリ",
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
    },
};

export type Translations = typeof translations.en;
