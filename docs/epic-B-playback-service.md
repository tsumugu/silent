# Epic B: PlaybackService作成 (Main Process一元化)

## 目的

再生状態の管理をMain Processの`PlaybackService`に集約し、**Single Source of Truth**を確立する。

---

## 背景

- 現状: Hidden Window / Main Process (`handlers.ts`) / Renderer がそれぞれ状態を保持
- 問題: 状態の整合性を取るロジックが分散し、どこが正しいかわかりにくい

---

## 提案する変更

### 1. `PlaybackService.ts` の新規作成

```typescript
// src/main/services/PlaybackService.ts
import { BrowserWindow } from 'electron';
import { PlaybackInfo, RawPlaybackState } from '../../shared/types/playback';
import { ytMusicService } from './YTMusicService';

class PlaybackService {
  private state: PlaybackInfo | null = null;
  private currentVideoId: string | null = null;
  private referenceDuration = 0;
  private enrichmentVersion = 0;

  // Hidden Windowからの生データを受信
  handleRawState(raw: RawPlaybackState): void {
    // videoId変更 → 完全リセット
    if (raw.videoId !== this.currentVideoId) {
      this.handleTrackChange(raw);
      return;
    }

    // 通常の状態更新
    this.updateState(raw);
  }

  private handleTrackChange(raw: RawPlaybackState): void {
    this.currentVideoId = raw.videoId;
    this.referenceDuration = 0;
    this.enrichmentVersion++;

    // 初期状態をブロードキャスト
    this.state = {
      metadata: {
        videoId: raw.videoId,
        title: raw.title,
        artist: raw.artist,
        artwork: raw.artwork,
      },
      playbackState: 'loading',
      position: 0,
      duration: 0,
    };
    this.broadcast();

    // 非同期でEnrichment
    this.fetchEnrichment(raw.videoId, this.enrichmentVersion);
  }

  private updateState(raw: RawPlaybackState): void {
    const duration = this.referenceDuration > 0 
      ? this.referenceDuration 
      : raw.duration;

    const position = Math.min(raw.position, duration);

    this.state = {
      ...this.state!,
      playbackState: raw.playbackState,
      position,
      duration,
    };
    this.broadcast();
  }

  private async fetchEnrichment(videoId: string, version: number): Promise<void> {
    try {
      const details = await ytMusicService.getSongDetails(videoId);
      
      // バージョンチェック: 新しい曲に切り替わっていたら破棄
      if (version !== this.enrichmentVersion || !this.state) return;

      if (details?.duration?.seconds) {
        this.referenceDuration = details.duration.seconds;
      }

      this.state = {
        ...this.state,
        duration: this.referenceDuration || this.state.duration,
        metadata: {
          ...this.state.metadata,
          artists: details?.artists,
          albumId: details?.album?.youtube_browse_id,
        },
      };
      this.broadcast();
    } catch (e) {
      console.warn('[PlaybackService] Enrichment failed:', e);
    }
  }

  private broadcast(): void {
    if (!this.state) return;
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('playback:state', this.state);
      }
    });
  }

  getState(): PlaybackInfo | null {
    return this.state;
  }
}

export const playbackService = new PlaybackService();
```

### 2. `handlers.ts` の簡素化

```typescript
// Before: 大量のロジックが直接 ipcMain.on 内に
// After: PlaybackServiceに委譲

import { playbackService } from '../services/PlaybackService';

ipcMain.on('playback:raw-state', (_event, raw: RawPlaybackState) => {
  playbackService.handleRawState(raw);
});

ipcMain.handle('playback:get-state', () => {
  return playbackService.getState();
});
```

### 3. IPC型定義の更新

```typescript
// shared/types/playback.ts
export interface RawPlaybackState {
  videoId: string;
  title: string;
  artist: string;
  artwork: { src: string }[];
  playbackState: 'playing' | 'paused' | 'loading';
  position: number;
  duration: number;
}
```

---

## 削除するロジック

- `handlers.ts` 内の `lastPlaybackInfo`, `lastPlayContext`, `enrichmentVersion`, `referenceDuration` 等の分散した状態変数
- 直接的な状態加工ロジック（全て `PlaybackService` へ移動）

---

## 検証方法

1. 曲を再生し、Renderer側で正しい状態が表示されることを確認
2. 曲を連続で切り替え、状態が正しくリセットされることを確認
3. Enrichmentが適用され、アーティストID等が取得できることを確認
