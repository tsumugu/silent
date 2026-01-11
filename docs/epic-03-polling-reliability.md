# Epic 3: ポーリングの信頼性向上

## 目的

隠しウィンドウからの状態報告が長時間途絶える問題（Loading状態が続く）を解消し、ポーリングの信頼性を高める。

---

## 背景・課題

-   `block_updates` フラグがナビゲーション中に `true` になり、ページロード完了後に解除されるはずだが、特定条件下で解除されないことがある。
-   その結果、UIは「Loading」のまま更新を受け取れなくなり、次の曲に遷移できない。

---

## 提案する変更

### 1. ウォッチドッグタイマーの導入 (`hidden-preload.ts`)

`block_updates` が長時間 `true` のままの場合に、強制的に解除するタイマーを追加。

```typescript
let blockWatchdogTimer: number | undefined;

function startBlockWatchdog() {
  clearBlockWatchdog();
  blockWatchdogTimer = window.setTimeout(() => {
    if ((window as any).block_updates) {
      console.warn('[HiddenPreload] Watchdog: force unblocking updates');
      (window as any).block_updates = false;
      forceUpdateState();
    }
  }, 5000); // 5秒後に強制解除
}

function clearBlockWatchdog() {
  if (blockWatchdogTimer) {
    clearTimeout(blockWatchdogTimer);
    blockWatchdogTimer = undefined;
  }
}

// beforeunload で開始
window.addEventListener('beforeunload', () => {
  (window as any).block_updates = true;
  startBlockWatchdog();
  // ...
});

// load, playing イベントで解除
function handleLoadFinish() {
  clearBlockWatchdog();
  (window as any).block_updates = false;
  forceUpdateState();
}
```

### 2. Main Processからのヘルスチェック

一定時間 `PLAYBACK_STATE_CHANGED` を受信しない場合、Main ProcessからHidden Windowに対してリロードを指示する（オプション）。

```typescript
// handlers.ts
let lastStateReceivedAt = Date.now();

ipcMain.on(IPCChannels.PLAYBACK_STATE_CHANGED, async (_event, playbackInfo) => {
  lastStateReceivedAt = Date.now();
  // ...
});

// 定期チェック (例: 30秒ごと)
setInterval(() => {
  if (Date.now() - lastStateReceivedAt > 15000 && lastPlaybackInfo?.playbackState === 'loading') {
    console.warn('[Main] No state update for 15s during loading, consider reload');
    // hiddenWindow.reload(); // オプション
  }
}, 10000);
```

---

## 検証方法

1.  曲を再生中に、ネットワークを一時的に切断・再接続する。
2.  Loading状態が5秒以上続かず、再生が再開されることを確認。
3.  複数の曲を連続で切り替え、UIがハングしないことを確認。
