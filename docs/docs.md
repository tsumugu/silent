YouTube Music macOS Client (Project "Vibrant") Specification

1. プロジェクト概要

YouTube MusicのWeb版をエンジンとして活用し、macOSのネイティブな質感（Vibrancy/透け感）と、Ghosttyのようなミニマリズムを追求した「非公式」デスクトップクライアント。

コアコンセプト

Quiet App: 普段はジャケットアートと透過背景のみ。

Vibrant UI: Apple Musicのようなボケ味のある透過ウィンドウ。

Jacket-First: 探索（Dig）は文字ではなく「ジャケット」を主役にする。

2. 技術スタック

Framework: Electron (Node.js)

Frontend: React + Tailwind CSS + framer-motion

Audio Engine: Hidden Electron BrowserWindow (loading music.youtube.com)

Data API: youtube-music-api (Node.js library)

Platform: macOS (Target: vibrancy 'under-window')

3. システムアーキテクチャ

3つのプロセスが強調して動作する設計にする。

A. Main Process (Node.js)

ウィンドウ管理（透明度、フレームレス設定）。

youtube-music-api の実行環境。

Hidden Window からCookieを抽出し、APIに提供する認証プロキシ。

B. Hidden Window (Player Engine)

music.youtube.com を非表示でロード。

navigator.mediaSession を監視し、再生情報をメインプロセスへ送信。

音声再生の「実体」。

C. UI Window (Renderer)

ユーザーに表示される唯一のウィンドウ。

backdrop-filter: blur(20px) を多用した透過デザイン。

マウスホバー時のみUIを表示するステート管理。

4. 機能詳細設計

再生画面 (Default Player View)

通常時: ジャケット画像のみ。背景はアートワークのメインカラーを反映したグラデーション。

マウスオーバー時:

上部: 曲名、アーティスト名（Apple風フォント）。

下部: 再生/停止、スキップ、プログレスバー。

いずれも framer-motion でフェードイン。

探索・ライブラリ画面 (Dig & Library View)

遷移: スクロールやスワイプで再生画面と切り替え。

Dig用API: ytmusic.getCharts(), ytmusic.getHome()

Library用API: ytmusic.getLibraryAlbums()

UI表現: ジャケットがタイル状に並ぶMasonryレイアウト。

5. 実装ガイドライン (Claude Code向け)

Step 1: Window Setup

new BrowserWindow({
  frame: false,
  transparent: true,
  vibrancy: 'under-window',
  visualEffectState: 'followWindowActiveState',
  webPreferences: { preload: '...' }
});


Step 2: Auth Sync Logic

Hidden Window でログイン完了を検知。

session.defaultSession.cookies.get でCookieを取得。

ytmusic.init({ cookie: cookieString }) でAPIを初期化。

Step 3: Media Session Observer

preload.js で navigator.mediaSession.metadata を定期的、または変更時にフックし、ipcRenderer.send でメインプロセスに送信する。

Step 4: UI Interaction

pointer-events: none をデフォルトにし、特定の操作（スクロール、ホバー）でUIをアクティブにする。

背景のグラデーションは canvas または css filter を用いて、曲のアートワーク色から動的に生成する。

6. 独自性（差別化ポイント）

Ghostty-style transparency: フォーカスが外れるとより透明になり、背後の壁紙に溶け込む。

No Toolbar: -webkit-app-region: drag を特定のエリアにのみ適用し、一切のウィンドウ枠を排除する。

Interactive Digging: ジャケットのドラッグ＆ドロップでライブラリ追加。

7. 考慮事項

YouTube Musicの内部APIの仕様変更に備え、取得失敗時のフォールバック（MediaSessionへの依存度を高める）を実装すること。