export type DisplayMode = 'dock' | 'menuBar';

export interface TraySettings {
  showTrackTitle: boolean;
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
  }
};
