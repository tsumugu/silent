import { BrowserWindow, app } from 'electron';
import * as path from 'path';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function createUIWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 300,
    minHeight: 350,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
    visualEffectState: 'followWindow',
    backgroundColor: '#00000000',
    fullscreenable: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Load renderer
  win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Dev tools in development
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}
