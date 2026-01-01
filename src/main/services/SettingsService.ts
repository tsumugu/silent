import { EventEmitter } from 'events';
import ElectronStore from 'electron-store';
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/types/settings';

type Store = ElectronStore<AppSettings>;

export class SettingsService extends EventEmitter {
  private store: Store;

  constructor() {
    super();

    this.store = new ElectronStore<AppSettings>({
      name: 'settings',
      defaults: DEFAULT_SETTINGS,
      schema: {
        displayMode: {
          type: 'string',
          enum: ['dock', 'menuBar'],
          default: 'menuBar'
        },
        launchAtLogin: {
          type: 'boolean',
          default: false
        },
        tray: {
          type: 'object',
          properties: {
            showTrackTitle: {
              type: 'boolean',
              default: true
            },
            enableAnimation: {
              type: 'boolean',
              default: true
            },
            enableScrolling: {
              type: 'boolean',
              default: true
            }
          }
        }
      }
    });

    try {
      const settings = this.getSettings();
      console.log('[SettingsService] Loaded settings:', settings);
    } catch (error) {
      console.error('[SettingsService] Settings corrupted, resetting to defaults:', error);
      (this.store as any).clear();
      // Reset to defaults
      (this.store as any).set('displayMode', DEFAULT_SETTINGS.displayMode);
      (this.store as any).set('launchAtLogin', DEFAULT_SETTINGS.launchAtLogin);
      (this.store as any).set('tray', DEFAULT_SETTINGS.tray);
    }
  }

  getSettings(): AppSettings {
    // Get all settings from store
    return {
      displayMode: (this.store as any).get('displayMode'),
      launchAtLogin: (this.store as any).get('launchAtLogin'),
      tray: (this.store as any).get('tray')
    };
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    // Update each property individually
    if (partial.displayMode !== undefined) {
      (this.store as any).set('displayMode', partial.displayMode);
    }
    if (partial.launchAtLogin !== undefined) {
      (this.store as any).set('launchAtLogin', partial.launchAtLogin);
    }
    if (partial.tray !== undefined) {
      const currentTray = (this.store as any).get('tray');
      const updatedTray = {
        ...currentTray,
        ...partial.tray
      };
      (this.store as any).set('tray', updatedTray);
    }

    const updated = this.getSettings();
    this.emit('settings-changed', updated);

    console.log('[SettingsService] Settings updated:', updated);
    return updated;
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return (this.store as any).get(key);
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    (this.store as any).set(key, value);
    this.emit('settings-changed', this.getSettings());
  }
}

export const settingsService = new SettingsService();
