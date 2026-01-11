# Epic A: RxJS導入 + Hidden Windowイベント駆動化

## 目的

Hidden Windowの状態取得を、100msポーリングから**Video要素のイベント駆動 + RxJS**に移行する。

---

## 背景

- 現状: 100ms `setInterval` でDOM/Videoをポーリング → 状態比較 → IPC送信
- 問題: ポーリング間隔の間に状態変化が起きると検知漏れ、またはレースコンディション発生

---

## 提案する変更

### 1. RxJSインストール

```bash
pnpm add rxjs
```

### 2. `hidden-preload.ts` の書き換え

**Before (ポーリング)**:
```typescript
setInterval(observePlayback, 100);
```

**After (イベント駆動 + RxJS)**:
```typescript
import { fromEvent, merge, interval, EMPTY, BehaviorSubject } from 'rxjs';
import { 
  map, distinctUntilChanged, switchMap, 
  debounceTime, filter, startWith 
} from 'rxjs/operators';

// Video要素の検出 (要素が動的に変わる可能性があるため監視)
const videoElement$ = new BehaviorSubject<HTMLVideoElement | null>(null);

interval(500).pipe(
  map(() => findActiveVideoElement()),
  distinctUntilChanged()
).subscribe(v => videoElement$.next(v));

// メインストリーム
const playback$ = videoElement$.pipe(
  switchMap(video => {
    if (!video) return EMPTY;

    // Video要素のイベントをマージ
    return merge(
      fromEvent(video, 'timeupdate'),
      fromEvent(video, 'durationchange'),
      fromEvent(video, 'play'),
      fromEvent(video, 'pause'),
      fromEvent(video, 'ended'),
      fromEvent(video, 'loadedmetadata'),
      fromEvent(video, 'seeking'),
      fromEvent(video, 'seeked')
    ).pipe(
      startWith(null), // 初回状態を即座に取得
      map(() => extractPlaybackState(video)),
      filter(state => state !== null)
    );
  }),
  distinctUntilChanged((a, b) => 
    a.videoId === b.videoId && 
    a.playbackState === b.playbackState &&
    Math.abs(a.position - b.position) < 0.5
  ),
  debounceTime(30) // 細かいノイズ除去
);

// IPC送信
playback$.subscribe(state => {
  ipcRenderer.send('playback:raw-state', state);
});
```

### 3. `extractPlaybackState` の簡素化

```typescript
function extractPlaybackState(video: HTMLVideoElement): RawPlaybackState | null {
  const metadata = extractMetadata(); // DOM からタイトル等
  if (!metadata) return null;

  return {
    videoId: metadata.videoId,
    title: metadata.title,
    artist: metadata.artist,
    artwork: metadata.artwork,
    playbackState: video.paused ? 'paused' : 'playing',
    position: video.currentTime,
    duration: video.duration || 0,
  };
}
```

---

## 削除するロジック

- `setInterval(observePlayback, 100)`
- `lastStateText`, `lastStateTime` による手動diffロジック
- `block_updates` フラグ（イベント駆動では不要）

---

## 検証方法

1. 曲を再生し、シークバーが滑らかに動くことを確認
2. 曲を切り替え、即座に状態がリセットされることを確認
3. DevToolsでIPC送信頻度を確認（ポーリング時より減っているはず）
