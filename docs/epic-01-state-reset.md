# Epic 1: 状態リセットの強化

## 目的

曲が切り替わった際に、古い曲の再生情報が新しい曲の表示に影響しないよう、各層でのリセット処理を確実にする。

---

## 背景・課題

-   `videoId` が変化しても、旧曲の `position` や `duration` が一瞬送られてきて、UI側のリセットを上書きしてしまう。
-   シークバーが0:00に戻らない、または旧曲の時間が残る原因となっている。

---

## 提案する変更

### 1. Hidden Window (`hidden-preload.ts`)

-   `videoId` 変更を検知した際、**リセット完了を待ってからポーリングを再開**するロジックを追加。
-   `currentVideoElement` が変わった場合も、明示的に `lastStateText` 等をクリア。

```typescript
// videoId変更時に追加
if (metadata.videoId && metadata.videoId !== lastVideoId) {
  // 既存のリセット処理に加え...
  currentVideoElement = null; // 強制的に再取得させる
}
```

### 2. Main Process (`handlers.ts`)

-   `YT_PLAY` 受信時に `referenceDuration = 0` を**即座に**リセット。
-   `PLAYBACK_STATE_CHANGED` で `videoId` が変わったことを検知した場合、`referenceDuration` を再リセット。

```typescript
// YT_PLAY の冒頭で
referenceDuration = 0;
lastEnrichedVideoId = null;
lastEnrichedMetadata = null;
```

### 3. Renderer (`SeekBar.tsx`)

-   `videoId` propsの変化検知ロジックは既に存在するが、`duration` が0の場合は補間を停止し、時間表示を `--:--` 等にするガードを追加。

```typescript
// 補間ループ内
if (duration <= 0) {
  // duration未確定なら補間しない
  lastUpdateTimeRef.current = Date.now();
  return;
}
```

---

## 検証方法

1.  アルバムまたはプレイリストを再生し、曲を連続で自動遷移させる。
2.  曲が変わったタイミングでシークバーが `0:00` から始まることを確認。
3.  旧曲の `duration` が残っていないことを確認。
