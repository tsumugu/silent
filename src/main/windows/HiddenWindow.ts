import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import { config } from '../../shared/config';

export function createHiddenWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, 'preload', 'hidden-preload.js');

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: config.showHiddenWindow,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: false, // Required for direct MediaSession hook. We will avoid EvalError by not using injection.
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Load YouTube Music
  win.loadURL('https://music.youtube.com');

  // Dev tools in development for debugging
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.webContents.on('did-finish-load', () => {
    console.log('[HiddenWindow] Page loaded');
  });

  return win;
}
