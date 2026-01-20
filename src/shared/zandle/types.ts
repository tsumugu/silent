/**
 * Zandle - Zustand + IPC Synchronization Layer
 * Core type definitions for cross-process state synchronization
 */

/**
 * Payload sent over IPC for state synchronization
 */
export interface ZandleSyncPayload<T = unknown> {
  /** Store name being synced (e.g., 'player', 'like') */
  storeName: string;
  /** Property name being synced */
  key: string;
  /** New value (must be JSON-serializable) */
  value: T;
  /** webContents.id of sender (for loop prevention) */
  originId: number;
  /** Timestamp for debugging/ordering */
  timestamp: number;
}

/**
 * Full state hydration payload for initial sync
 */
export interface ZandleHydrationPayload<T = Record<string, unknown>> {
  storeName: string;
  state: T;
  timestamp: number;
}

/**
 * Store names that support Zandle sync
 */
export type ZandleSyncableStore = 'player' | 'like';

/**
 * Configuration for a Zandle-enabled store
 */
export interface ZandleStoreConfig {
  /** Name of the store to sync */
  storeName: ZandleSyncableStore;
  /** Specific keys to sync (undefined = sync all) */
  syncKeys?: string[];
  /** Keys to exclude from sync */
  excludeKeys?: string[];
}
