import { ipcRenderer } from 'electron';
import { PlaybackInfo } from '../shared/types/playback';
import { createPlaybackObservable } from './playback/observables';

// Forced global variables for control from main process
(window as any).block_updates = false;

let lastValidMetadata: any = null;
let lastStateText: string | null = null;
let lastStateTime = 0;
let lastReportedDuration = 0;
let hasInteracted = false;
type MSHandler = (details: any) => void;
const msHandlers: Record<string, MSHandler> = {};

/**
 * PURE MEDIASESSION HOOK (SELECTOR-LESS)
 */
if (navigator.mediaSession) {
  const ms = navigator.mediaSession;
  const originalSetHandler = ms.setActionHandler.bind(ms);
  ms.setActionHandler = (action: string, handler: MSHandler | null) => {
    if (handler) {
      msHandlers[action] = handler;
    } else {
      delete msHandlers[action];
    }
    return originalSetHandler(action as any, handler as any);
  };
}

function triggerAction(action: string, details?: any): boolean {
  hasInteracted = true; // Any triggered action counts as interaction
  const handler = msHandlers[action];
  if (handler && typeof handler === 'function') {
    try {
      handler({ action: action, ...details });
      return true;
    } catch (e) {
      console.error("[Playback] Error triggering intercepted handler:", action, e);
    }
  }
  return false;
}

// Global error handling to catch playback failures
window.addEventListener('error', (e) => {
  console.error('[HiddenWindow] Global Error:', e.message);
  if (e.message?.includes('playback') || e.message?.includes('load')) {
    forceUpdateState();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  console.warn('[HiddenWindow] Unhandled Promise Rejection:', e.reason);
});

// Forced global variables for control from main process
(window as any).block_updates = false;

function forceUpdateState() {
  lastStateText = null; // Force next poll to send update
  lastStateTime = 0;
}

// Cleanup on load
function handleLoadFinish() {
  (window as any).block_updates = false;
  forceUpdateState();
}

window.addEventListener('load', handleLoadFinish);
window.addEventListener('DOMContentLoaded', handleLoadFinish);

// Also unblock when video starts playing (YouTube Music often plays before full load)
function setupVideoPlayingListener() {
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('playing', () => {
      if ((window as any).block_updates) {
        (window as any).block_updates = false;
        forceUpdateState();
      }
    });
  } else {
    // Video element might not exist yet, try again shortly
    setTimeout(setupVideoPlayingListener, 100);
  }
}

// Start looking for video element
setupVideoPlayingListener();

// Reset on navigation start
window.addEventListener('beforeunload', () => {
  (window as any).block_updates = true;
  lastValidMetadata = null; // Clear old metadata on navigation
  lastStateText = null;
  lastReportedDuration = 0;
  // Safety timeout: if page doesn't load within 8s, unblock anyway (Issue #22)
  setTimeout(() => { (window as any).block_updates = false; }, 8000);
});

// Poll Video and DOM every 100ms
function observePlayback() {
  if ((window as any).block_updates) return;

  // 1. EXTRACT METADATA FROM DOM (SELECTOR-LESS / MINIMAL SELECTOR)
  // We use the player bar elements which are more reliable than MediaSession which can be hijacked by OS or other tabs
  const extractMetadata = () => {
    try {
      const playerBar = document.querySelector('ytmusic-player-bar');
      if (!playerBar) return null;

      const title = playerBar.querySelector('.title')?.textContent?.trim();
      const byline = playerBar.querySelector('.byline')?.textContent?.trim();

      // Byline typically contains "Artist • Album • Year" or "Artist • Year"
      const parts = byline ? byline.split(' • ') : [];
      const artist = parts[0] || '';
      const album = parts[1] || '';

      const artworkImg = playerBar.querySelector('.image') as HTMLImageElement;
      const artwork = artworkImg && artworkImg.src ? [{
        src: artworkImg.src,
        sizes: '512x512',
        type: 'image/jpeg'
      }] : [];

      const urlParams = new URLSearchParams(window.location.search);
      const videoId = urlParams.get('v') || undefined;

      if (!title) return null;

      return {
        title,
        artist,
        album,
        artwork,
        videoId
      };
    } catch (e) {
      return null;
    }
  };

  const metadata = extractMetadata();
  if (metadata) {
    lastValidMetadata = {
      ...metadata,
      albumId: undefined, // Enriched by main process
      artistId: undefined // Enriched by main process
    };
  }

  if (!lastValidMetadata) return;

  // 2. FIND VIDEO ELEMENT
  const allVideos = Array.from(document.querySelectorAll('video'));
  const video = allVideos.find(v => {
    const isVisible = v.offsetWidth > 0 || v.offsetHeight > 0;
    const hasSource = v.src && v.src.startsWith('blob:');
    return isVisible && hasSource;
  }) || allVideos[0];

  if (!video) return;

  // 3. DETERMINE PLAYBACK STATE
  const playbackState = video.paused ? 'paused' : 'playing';

  // Initial state suppression
  const isWatchPage = window.location.pathname.startsWith('/watch');
  if (!hasInteracted && playbackState !== 'playing' && !isWatchPage) {
    return;
  }
  if (isWatchPage || playbackState === 'playing') {
    hasInteracted = true;
  }

  // 3. EXTRACT SHUFFLE AND REPEAT STATES
  const shuffleButton = document.querySelector('ytmusic-player-bar .shuffle') as HTMLElement;
  const isShuffle = shuffleButton?.getAttribute('aria-pressed') === 'true';

  const repeatButton = document.querySelector('ytmusic-player-bar .repeat') as HTMLElement;
  const repeatTitle = repeatButton?.getAttribute('title')?.toLowerCase() || '';
  let isRepeat: 'none' | 'one' | 'all' = 'none';
  if (repeatTitle.includes('one')) isRepeat = 'one';
  else if (repeatTitle.includes('all')) isRepeat = 'all';

  const playbackInfo: PlaybackInfo = {
    metadata: lastValidMetadata,
    playbackState: playbackState as any,
    position: video.currentTime || 0,
    duration: video.duration || 0,
    isShuffle,
    isRepeat,
  };

  // Optimization: Only send update if significant changes occurred
  let shouldUpdate = false;
  if (!lastStateText) {
    shouldUpdate = true;
  } else {
    try {
      const last = JSON.parse(lastStateText) as PlaybackInfo;
      const metadataChanged = JSON.stringify(playbackInfo.metadata) !== JSON.stringify(last.metadata);
      const stateChanged = playbackInfo.playbackState !== last.playbackState;
      const durationChanged = Math.abs(playbackInfo.duration - last.duration) > 0.1;
      const positionJump = Math.abs(playbackInfo.position - last.position) > 1.5;
      const timeSinceLastUpdate = Date.now() - lastStateTime;

      if (metadataChanged || stateChanged || durationChanged || positionJump || timeSinceLastUpdate > 2000) {
        shouldUpdate = true;
      }
    } catch (e) {
      shouldUpdate = true;
    }
  }

  if (shouldUpdate) {
    // Safety Force end
    const officialDur = (window as any)._officialDuration || 0;
    if (officialDur > 0 && playbackInfo.position >= officialDur - 0.5) {
      triggerAction('nexttrack');
      return;
    }

    // Guard against stale position on track change
    const currentVideoId = playbackInfo.metadata?.videoId;
    if (currentVideoId && currentVideoId !== (window as any)._lastReportedVideoId) {
      (window as any)._isTransitioning = true;
      (window as any)._lastReportedVideoId = currentVideoId;
    }

    if ((window as any)._isTransitioning) {
      if (video.currentTime < 1.0) {
        (window as any)._isTransitioning = false;
      } else {
        playbackInfo.position = 0;
      }
    }

    lastReportedDuration = playbackInfo.duration;
    const currentState = JSON.stringify(playbackInfo);
    lastStateText = currentState;
    lastStateTime = Date.now();
    ipcRenderer.send('playback:state-changed', playbackInfo);
  }
}

// Feature flag for RxJS event-driven playback
const USE_RXJS_PLAYBACK = process.env.USE_RXJS_PLAYBACK === 'true';

let pollingInterval: NodeJS.Timeout | undefined;
let rxjsSubscription: any;

if (USE_RXJS_PLAYBACK) {
  // RxJS event-driven mode
  console.log('[HiddenPreload] Using RxJS event-driven playback monitoring');

  const playback$ = createPlaybackObservable();
  rxjsSubscription = playback$.subscribe({
    next: (playbackInfo) => {
      // Apply safety guard: force end of track if position exceeds official duration
      const officialDur = (window as any)._officialDuration || 0;
      if (officialDur > 0 && playbackInfo.position >= officialDur - 0.5) {
        triggerAction('nexttrack');
        return;
      }

      // Send IPC to main process
      ipcRenderer.send('playback:state-changed', playbackInfo);
    },
    error: (err) => {
      console.error('[HiddenPreload] RxJS playback stream error:', err);
      // TODO: Add fallback or restart logic
    }
  });

  // Cleanup subscription on window unload
  const existingBeforeUnload = window.onbeforeunload;
  window.addEventListener('beforeunload', () => {
    if (rxjsSubscription) {
      rxjsSubscription.unsubscribe();
    }
    if (existingBeforeUnload) {
      existingBeforeUnload.call(window, null as any);
    }
  });
} else {
  // Legacy polling mode (100ms interval)
  console.log('[HiddenPreload] Using legacy polling playback monitoring');
  pollingInterval = setInterval(observePlayback, 100);
}

// Playback Controls (STRICTLY Selector-less via MediaSession Hook)
ipcRenderer.on('playback:play', () => {
  hasInteracted = true;
  if (!triggerAction('play')) {
    // Standard HTML5 Video API (Not a UI selector)
    document.querySelector('video')?.play().catch(() => { /* ignore */ });
  }
});

ipcRenderer.on('playback:pause', () => {
  hasInteracted = true;
  if (!triggerAction('pause')) {
    document.querySelector('video')?.pause();
  }
});

ipcRenderer.on('playback:next', () => {
  hasInteracted = true;
  triggerAction('nexttrack');
});

ipcRenderer.on('playback:previous', () => {
  hasInteracted = true;
  triggerAction('previoustrack');
});

ipcRenderer.on('playback:shuffle', () => {
  hasInteracted = true;
  toggleShuffle(); // Toggle behavior for UI button
});

/**
 * Toggle shuffle or force to a specific state
 */
function toggleShuffle(forceState?: boolean) {
  const shuffleButton = document.querySelector('ytmusic-player-bar tp-yt-paper-icon-button.shuffle') as HTMLElement;
  if (shuffleButton) {
    const isCurrentlyActive = shuffleButton.getAttribute('aria-pressed') === 'true';

    // If forceState is provided, only click if it doesn't match
    if (forceState !== undefined) {
      if (isCurrentlyActive !== forceState) {
        shuffleButton.click();
      }
    } else {
      // Standard toggle
      shuffleButton.click();
    }
    return true;
  }
  return false;
}

ipcRenderer.on('playback:seek', (_event, seekTime: number) => {
  hasInteracted = true;

  // Safety: If seeking to the very end (within 1 second), treat it as a "next" command
  // This prevents the player from getting stuck at the end of a track or reported duration increasing
  if (lastReportedDuration > 0 && seekTime >= lastReportedDuration - 1.0) {
    triggerAction('nexttrack');
    return;
  }

  // Use the MediaSession 'seekto' action if available (modern API way)
  if (!triggerAction('seekto', { seekTime })) {
    // Fallback to direct video manipulation
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = seekTime;
    }
  }
});

// Add explicit listener for when the video actually ends
function setupVideoEndListener() {
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('ended', () => {
      triggerAction('nexttrack');
    });
  } else {
    setTimeout(setupVideoEndListener, 500);
  }
}
setupVideoEndListener();
