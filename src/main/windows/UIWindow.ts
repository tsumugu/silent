import { BrowserWindow, app } from 'electron';
import * as path from 'path';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export function createUIWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    minWidth: 300,
    minHeight: 350,
    frame: false,
    transparent: true,
    vibrancy: 'under-window',
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

  return win;
}
