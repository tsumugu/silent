import { BrowserWindow } from 'electron';

declare const ABOUT_WINDOW_WEBPACK_ENTRY: string;
declare const ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function createAboutWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 500,
    height: 400,
    minWidth: 500,
    minHeight: 400,
    maxWidth: 500,
    maxHeight: 400,
    frame: false,
    transparent: true,
    vibrancy: 'under-window', // Same as UIWindow
    backgroundColor: '#00000000',
    fullscreenable: false,
    webPreferences: {
      preload: ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadURL(ABOUT_WINDOW_WEBPACK_ENTRY);

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}
