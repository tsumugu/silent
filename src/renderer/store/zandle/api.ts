/**
 * Zandle API helper - type definitions
 * The actual API is exposed via window.electronAPI.zandle in preload scripts
 */
import {
  ZandleSyncPayload,
  ZandleHydrationPayload,
  ZandleSyncableStore,
} from '../../../shared/zandle/types';

/**
 * Zandle API interface exposed on window.electronAPI.zandle
 * This provides type-safe access to the cross-window state synchronization system
 */
export interface ZandleAPI {
  /** Current window's webContents ID */
  windowId: number;

  /** Request sync of a state change to all other windows */
  requestSync: (payload: ZandleSyncPayload) => void;

  /** Request initial state hydration for a store */
  requestHydration: (
    storeName: ZandleSyncableStore
  ) => Promise<ZandleHydrationPayload>;

  /** Listen for sync events from other windows */
  onSync: (
    storeName: string,
    callback: (payload: ZandleSyncPayload) => void
  ) => () => void;
}

// Type assertion helper for accessing Zandle API safely
export function getZandleAPI(): ZandleAPI | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.electronAPI?.zandle;
}
