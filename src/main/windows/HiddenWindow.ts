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
      sandbox: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });

  // Load YouTube Music
  win.loadURL('https://music.youtube.com');

  // Dev tools in development for debugging
  const isScreenshotMode = process.argv.includes('--screenshot-mode');
  if (!app.isPackaged && !isScreenshotMode) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  win.webContents.on('did-finish-load', () => {
    console.log('[HiddenWindow] Page loaded');
  });

  // Prevent closing the hidden window, just hide it
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });

  return win;
}
