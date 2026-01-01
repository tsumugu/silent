// Main process entry point - Last rebuild: 2025-12-30T21:16:00
import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { createUIWindow } from './windows/UIWindow';
import { createHiddenWindow } from './windows/HiddenWindow';
import { createAboutWindow } from './windows/AboutWindow';
import { createPreferencesWindow } from './windows/PreferencesWindow';
import { clearIPCHandlers, setupIPCHandlers } from './ipc/handlers';
import { ytMusicService } from './services/YTMusicService';
import { settingsService } from './services/SettingsService';
import { trayService } from './services/TrayService';
import { IPCChannels } from './ipc/types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let hiddenWindow: BrowserWindow | null = null;
let aboutWindow: BrowserWindow | null = null;
let preferencesWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  // Load settings and apply displayMode BEFORE creating windows
  const settings = settingsService.getSettings();
  console.log('[Main] Loaded settings:', settings);

  // Apply display mode (dock vs menuBar)
  if (settings.displayMode === 'menuBar' && process.platform === 'darwin') {
    app.dock?.hide();
    console.log('[Main] Running in Menu Bar mode (dock hidden)');
  } else {
    console.log('[Main] Running in Dock mode');
  }

  // Apply auto-launch setting
  try {
    app.setLoginItemSettings({
      openAtLogin: settings.launchAtLogin,
    });
  } catch (error) {
    // In development mode, macOS may not allow setting login items
    console.warn('[Main] Could not set login item settings (expected in development mode):', error);
  }

  // Create native macOS menu
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        {
          label: 'About Silent',
          click: () => {
            if (!aboutWindow || aboutWindow.isDestroyed()) {
              aboutWindow = createAboutWindow();
            }
            aboutWindow.show();
            aboutWindow.focus();
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'Cmd+,',
          click: () => {
            if (!preferencesWindow || preferencesWindow.isDestroyed()) {
              preferencesWindow = createPreferencesWindow();
            }
            preferencesWindow.show();
            preferencesWindow.focus();
          }
        },
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

  // Initialize tray if in Menu Bar mode
  if (settings.displayMode === 'menuBar' && process.platform === 'darwin') {
    try {
      trayService.initialize(settings.tray, {
        onShowWindow: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
        onShowPreferences: () => {
          if (!preferencesWindow || preferencesWindow.isDestroyed()) {
            preferencesWindow = createPreferencesWindow();
          }
          preferencesWindow.show();
          preferencesWindow.focus();
        },
        onShowAbout: () => {
          if (!aboutWindow || aboutWindow.isDestroyed()) {
            aboutWindow = createAboutWindow();
          }
          aboutWindow.show();
          aboutWindow.focus();
        },
        onQuit: () => {
          app.quit();
        }
      });
    } catch (error) {
      console.error('[Main] Failed to initialize tray, continuing without it:', error);
      // Don't hide dock if tray failed - user needs access to the app
      if (process.platform === 'darwin') {
        app.dock?.show();
      }
    }
  }

  // Listen for settings changes
  settingsService.on('settings-changed', (newSettings) => {
    console.log('[Main] Settings changed:', newSettings);

    // Auto-launch can be updated immediately
    try {
      app.setLoginItemSettings({
        openAtLogin: newSettings.launchAtLogin,
      });
    } catch (error) {
      console.warn('[Main] Could not update login item settings:', error);
    }

    // Update tray settings if in Menu Bar mode
    if (newSettings.displayMode === 'menuBar' && process.platform === 'darwin') {
      trayService.updateSettings(newSettings.tray);
    }

    // Note: displayMode change requires restart (handled by user prompt in Preferences UI)
  });

  hiddenWindow.on('hide', () => {

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

  if (hiddenWindow && !hiddenWindow.isDestroyed()) {
    hiddenWindow.destroy(); // Destroying the background playback window stops the sound
  }
});
