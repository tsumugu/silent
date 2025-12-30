// Main process entry point - Last rebuild: 2025-12-30T21:16:00
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { createUIWindow } from './windows/UIWindow';
import { createHiddenWindow } from './windows/HiddenWindow';
import { setupIPCHandlers } from './ipc/handlers';

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

  // Fullscreen state change listeners
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-changed', false);
  });

  // Window controls IPC handlers
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isFullScreen()) {
      mainWindow.setFullScreen(false);
    } else {
      mainWindow?.setFullScreen(true);
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createUIWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
