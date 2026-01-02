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
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'menuBar',
  launchAtLogin: false,
  language: 'en',
  location: 'US',
  tray: {
    showTrackTitle: true,
    enableScrolling: true,
  }
};
