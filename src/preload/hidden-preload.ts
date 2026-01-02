import { ipcRenderer } from 'electron';
import { PlaybackInfo } from '../shared/types';

// Forced global variables for control from main process
(window as any).block_updates = false;

let lastValidMetadata: any = null;
let lastState: string | null = null;
let lastStateTime = 0;
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
  if (e.message.includes('playback') || e.message.includes('load')) {
    forceUpdateState();
  }
}, true);

window.addEventListener('unhandledrejection', (e) => {
  console.warn('[HiddenWindow] Unhandled Promise Rejection:', e.reason);
});

// Forced global variables for control from main process
(window as any).block_updates = false;

function forceUpdateState() {
  lastState = null; // Force next poll to send update
  lastStateTime = 0;
}

// Cleanup on load
function handleLoadFinish() {
  (window as any).block_updates = false;
  forceUpdateState();
}

window.addEventListener('load', handleLoadFinish);
window.addEventListener('DOMContentLoaded', handleLoadFinish);

// Reset on navigation start
window.addEventListener('beforeunload', () => {
  (window as any).block_updates = true;
});

// Poll MediaSession every 100ms
function observeMediaSession() {
  if ((window as any).block_updates) return;

  const mediaSession = navigator.mediaSession;
  if (!mediaSession) return;

  const metadata = mediaSession.metadata;
  const hasMetadata = metadata && metadata.title;

  if (hasMetadata && metadata) {
    let albumId: string | undefined;

    try {
      const playerBar = document.querySelector('ytmusic-player-bar');
      const bylineLinks = playerBar?.querySelectorAll('.middle-controls .byline a') || [];

      for (const lin of Array.from(bylineLinks)) {
        const link = lin as any;
        const browseId = link.data?.navigationEndpoint?.browseEndpoint?.browseId ||
          link.navigationEndpoint?.browseEndpoint?.browseId;

        if (browseId && (browseId.startsWith('MPREb') || browseId.startsWith('F'))) {
          albumId = browseId;
          break;
        }

        const href = link.getAttribute('href');
        if (href?.includes('browse/MPREb') || href?.includes('browse/F')) {
          albumId = href.split('browse/')[1];
          break;
        }
      }
    } catch (e) {
      console.warn('Failed to extract albumId:', e);
    }

    lastValidMetadata = {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      albumId: albumId,
      artwork: metadata.artwork ? metadata.artwork.map(art => ({
        src: art.src,
        sizes: art.sizes,
        type: art.type,
      })) : [],
      videoId: (() => {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const videoId = urlParams.get('v');
          return videoId || undefined;
        } catch {
          return undefined;
        }
      })(),
    };
  }

  const activeMetadata = hasMetadata ? lastValidMetadata : (lastValidMetadata || null);
  if (!activeMetadata) return;

  // Use video element as source of truth for playback state if possible
  const video = document.querySelector('video');
  let playbackState = mediaSession.playbackState || 'none';
  if (video) {
    // If video is strictly paused/playing, overwrite MediaSession state which can lag
    playbackState = video.paused ? 'paused' : 'playing';
  }

  // Initial state suppression
  // If we haven't interacted yet and the state is not 'playing', 
  // assume it's a restored session and ignore it to keep Miniplayer empty.
  if (!hasInteracted && playbackState !== 'playing') {
    return;
  }
  hasInteracted = true;

  const playbackInfo: PlaybackInfo = {
    metadata: activeMetadata,
    playbackState: playbackState as any,
    position: 0,
    duration: 0,
  };

  if (video && !isNaN(video.currentTime) && !isNaN(video.duration)) {
    playbackInfo.position = video.currentTime;
    playbackInfo.duration = video.duration;
  } else if ("getPositionState" in mediaSession) {
    try {
      const positionState = (mediaSession as any).getPositionState();
      if (positionState) {
        playbackInfo.position = positionState.position || 0;
        playbackInfo.duration = positionState.duration || 0;
      }
    } catch (e) { /* ignore */ }
  }

  // Optimization: Only send update if significant changes occurred
  let shouldUpdate = false;
  if (!lastState) {
    shouldUpdate = true;
  } else {
    try {
      const last = JSON.parse(lastState) as PlaybackInfo;
      const metadataChanged = JSON.stringify(playbackInfo.metadata) !== JSON.stringify(last.metadata);
      const stateChanged = playbackInfo.playbackState !== last.playbackState;
      const durationChanged = Math.abs(playbackInfo.duration - last.duration) > 1;
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
    const currentState = JSON.stringify(playbackInfo);
    lastState = currentState;
    lastStateTime = Date.now();
    ipcRenderer.send('playback:state-changed', playbackInfo);
  }
}

// Start polling
setInterval(observeMediaSession, 100);

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

ipcRenderer.on('playback:seek', (_event, seekTime: number) => {
  hasInteracted = true;
  // Use the MediaSession 'seekto' action if available (modern API way)
  if (!triggerAction('seekto', { seekTime })) {
    // Fallback to direct video manipulation
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = seekTime;
    }
  }
});
