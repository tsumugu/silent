import { BrowserWindow } from 'electron';
import { PlaybackInfo, MediaMetadata } from '../../shared/types/playback';
import { MusicArtist, isSongItem } from '../../shared/types/music';
import { ytMusicService } from './YTMusicService';
import { IPCChannels } from '../ipc/types';

/**
 * PlaybackService
 *
 * Main Processでの再生状態管理を一元化するサービス。
 * Single Source of Truthとして機能し、以下を管理：
 * - 現在の再生状態 (PlaybackInfo)
 * - 再生コンテキスト (アルバム、プレイリスト情報)
 * - メタデータのエンリッチメント
 * - 公式再生時間の管理
 */
export class PlaybackService {
  // Core state
  private state: PlaybackInfo | null = null;
  private currentVideoId: string | null = null;

  // Reference duration from YTMusic API (Source of Truth for duration)
  private referenceDuration = 0;

  // Enrichment management
  private enrichmentVersion = 0;
  private lastEnrichedMetadata: MediaMetadata | null = null;
  private lastEnrichedVideoId: string | null = null;

  // Play context (from play command)
  private lastPlayContext: {
    artists?: MusicArtist[];
    albumId?: string;
    videoId?: string;
    playMode?: 'ALBUM' | 'PLAYLIST' | 'SONG' | 'RADIO' | 'ARTIST';
  } = {};

  private hiddenWindow: BrowserWindow | null = null;

  /**
   * Initialize service with hidden window reference
   */
  initialize(hiddenWindow: BrowserWindow): void {
    this.hiddenWindow = hiddenWindow;
  }

  /**
   * Handle playback state change from Hidden Window
   * This is the main entry point for state updates
   */
  async handleStateChange(playbackInfo: PlaybackInfo): Promise<void> {
    const videoId = playbackInfo.metadata?.videoId;

    // Track change detection
    if (videoId && videoId !== this.currentVideoId) {
      await this.handleTrackChange(playbackInfo, videoId);
      return;
    }

    // Normal state update (same track)
    await this.updateState(playbackInfo);
  }

  /**
   * Handle track change (videoId changed)
   * Resets state and triggers enrichment
   */
  private async handleTrackChange(playbackInfo: PlaybackInfo, newVideoId: string): Promise<void> {
    console.log('[PlaybackService] Track changed:', newVideoId);

    // Reset state
    this.currentVideoId = newVideoId;
    this.referenceDuration = playbackInfo.duration || 0;
    this.enrichmentVersion++;

    // Apply cached enrichment immediately if available
    if (newVideoId === this.lastEnrichedVideoId && this.lastEnrichedMetadata) {
      playbackInfo.metadata = { ...this.lastEnrichedMetadata };
    }

    // Apply safety guard for duration
    if (this.referenceDuration > 0) {
      playbackInfo.duration = this.referenceDuration;
      if (playbackInfo.position > this.referenceDuration) {
        playbackInfo.position = this.referenceDuration;
      }
    }

    // Update and broadcast
    this.state = playbackInfo;
    this.broadcast();

    // Trigger asynchronous enrichment
    await this.enrichMetadata(playbackInfo, this.enrichmentVersion);
  }

  /**
   * Update state (same track, position/playback state change)
   */
  private async updateState(playbackInfo: PlaybackInfo): Promise<void> {
    // Apply safety guard for duration
    if (this.referenceDuration > 0) {
      playbackInfo.duration = this.referenceDuration;
      if (playbackInfo.position > this.referenceDuration) {
        playbackInfo.position = this.referenceDuration;
      }
    }

    // Apply cached enrichment if available
    const videoId = playbackInfo.metadata?.videoId;
    if (videoId === this.lastEnrichedVideoId && this.lastEnrichedMetadata) {
      playbackInfo.metadata = { ...this.lastEnrichedMetadata };
    }

    this.state = playbackInfo;
    this.broadcast();
  }

  /**
   * Enrich metadata asynchronously
   * Fetches additional info from YTMusic API (artists, album, duration)
   */
  private async enrichMetadata(playbackInfo: PlaybackInfo, version: number): Promise<void> {
    if (!playbackInfo.metadata?.videoId) return;

    const videoId = playbackInfo.metadata.videoId;
    const isSameTrack = videoId === this.lastPlayContext.videoId;
    const isAlbumMode = this.lastPlayContext.playMode === 'ALBUM';
    const isPlaylistMode = this.lastPlayContext.playMode === 'PLAYLIST';

    let needsEnrichment = false;
    const enrichedMetadata: MediaMetadata = { ...playbackInfo.metadata };

    // Check if we need to enrich artists
    if (!enrichedMetadata.artists || enrichedMetadata.artists.length === 0) {
      if (isSameTrack && this.lastPlayContext.artists && this.lastPlayContext.artists.length > 0) {
        enrichedMetadata.artists = this.lastPlayContext.artists;
        if (!enrichedMetadata.artistId && this.lastPlayContext.artists[0].id) {
          enrichedMetadata.artistId = this.lastPlayContext.artists[0].id;
        }
      } else {
        needsEnrichment = true;
      }
    }

    // Check if we need to enrich album ID
    if (!enrichedMetadata.albumId) {
      if (isSameTrack && this.lastPlayContext.albumId) {
        enrichedMetadata.albumId = this.lastPlayContext.albumId;
        const mode = this.lastPlayContext.playMode;
        if (mode === 'ALBUM' || mode === 'PLAYLIST') {
          enrichedMetadata.collectionType = mode;
        }
      } else if ((isAlbumMode || isPlaylistMode) && this.lastPlayContext.albumId) {
        enrichedMetadata.albumId = this.lastPlayContext.albumId;
        const mode = this.lastPlayContext.playMode;
        if (mode === 'ALBUM' || mode === 'PLAYLIST') {
          enrichedMetadata.collectionType = mode;
        }
      } else {
        needsEnrichment = true;
      }
    } else if (!enrichedMetadata.collectionType) {
      const mode = this.lastPlayContext.playMode;
      if ((isSameTrack || isAlbumMode || isPlaylistMode) && (mode === 'ALBUM' || mode === 'PLAYLIST')) {
        enrichedMetadata.collectionType = mode;
      }
    }

    // Perform async enrichment if needed
    if (needsEnrichment) {
      try {
        const songDetails = await ytMusicService.getSongDetails(videoId);

        // Version check: discard if a newer track has started
        if (version !== this.enrichmentVersion) {
          console.log('[PlaybackService] Enrichment discarded (stale version)');
          return;
        }

        if (songDetails && isSongItem(songDetails)) {
          if (!enrichedMetadata.artists || enrichedMetadata.artists.length === 0) {
            enrichedMetadata.artists = songDetails.artists;
            if (songDetails.artists[0]?.id) {
              enrichedMetadata.artistId = songDetails.artists[0].id;
            }
          }
          if (!enrichedMetadata.albumId && songDetails.album?.youtube_browse_id) {
            enrichedMetadata.albumId = songDetails.album.youtube_browse_id;
            enrichedMetadata.collectionType = 'ALBUM';
          }
          // Update reference duration with official data
          if (songDetails.duration?.seconds) {
            this.referenceDuration = songDetails.duration.seconds;
          }
        }
      } catch (e) {
        console.warn('[PlaybackService] Enrichment failed:', e);
      }
    }

    // Check if we actually enriched anything new
    const hasNewInfo =
      (enrichedMetadata.artists && enrichedMetadata.artists.length > 0 && !playbackInfo.metadata.artists?.length) ||
      (enrichedMetadata.albumId && !playbackInfo.metadata.albumId) ||
      (enrichedMetadata.collectionType && !playbackInfo.metadata.collectionType);

    // Only broadcast if we have new information and version is still current
    if (hasNewInfo && version === this.enrichmentVersion) {
      // Cache enriched metadata
      this.lastEnrichedMetadata = enrichedMetadata;
      this.lastEnrichedVideoId = videoId;

      // Update state with enriched metadata
      const enrichedPlaybackInfo: PlaybackInfo = {
        ...this.state!,
        metadata: enrichedMetadata,
        duration: this.referenceDuration > 0 ? this.referenceDuration : this.state!.duration,
      };

      this.state = enrichedPlaybackInfo;
      this.broadcast();
    }
  }

  /**
   * Set play context (called when a new play command is issued)
   */
  setPlayContext(context: {
    artists?: MusicArtist[];
    albumId?: string;
    videoId?: string;
    playMode?: 'ALBUM' | 'PLAYLIST' | 'SONG' | 'RADIO' | 'ARTIST';
  }): void {
    this.lastPlayContext = context;
    this.enrichmentVersion++;
  }

  /**
   * Set loading state (called when initiating playback)
   */
  setLoadingState(loadingInfo: PlaybackInfo): void {
    this.currentVideoId = loadingInfo.metadata?.videoId || null;
    this.referenceDuration = loadingInfo.duration || 0;
    this.state = loadingInfo;
    this.broadcast();
  }

  /**
   * Get reference duration (official duration from API)
   */
  getReferenceDuration(): number {
    return this.referenceDuration;
  }

  /**
   * Set reference duration
   */
  setReferenceDuration(duration: number): void {
    this.referenceDuration = duration;
  }

  /**
   * Broadcast current state to all windows (except hidden window)
   */
  private broadcast(): void {
    if (!this.state || !this.hiddenWindow) return;

    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed() && win.id !== this.hiddenWindow!.id) {
        win.webContents.send(IPCChannels.PLAYBACK_STATE_CHANGED, this.state);
      }
    });
  }

  /**
   * Get current state
   */
  getState(): PlaybackInfo | null {
    return this.state;
  }

  /**
   * Get current play context
   */
  getPlayContext(): typeof this.lastPlayContext {
    return this.lastPlayContext;
  }
}

export const playbackService = new PlaybackService();
