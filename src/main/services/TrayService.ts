import { Tray, Menu, nativeImage } from 'electron';
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
  private animationInterval: NodeJS.Timeout | null = null;
  private marqueeOffset: number = 0;
  private currentTrackText: string = '';
  private clearTimer: NodeJS.Timeout | null = null;
  private isLoading: boolean = false;

  constructor() {
    this.settings = {
      showTrackTitle: true,
      enableAnimation: true,
      enableScrolling: true,
    };
  }

  initialize(settings: TraySettings, callbacks: TrayCallbacks): void {
    this.settings = settings;
    this.callbacks = callbacks;

    try {
      const img = this.generateTrayImage("Loading...");
      this.tray = new Tray(img);
      this.currentTrackText = "Loading...";
      this.tray.setTitle('');
      this.tray.setToolTip('Silent');

      this.updateContextMenu();

      this.tray.on('click', () => {
        callbacks.onShowWindow();
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
   */
  private generateTrayImage(displayText: string): Electron.NativeImage {
    const height = 44; // Standard macOS menu bar height (22pt @ scaleFactor 2.0)
    const PADDING = 4;

    const escapedText = displayText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/ /g, '\u00A0')
      .replace(/\u3000/g, '\u00A0\u00A0');

    // Fixed width to prevent layout jitter in the menu bar. 
    const FIXED_WIDTH = 160;

    // SVG with clean text (no icon) and a transparent background rect to lock the width
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" height="${height}" width="${FIXED_WIDTH}" viewBox="0 0 ${FIXED_WIDTH} ${height}">` +
      `<rect width="${FIXED_WIDTH}" height="${height}" fill="transparent" />` +
      `<text x="${PADDING}" y="${height / 2 + 2}" dominant-baseline="middle" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif" font-size="20" font-weight="500" fill="black">${escapedText}</text>` +
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

      if (this.settings.showTrackTitle && (metadata?.title || this.isLoading)) {
        const text = this.isLoading ? 'Loading...' : metadata?.title || '';
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
                truncated = [...text].slice(0, 7).join('') + '...';
              }

              const img = this.generateTrayImage(truncated);
              this.tray.setImage(img);
              this.tray.setTitle('');
            }
          }
        }
        this.tray.setToolTip(text);
      } else {
        if (this.currentTrackText !== '' || this.marqueeInterval) {
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
    const img = this.generateTrayImage("Loading...");
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

    const updateMarquee = () => {
      try {
        if (!this.tray) {
          this.stopMarquee();
          return;
        }

        // Dynamically slice characters to fit within the fixed width.
        // At font-size 20, half-width chars ~10px, full-width ~20px.
        // SVG width is 160px with 4px padding each side = 152px usable.
        // So target ~14 visual units to be safe (~140px).
        let displayText = '';
        let currentVisualWidth = 0;
        const TARGET_VISUAL_WIDTH = 14; // ~140px of text
        for (let i = 0; currentVisualWidth < TARGET_VISUAL_WIDTH && i < chars.length; i++) {
          const char = chars[(this.marqueeOffset + i) % chars.length];
          const charWidth = char.match(/[^\x00-\xff]/) ? 2 : 1;
          if (currentVisualWidth + charWidth > TARGET_VISUAL_WIDTH) break;
          displayText += char;
          currentVisualWidth += charWidth;
        }


        console.log(`[Marquee] display: "${displayText}", visualWidth: ${currentVisualWidth}, offset: ${this.marqueeOffset}`);
        const img = this.generateTrayImage(displayText);
        this.tray.setImage(img);
        this.tray.setTitle('');

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
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = null;
    }
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  private updateContextMenu(): void {
    if (!this.tray || !this.callbacks) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Silent',
        click: () => this.callbacks?.onShowWindow()
      },
      { type: 'separator' },
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

    this.tray.setContextMenu(contextMenu);
  }
}

export const trayService = new TrayService();
