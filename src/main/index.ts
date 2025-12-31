// Main process entry point - Last rebuild: 2025-12-30T21:16:00
import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { createUIWindow } from './windows/UIWindow';
import { createHiddenWindow } from './windows/HiddenWindow';
import { clearIPCHandlers, setupIPCHandlers } from './ipc/handlers';
import { ytMusicService } from './services/YTMusicService';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let hiddenWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  // Create native macOS menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow = createUIWindow();
  hiddenWindow = createHiddenWindow();

  // Set up IPC handlers for communication between windows
  setupIPCHandlers(mainWindow, hiddenWindow);

  hiddenWindow.on('hide', () => {
    console.log('Hidden window hidden, refreshing YTMusic session...');
    ytMusicService.initialize(true).then(() => {
      mainWindow?.webContents.send('ytmusic:session-updated');
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    clearIPCHandlers();
  });

  // Window controls are now handled in setupIPCHandlers to keep logic unified

  app.on('activate', () => {
    if (mainWindow === null) {
      const newWin = createUIWindow();
      mainWindow = newWin;
      // Re-setup handlers for the new window
      if (hiddenWindow) {
        setupIPCHandlers(newWin, hiddenWindow);
      }

      // Re-setup fullscreen listeners
      newWin.on('enter-full-screen', () => {
        newWin.webContents.send('fullscreen-changed', true);
      });

      newWin.on('leave-full-screen', () => {
        newWin.webContents.send('fullscreen-changed', false);
      });

      newWin.on('closed', () => {
        mainWindow = null;
        clearIPCHandlers();
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure playback stops when the app is explicitly quit (Cmd+Q etc.)
app.on('before-quit', () => {
  console.log('App is quitting, stopping playback...');
  if (hiddenWindow && !hiddenWindow.isDestroyed()) {
    hiddenWindow.destroy(); // Destroying the background playback window stops the sound
  }
});
