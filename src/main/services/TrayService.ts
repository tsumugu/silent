import { Tray, Menu, nativeImage, app } from 'electron';
import * as path from 'path';
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
      // Create tray icon
      const iconPath = this.getTrayIconPath();
      const icon = nativeImage.createFromPath(iconPath);

      // macOS requires template images for proper dark mode support
      if (process.platform === 'darwin') {
        icon.setTemplateImage(true);
      }

      this.tray = new Tray(icon);
      this.tray.setToolTip('Silent');

      // Set context menu
      this.updateContextMenu();

      // Handle tray click (show main window)
      this.tray.on('click', () => {
        callbacks.onShowWindow();
      });

      // Mouse wheel scrolling removed - not needed for menu bar app

      console.log('[TrayService] Tray initialized');
    } catch (error) {
      console.error('[TrayService] Failed to initialize tray:', error);
      throw error;
    }
  }

  updateTrack(metadata: MediaMetadata | null): void {
    if (!this.tray) return;

    if (this.settings.showTrackTitle && metadata?.title) {
      const tooltip = metadata.artist
        ? `${metadata.title} - ${metadata.artist}`
        : metadata.title;

      // Truncate to 60 characters for readability
      const truncated = tooltip.length > 60 ? tooltip.substring(0, 57) + '...' : tooltip;
      this.tray.setToolTip(truncated);

      // TODO: Implement animation if enableAnimation is true
      // For now, just update the tooltip
    } else {
      this.tray.setToolTip('Silent');
    }
  }

  updateSettings(settings: TraySettings): void {
    this.settings = settings;

    // Update context menu in case settings affect menu items
    this.updateContextMenu();
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      console.log('[TrayService] Tray destroyed');
    }
  }

  private getTrayIconPath(): string {
    // Try to find tray icon in assets folder
    const iconName = process.platform === 'darwin' ? 'tray-icon-Template.png' : 'tray-icon.png';
    const assetsPath = path.join(__dirname, '../../assets', iconName);

    // Fallback to app icon if tray icon doesn't exist
    // In production, this would be in the packaged app
    return assetsPath;
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
