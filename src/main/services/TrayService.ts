import { Tray, Menu, nativeImage } from 'electron';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { Resvg } from '@resvg/resvg-js';
import { TraySettings } from '../../shared/types/settings';
import { MediaMetadata } from '../../shared/types';

export interface TrayCallbacks {
  onShowWindow: () => void;
  onShowPreferences: () => void;
  onShowAbout: () => void;
  onQuit: () => void;
}

export class TrayService {
  private tray: Tray | null = null;
  private settings: TraySettings;
  private callbacks: TrayCallbacks | null = null;
  private currentMetadata: MediaMetadata | null = null;
  private marqueeInterval: NodeJS.Timeout | null = null;
  private marqueeOffset: number = 0;
  private currentTrackText: string = '';
  private clearTimer: NodeJS.Timeout | null = null;
  private isLoading: boolean = false;
  private imageCache: Map<string, Electron.NativeImage> = new Map();
  private readonly MAX_CACHE_SIZE = 50;

  // Worker thread for background rendering
  private renderWorker: Worker | null = null;
  private nextRequestId: number = 0;
  private pendingRenders: Map<number, (img: Electron.NativeImage) => void> = new Map();


  constructor() {
    this.settings = {
      showTrackTitle: true,
      enableScrolling: true,
    };

    // Initialize render worker
    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // In webpack/electron-forge, __dirname points to the bundled output
      const workerPath = path.join(__dirname, 'trayRenderWorker.js');
      this.renderWorker = new Worker(workerPath);

      this.renderWorker.on('message', (response: { id: number; buffer: Buffer }) => {
        const callback = this.pendingRenders.get(response.id);
        if (callback) {
          this.pendingRenders.delete(response.id);
          if (response.buffer.length > 0) {
            const img = nativeImage.createFromBuffer(response.buffer, { scaleFactor: 2.0 });
            if (!img.isEmpty()) {
              img.setTemplateImage(true);
            }
            callback(img);
          } else {
            callback(nativeImage.createEmpty());
          }
        }
      });

      this.renderWorker.on('error', (error) => {
        console.error('[TrayService] Worker error:', error);
      });
    } catch (error) {
      console.error('[TrayService] Failed to initialize render worker:', error);
      // Worker will remain null, fallback to sync rendering
    }
  }

  /**
   * Renders an image asynchronously using the worker thread.
   * Falls back to synchronous rendering if worker is unavailable.
   */
  private renderAsync(displayText: string, callback: (img: Electron.NativeImage) => void): void {
    // Check cache first
    const cached = this.imageCache.get(displayText);
    if (cached) {
      callback(cached);
      return;
    }

    if (this.renderWorker) {
      const id = this.nextRequestId++;
      this.pendingRenders.set(id, (img) => {
        // Cache the result
        if (!img.isEmpty()) {
          if (this.imageCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.imageCache.keys().next().value;
            if (firstKey) this.imageCache.delete(firstKey);
          }
          this.imageCache.set(displayText, img);
        }
        callback(img);
      });
      this.renderWorker.postMessage({ id, displayText });
    } else {
      // Fallback to synchronous rendering
      const img = this.generateTrayImage(displayText);
      callback(img);
    }
  }


  private contextMenu: Menu | null = null;

  initialize(settings: TraySettings, callbacks: TrayCallbacks): void {
    this.settings = settings;
    this.callbacks = callbacks;

    try {
      const img = this.generateTrayImage("♫ Silent", true);
      this.tray = new Tray(img);
      this.currentTrackText = "♫ Silent";
      this.tray.setTitle('');
      this.tray.setToolTip('Silent');

      this.updateContextMenu();

      this.tray.on('click', () => {
        if (process.platform === 'darwin') {
          // On macOS, show BOTH window and menu
          callbacks.onShowWindow();
          if (this.contextMenu) {
            this.tray?.popUpContextMenu(this.contextMenu);
          }
        } else {
          // On other platforms, default click behavior
          callbacks.onShowWindow();
        }
      });

      this.tray.on('right-click', () => {
        if (process.platform === 'darwin' && this.contextMenu) {
          this.tray?.popUpContextMenu(this.contextMenu);
        }
      });
    } catch (error) {
      console.error('[TrayService] Failed to initialize tray:', error);
      throw error;
    }
  }

  /**
   * Estimates the visual width of a string in "half-width units".
   * Full-width characters (CJK, Emojis) count as 2, others as 1.
   */
  private getVisualWidth(text: string): number {
    let width = 0;
    for (const char of [...text]) {
      if (char.match(/[^\x00-\xff]/)) {
        width += 2;
      } else {
        width += 1;
      }
    }
    return width;
  }

  /**
   * Generates a nativeImage from an SVG containing text.
   * Uses caching to avoid re-rendering the same text repeatedly.
   * @param displayText - The text to render
   * @param centered - If true, center the text horizontally (for static display)
   */
  private generateTrayImage(displayText: string, centered: boolean = false): Electron.NativeImage {
    // Check cache first (include centered flag in cache key)
    const cacheKey = centered ? `${displayText}:centered` : displayText;
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const height = 44; // Standard macOS menu bar height (22pt @ scaleFactor 2.0)
    const PADDING = 4;
    const FIXED_WIDTH = 160;

    const escapedText = displayText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/ /g, '\u00A0')
      .replace(/\u3000/g, '\u00A0\u00A0');

    // Text positioning: centered or left-aligned
    const textX = centered ? FIXED_WIDTH / 2 : PADDING;
    const textAnchor = centered ? 'middle' : 'start';

    // SVG with clean text (no icon) and a transparent background rect to lock the width
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${FIXED_WIDTH}" viewBox="0 0 ${FIXED_WIDTH} ${height}">` +
      `<rect width="${FIXED_WIDTH}" height="${height}" fill="transparent" />` +
      `<text x="${textX}" y="${height / 2 + 2}" dominant-baseline="middle" text-anchor="${textAnchor}" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif" font-size="20" font-weight="500" fill="black">${escapedText}</text>` +
      `</svg>`;

    try {
      const resvg = new Resvg(svg, {
        background: 'rgba(0,0,0,0)',
        font: {
          loadSystemFonts: true,
          defaultFontFamily: 'Hiragino Kaku Gothic ProN'
        }
      });

      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();
      const img = nativeImage.createFromBuffer(pngBuffer, { scaleFactor: 2.0 });

      if (!img.isEmpty()) {
        img.setTemplateImage(true);

        // Cache the result (with size limit)
        if (this.imageCache.size >= this.MAX_CACHE_SIZE) {
          // Remove oldest entry (first key)
          const firstKey = this.imageCache.keys().next().value;
          if (firstKey) this.imageCache.delete(firstKey);
        }
        this.imageCache.set(displayText, img);
      }
      return img;
    } catch (error) {
      console.error('[TrayService] Resvg rendering failed:', error);
      return nativeImage.createEmpty();
    }
  }


  updateTrack(metadata: MediaMetadata | null): void {
    if (!this.tray) return;

    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
      this.clearTimer = null;
    }

    try {
      if (metadata?.title) {
        this.isLoading = false;
      }
      this.currentMetadata = metadata;

      // Behavior when track title display is disabled: Always show "♫ Silent"
      if (!this.settings.showTrackTitle) {
        if (this.currentTrackText !== '♫ Silent' || this.marqueeInterval) {
          this.clearTrack();
        }
        return;
      }

      if (metadata?.title || this.isLoading) {
        const text = this.isLoading ? '♫ Silent' : metadata?.title || '';
        if (!text) return;

        const visualWidth = this.getVisualWidth(text);
        if (process.platform === 'darwin') {
          // Threshold of 14 visual units to match SVG display capacity
          if (this.settings.enableScrolling && visualWidth > 14) {
            if (this.currentTrackText !== text || !this.marqueeInterval) {
              this.currentTrackText = text;
              this.stopMarquee();
              this.startMarquee(text);
            }
          } else {
            if (this.currentTrackText !== text || this.marqueeInterval) {
              this.currentTrackText = text;
              this.stopMarquee();

              let truncated = text;
              if (visualWidth > 14) {
                // Truncate to fit within visual limits when marquee is disabled
                let currentWidth = 0;
                let truncatedText = '';
                for (const char of [...text]) {
                  const charWidth = char.match(/[^\x00-\xff]/) ? 2 : 1;
                  if (currentWidth + charWidth > 11) break; // Leave room for "..."
                  truncatedText += char;
                  currentWidth += charWidth;
                }
                truncated = truncatedText + '...';
              }

              const img = this.generateTrayImage(truncated, true);
              this.tray.setImage(img);
              this.tray.setTitle('');
            }
          }
        }
        this.tray.setToolTip(text);
      } else {
        if (this.currentTrackText !== '♫ Silent' || this.marqueeInterval) {
          if (!this.clearTimer) {
            this.clearTimer = setTimeout(() => {
              this.clearTrack();
            }, 3000);
          }
        }
      }
    } catch (error) {
      console.error('[TrayService] Error updating track:', error);
    }
  }

  private clearTrack(): void {
    if (!this.tray) return;
    this.currentTrackText = '';
    this.currentMetadata = null;
    this.isLoading = false;
    this.stopMarquee();
    const img = this.generateTrayImage("♫ Silent", true);
    this.tray.setImage(img);
    this.tray.setTitle('');
    this.tray.setToolTip('Silent');
  }

  showLoading(): void {
    this.isLoading = true;
    this.updateTrack(this.currentMetadata);
  }

  private startMarquee(text: string): void {
    if (!this.tray || !this.settings.enableScrolling) return;

    this.marqueeOffset = 0;
    const paddedText = text + '    ';
    const chars = [...paddedText];
    const TARGET_VISUAL_WIDTH = 14;

    // Helper to generate display text for an offset
    const getDisplayText = (offset: number): string => {
      let displayText = '';
      let currentVisualWidth = 0;
      for (let i = 0; currentVisualWidth < TARGET_VISUAL_WIDTH && i < chars.length; i++) {
        const char = chars[(offset + i) % chars.length];
        const charWidth = char.match(/[^\x00-\xff]/) ? 2 : 1;
        if (currentVisualWidth + charWidth > TARGET_VISUAL_WIDTH) break;
        displayText += char;
        currentVisualWidth += charWidth;
      }
      return displayText;
    };

    // Queue all frames for async rendering via worker
    const frames: (Electron.NativeImage | null)[] = new Array(chars.length).fill(null);
    let framesReady = 0;

    // Request all frames from worker asynchronously
    for (let offset = 0; offset < chars.length; offset++) {
      const displayText = getDisplayText(offset);
      this.renderAsync(displayText, (img) => {
        frames[offset] = img;
        framesReady++;
      });
    }

    // Start scrolling immediately - use first available frame or fallback
    const updateMarquee = () => {
      try {
        if (!this.tray) {
          this.stopMarquee();
          return;
        }

        // Find an available frame (prefer current offset, fallback to any ready frame)
        let frame = frames[this.marqueeOffset];
        if (!frame) {
          // Find first available frame as fallback
          for (let i = 0; i < frames.length; i++) {
            if (frames[i]) {
              frame = frames[i];
              break;
            }
          }
        }

        if (frame) {
          this.tray.setImage(frame);
          this.tray.setTitle('');
        }

        this.marqueeOffset = (this.marqueeOffset + 1) % chars.length;
      } catch (error) {
        console.error('[TrayService] Error in marquee update:', error);
        this.stopMarquee();
      }

    };

    this.marqueeInterval = setInterval(updateMarquee, 500);
    updateMarquee();
  }


  private stopMarquee(): void {
    if (this.marqueeInterval) {
      clearInterval(this.marqueeInterval);
      this.marqueeInterval = null;
      this.marqueeOffset = 0;
    }
  }

  updateSettings(settings: TraySettings): void {
    this.settings = settings;
    this.updateContextMenu();
    if (this.currentMetadata) {
      this.currentTrackText = '';
      this.updateTrack(this.currentMetadata);
    }
  }

  destroy(): void {
    this.stopMarquee();
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private updateContextMenu(): void {
    if (!this.tray || !this.callbacks) return;

    this.contextMenu = Menu.buildFromTemplate([
      {
        label: 'Preferences...',
        click: () => this.callbacks?.onShowPreferences()
      },
      {
        label: 'About Silent',
        click: () => this.callbacks?.onShowAbout()
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => this.callbacks?.onQuit()
      }
    ]);

    if (process.platform !== 'darwin') {
      this.tray.setContextMenu(this.contextMenu);
    }
  }
}

export const trayService = new TrayService();
