import { ipcRenderer } from 'electron';
import { PlaybackInfo } from '../shared/types';

let lastValidMetadata: any = null;
let lastState: string | null = null;
type MSHandler = (details: any) => void;
const msHandlers: Record<string, MSHandler> = {};

/**
 * PURE MEDIASESSION HOOK (SELECTOR-LESS)
 * Since contextIsolation is false, we are in the main world.
 * We override setActionHandler to capture YTM's own callback logic.
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalSetHandler(action as any, handler as any);
  };
}

function triggerAction(action: string, details?: any): boolean {
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

// Poll MediaSession every 500ms
function observeMediaSession() {
  const mediaSession = navigator.mediaSession;
  if (!mediaSession) return;

  const metadata = mediaSession.metadata;
  const hasMetadata = metadata && metadata.title;

  if (hasMetadata && metadata) {
    lastValidMetadata = {
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      artwork: metadata.artwork ? metadata.artwork.map(art => ({
        src: art.src,
        sizes: art.sizes,
        type: art.type,
      })) : [],
      videoId: (() => {
        const urlMatch = window.location.href.match(/[?&]v=([^&]+)/);
        if (urlMatch) return urlMatch[1];
        const t = metadata.title || "";
        const a = metadata.artist || "";
        if (t || a) {
          try {
            return "track-" + btoa(unescape(encodeURIComponent(t + a))).substring(0, 16);
          } catch (e) {
            return "track-unknown";
          }
        }
        return undefined;
      })(),
    };
  }

  const activeMetadata = hasMetadata ? lastValidMetadata : (lastValidMetadata || null);
  if (!activeMetadata) return;

  const playbackInfo: PlaybackInfo = {
    metadata: activeMetadata,
    playbackState: mediaSession.playbackState || 'none',
    position: 0,
    duration: 0,
  };

  // Try to get position and duration from video element directly
  const video = document.querySelector('video');
  if (video && !isNaN(video.currentTime) && !isNaN(video.duration)) {
    playbackInfo.position = video.currentTime;
    playbackInfo.duration = video.duration;
  } else if ("getPositionState" in mediaSession) {
    // Fallback to MediaSession API
    try {
      const positionState = (mediaSession as any).getPositionState();
      if (positionState) {
        playbackInfo.position = positionState.position || 0;
        playbackInfo.duration = positionState.duration || 0;
      }
    } catch (e) { /* ignore */ }
  }

  const currentState = JSON.stringify(playbackInfo);
  if (currentState !== lastState) {
    lastState = currentState;
    ipcRenderer.send('playback:state-changed', playbackInfo);
  }
}

// Start polling
setInterval(observeMediaSession, 100);

// Playback Controls (STRICTLY Selector-less via MediaSession Hook)
ipcRenderer.on('playback:play', () => {
  if (!triggerAction('play')) {
    // Standard HTML5 Video API (Not a UI selector)
    document.querySelector('video')?.play().catch(() => { /* ignore */ });
  }
});

ipcRenderer.on('playback:pause', () => {
  if (!triggerAction('pause')) {
    document.querySelector('video')?.pause();
  }
});

ipcRenderer.on('playback:next', () => {
  triggerAction('nexttrack');
});

ipcRenderer.on('playback:previous', () => {
  triggerAction('previoustrack');
});

ipcRenderer.on('playback:seek', (_event, seekTime: number) => {
  // Use the MediaSession 'seekto' action if available (modern API way)
  if (!triggerAction('seekto', { seekTime })) {
    // Fallback to direct video manipulation
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = seekTime;
    }
  }
});

console.log('Hidden window preload loaded - PURE MediaSession API Mode (Selector-less)');
