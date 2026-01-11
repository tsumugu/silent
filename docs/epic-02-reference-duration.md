# Epic 2: referenceDuration の管理改善

## 目的

Mainプロセスで保持する「公式の曲長 (`referenceDuration`)」の管理を堅牢にし、シークバーが曲の長さを突き抜ける問題を解消する。

---

## 背景・課題

-   `referenceDuration` は、YouTube Musicから報告される `duration` が不安定なため、APIから取得した正確な値をキャップとして使用している。
-   しかし、新曲ロード時にこの値がリセットされないと、新曲の `position` が旧曲の短い `duration` でキャップされてしまう。
-   逆に、APIから取得が遅れると、DOMからの報告値がそのまま使われ、不正確な表示になる。

---

## 提案する変更

### 1. `referenceDuration` の明示的なライフサイクル管理

`handlers.ts` 内で、`referenceDuration` を **曲IDと紐づけて管理** する。

```typescript
let referenceDurationMap: Record<string, number> = {};

// YT_PLAY 時
referenceDurationMap = {}; // 全クリア

// PLAYBACK_STATE_CHANGED 時
const currentRef = referenceDurationMap[currentVideoId] || 0;
if (currentRef > 0) {
  playbackInfo.duration = currentRef;
  // ...
}

// getSongDetails 成功時
if (songDetails.duration?.seconds) {
  referenceDurationMap[currentVideoId] = songDetails.duration.seconds;
}
```

### 2. Duration未確定時のUI表示

-   `duration` が `0` または `undefined` の場合、シークバーを無効化（グレーアウト）するか、時間表示を `--:--` にする。

```tsx
// SeekBar.tsx
const durationDisplay = duration > 0 ? formatTime(duration) : '--:--';
```

---

## 検証方法

1.  曲を再生し、APIからの情報取得前（ロード中）にシークバーが動かないことを確認。
2.  曲が変わった際、旧曲の `duration` でシークバーが表示されないことを確認。
3.  曲の終端まで再生し、シークバーがちょうど `duration` で止まることを確認。
