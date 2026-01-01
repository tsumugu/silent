import { BrowserWindow } from 'electron';

declare const PREFERENCES_WINDOW_WEBPACK_ENTRY: string;
declare const PREFERENCES_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function createPreferencesWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 700,
    height: 550,
    minWidth: 700,
    minHeight: 550,
    maxWidth: 700,
    maxHeight: 550,
    frame: false,
    transparent: true,
    vibrancy: 'under-window', // Same as UIWindow
    backgroundColor: '#00000000',
    fullscreenable: false,
    webPreferences: {
      preload: PREFERENCES_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadURL(PREFERENCES_WINDOW_WEBPACK_ENTRY);

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}
