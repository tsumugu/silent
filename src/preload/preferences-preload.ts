import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings } from '../shared/types/settings';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  closeWindow: () => ipcRenderer.send('window:close'),

  // Settings API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Partial<AppSettings>) =>
    ipcRenderer.invoke('settings:update', settings),
  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    const listener = (_: any, settings: AppSettings) => callback(settings);
    ipcRenderer.on('settings:changed', listener);
    return () => ipcRenderer.removeListener('settings:changed', listener);
  },
  requestRestart: () => ipcRenderer.invoke('settings:request-restart'),
});
