export type DisplayMode = 'dock' | 'menuBar';

export interface TraySettings {
  showTrackTitle: boolean;
  enableScrolling: boolean; // Marquee scrolling for long track names
}

export interface AppSettings {
  displayMode: DisplayMode;
  launchAtLogin: boolean;
  language: string;
  location: string;
  tray: TraySettings;
  /**
   * Debug mode - shows the hidden window for development/debugging.
   * Note: This is a session-based setting that automatically resets to false on app restart.
   */
  debugMode: boolean;
  backgroundOpacity: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'menuBar',
  launchAtLogin: false,
  language: 'en',
  location: 'US',
  tray: {
    showTrackTitle: true,
    enableScrolling: true,
  },
  debugMode: false,
  backgroundOpacity: 0.7
};
