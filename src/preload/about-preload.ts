import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  closeWindow: () => ipcRenderer.send('window:close'),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
});
