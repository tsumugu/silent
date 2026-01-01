# Feature 01: 設定管理と環境設定 (Settings & Preferences)

アプリの動作設定（Dock/Menu Bar モード、自動起動など）を永続化し、それらを直感的に変更できる環境設定 UI、およびアプリ情報（About）を実装します。

## 実装内容

### 1. SettingsService の作成 (`src/main/services/SettingsService.ts`)
- `electron-store` を使用して設定を保存します。
- 保存項目:
    - `displayMode`: `'dock' | 'menuBar'` (デフォルト: `'menuBar'`)
    - `launchAtLogin`: `boolean` (デフォルト: `false`)
    - `tray`:
        - `showTrackTitle`: `boolean` (デフォルト: `true`)
        - `enableScrolling`: `boolean` (デフォルト: `true`)

### 2. アプリ基盤の制御 (`src/main/index.ts`)
- `displayMode` に応じた起動制御:
    - `menuBar` モード: `app.dock.hide()` を実行し、UIWindow を Taskbar から隠す。
    - `dock` モード: 通常のアプリとして表示。
- 自動起動: `app.setLoginItemSettings()` による制御。

### 3. About メニューの実装 (独自実装)
- `silent` の世界観を崩さないよう、**半透明（Vibrancy）かつスケルトンな独自ウィンドウ**として実装します。
- `Main` プロセスで `AboutWindow.ts` を作成し、`transparent: true` や `vibrancy` を設定します。
- 内容: アプリ名称、バージョン、著作権情報を React コンポーネントとして実装し、メインウィンドウと同様の質感を与えます。
- Menu Bar モード時でも、Tray のコンテキストメニューからいつでも呼び出せるようにします。

### 4. 環境設定画面 (Preferences UI)
- メインウィンドウとは別に作成
- Menu Bar モード時でも、Tray のコンテキストメニューからいつでも呼び出せるようにします。
- **General**: 表示モード切替、自動起動。
- **Menu Bar**: 曲名表示の有無、アニメーション、スクロールの有効化。
- **反映**: 設定変更時に `SettingsService` に即座に保存。表示モードなど変更に再起動が必要な場合はダイアログを表示し、`app.relaunch()` を実行します。

## 技術的ポイント
- **再起動プロンプト**: `displayMode` の変更は Electron の基本動作に関わるため、変更確定時にユーザーに再起動を促します。
- **About ウィンドウのデザイン**: メインウィンドウと同様に `under-window` などの vibrancy を適用し、情報の周りに十分な余白（Skeleton さ）を持たせた美しいデザインにします。
