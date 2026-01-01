export type DisplayMode = 'dock' | 'menuBar';

export interface TraySettings {
  showTrackTitle: boolean;
  enableScrolling: boolean; // Marquee scrolling for long track names
}

export interface AppSettings {
  displayMode: DisplayMode;
  launchAtLogin: boolean;
  tray: TraySettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'menuBar',
  launchAtLogin: false,
  tray: {
    showTrackTitle: true,
    enableScrolling: true,
  }
};
