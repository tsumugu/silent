# Epic C: Renderer簡素化 + 補間ロジック整理

## 目的

RendererをMain Processからの状態を**受信・表示するだけ**の層に簡素化し、補間ロジックを整理する。

---

## 背景

- 現状: `playerStore.ts` が状態を保持、`SeekBar.tsx` が補間とバリデーションを行う
- 問題: Renderer側でも状態の「正しさ」を判断するロジックがあり、責務が分散

---

## 提案する変更

### 1. `playerStore.ts` の簡素化

```typescript
// store/playerStore.ts
import { create } from 'zustand';
import { PlaybackInfo } from '../../shared/types/playback';

interface PlayerState {
  playbackInfo: PlaybackInfo | null;
}

export const usePlayerStore = create<PlayerState>(() => ({
  playbackInfo: null,
}));

// 外部からの更新専用 (コンポーネントからは呼ばない)
export function setPlaybackInfo(info: PlaybackInfo | null) {
  usePlayerStore.setState({ playbackInfo: info });
}
```

### 2. `useMediaSession.ts` の簡素化

```typescript
// hooks/useMediaSession.ts
import { useEffect } from 'react';
import { setPlaybackInfo } from '../store/playerStore';

export function useMediaSession() {
  useEffect(() => {
    // Main Processからの状態をそのまま反映
    const unsubscribe = window.electronAPI.onPlaybackState((info) => {
      setPlaybackInfo(info);
    });

    // 初期状態取得
    window.electronAPI.getPlaybackState().then(setPlaybackInfo);

    return unsubscribe;
  }, []);
}
```

### 3. `SeekBar.tsx` の整理

**責務**: 補間のみ。バリデーションは行わない。

```tsx
// SeekBar.tsx
export function SeekBar({ currentTime, duration, isPlaying, videoId }: SeekBarProps) {
  const [visualTime, setVisualTime] = useState(0);
  const prevVideoIdRef = useRef(videoId);
  const lastUpdateRef = useRef(Date.now());

  // videoId変更時にリセット
  useEffect(() => {
    if (prevVideoIdRef.current !== videoId) {
      setVisualTime(0);
      lastUpdateRef.current = Date.now();
      prevVideoIdRef.current = videoId;
    }
  }, [videoId]);

  // currentTime変更時に同期
  useEffect(() => {
    setVisualTime(currentTime);
    lastUpdateRef.current = Date.now();
  }, [currentTime]);

  // 補間ループ
  useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    let frameId: number;
    const animate = () => {
      const now = Date.now();
      const delta = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      setVisualTime(prev => Math.min(prev + delta, duration));
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, duration]);

  // duration未確定時は表示無効化
  const displayTime = duration > 0 ? visualTime : 0;
  const displayDuration = duration > 0 ? duration : 0;
  const progress = displayDuration > 0 ? (displayTime / displayDuration) * 100 : 0;

  return (
    // ... JSX (変更なし)
  );
}
```

---

## 削除するロジック

- `playerStore.ts` 内の `isPlaying` 派生状態（必要なら `playbackInfo.playbackState === 'playing'` で導出）
- `SeekBar.tsx` 内の複雑なバリデーション（Main Processで済んでいるはず）

---

## 検証方法

1. 曲を再生し、シークバーが滑らかに動くことを確認
2. 一時停止時に補間が止まることを確認
3. 曲切り替え時にシークバーが0:00にリセットされることを確認
4. duration=0（ロード中）時にシークバーが表示されない/無効化されていることを確認
