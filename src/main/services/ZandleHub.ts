/**
 * ZandleHub - Central coordinator for cross-window state synchronization
 *
 * Responsibilities:
 * 1. Receive sync requests from any window
 * 2. Broadcast changes to all other windows
 * 3. Maintain authoritative state cache for hydration
 * 4. Handle window lifecycle (new windows, closed windows)
 */
import { ipcMain, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import {
  ZandleSyncPayload,
  ZandleHydrationPayload,
  ZandleSyncableStore,
} from '../../shared/zandle/types';
import { IPCChannels } from '../ipc/types';

export class ZandleHub {
  // Authoritative state cache (Source of Truth for hydration)
  private stateCache: Map<ZandleSyncableStore, Record<string, unknown>> =
    new Map();

  // Hidden window reference (for special handling if needed)
  private hiddenWindowId: number | null = null;

  constructor() {
    // Initialize empty state for each syncable store
    this.stateCache.set('player', {});
    this.stateCache.set('like', {});
  }

  /**
   * Initialize the hub and set up IPC listeners
   */
  start(hiddenWindow?: BrowserWindow): void {
    if (hiddenWindow && !hiddenWindow.isDestroyed()) {
      this.hiddenWindowId = hiddenWindow.id;
    }

    // Handle sync requests from renderers
    ipcMain.on(
      IPCChannels.ZANDLE_REQUEST_SYNC,
      this.handleSyncRequest.bind(this)
    );

    // Handle hydration requests (new window startup)
    ipcMain.handle(
      IPCChannels.ZANDLE_REQUEST_HYDRATION,
      this.handleHydrationRequest.bind(this)
    );

    console.log('[ZandleHub] Initialized and listening for sync requests');
  }

  /**
   * Handle incoming sync request - broadcast to all other windows
   */
  private handleSyncRequest(
    event: IpcMainEvent,
    payload: ZandleSyncPayload
  ): void {
    const { storeName, key, value, originId } = payload;

    // Update authoritative cache
    const storeState =
      this.stateCache.get(storeName as ZandleSyncableStore) || {};
    storeState[key] = value;
    this.stateCache.set(storeName as ZandleSyncableStore, storeState);

    // Determine target channel
    const syncChannel = `zandle:sync:${storeName}`;

    // Broadcast to all windows except origin
    const windows = BrowserWindow.getAllWindows();
    let broadcastCount = 0;

    windows.forEach((win) => {
      if (!win.isDestroyed() && win.webContents.id !== originId) {
        win.webContents.send(syncChannel, payload);
        broadcastCount++;
      }
    });

    console.log(
      `[ZandleHub] Broadcasted ${storeName}.${key} to ${broadcastCount} windows (origin: ${originId})`
    );
  }

  /**
   * Handle hydration request - return current state for a store
   */
  private handleHydrationRequest(
    _event: IpcMainInvokeEvent,
    storeName: ZandleSyncableStore
  ): ZandleHydrationPayload {
    const state = this.stateCache.get(storeName) || {};
    const payload: ZandleHydrationPayload = {
      storeName,
      state,
      timestamp: Date.now(),
    };

    console.log(
      `[ZandleHub] Hydration requested for ${storeName}, keys: ${Object.keys(state).length}`
    );

    return payload;
  }

  /**
   * Programmatically update state (for use by other Main process services)
   * @param storeName - Name of the store to update
   * @param key - Key to update
   * @param value - New value
   * @param broadcastToAll - Whether to broadcast to all windows (default: true)
   */
  updateState(
    storeName: ZandleSyncableStore,
    key: string,
    value: unknown,
    broadcastToAll = true
  ): void {
    // Update cache
    const storeState = this.stateCache.get(storeName) || {};
    storeState[key] = value;
    this.stateCache.set(storeName, storeState);

    if (broadcastToAll) {
      const syncChannel = `zandle:sync:${storeName}`;
      const payload: ZandleSyncPayload = {
        storeName,
        key,
        value,
        originId: -1, // Main process origin
        timestamp: Date.now(),
      };

      const windows = BrowserWindow.getAllWindows();
      let broadcastCount = 0;

      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(syncChannel, payload);
          broadcastCount++;
        }
      });

      console.log(
        `[ZandleHub] Main process updated ${storeName}.${key}, broadcasted to ${broadcastCount} windows`
      );
    }
  }

  /**
   * Get current cached state for a store
   */
  getState(storeName: ZandleSyncableStore): Record<string, unknown> {
    return this.stateCache.get(storeName) || {};
  }

  /**
   * Clear all cached state (useful for testing/reset)
   */
  clearCache(): void {
    this.stateCache.clear();
    this.stateCache.set('player', {});
    this.stateCache.set('like', {});
    console.log('[ZandleHub] Cache cleared');
  }
}

// Singleton instance
export const zandleHub = new ZandleHub();
