/**
 * Zandle Middleware for Zustand stores
 *
 * Intercepts `set` calls and sends changes to Main process for broadcast.
 * Also listens for incoming sync events from other windows.
 */
import { StateCreator } from 'zustand';
import { ZandleSyncPayload, ZandleStoreConfig } from '../../../shared/zandle/types';

// Flag to prevent re-broadcasting received updates
let isSyncingFromExternal = false;

export const zandle =
  <T>(config: ZandleStoreConfig) =>
  (stateCreator: StateCreator<T, [], []>): StateCreator<T, [], []> =>
  (set, get, api): T => {
    const { storeName, syncKeys, excludeKeys } = config;

    // Subscribe to incoming sync events from other windows
    if (typeof window !== 'undefined' && window.electronAPI?.zandle) {
      // Listen for sync events
      window.electronAPI.zandle.onSync(storeName, (payload: ZandleSyncPayload) => {
        // Apply update without re-broadcasting
        isSyncingFromExternal = true;
        set({ [payload.key]: payload.value } as Partial<T>);
        isSyncingFromExternal = false;
      });

      // Request initial hydration
      window.electronAPI.zandle
        .requestHydration(storeName)
        .then((hydration) => {
          if (hydration && Object.keys(hydration.state).length > 0) {
            console.log(
              `[Zandle] Hydrating ${storeName} with ${Object.keys(hydration.state).length} keys`
            );
            isSyncingFromExternal = true;
            set(hydration.state as Partial<T>);
            isSyncingFromExternal = false;
          }
        })
        .catch((err) => {
          console.error(`[Zandle] Failed to hydrate ${storeName}:`, err);
        });
    }

    // Wrap the set function to intercept changes
    const zandleSet = ((partial: any, replace?: any) => {
      const prevState = get();
      set(partial, replace);

      // Don't re-broadcast if this update came from external sync
      if (isSyncingFromExternal) return;

      const nextState = get();

      // Determine which keys changed
      const partialObj =
        typeof partial === 'function' ? partial(prevState) : partial;

      if (!partialObj) return;

      Object.keys(partialObj).forEach((key) => {
        // Check if key should be synced
        if (syncKeys && !syncKeys.includes(key)) return;
        if (excludeKeys && excludeKeys.includes(key)) return;

        // Check if value actually changed
        if ((prevState as any)[key] === (nextState as any)[key]) return;

        // Send sync request to Main
        if (window.electronAPI?.zandle) {
          window.electronAPI.zandle.requestSync({
            storeName,
            key,
            value: (nextState as any)[key],
            originId: window.electronAPI.zandle.windowId,
            timestamp: Date.now(),
          });

          console.log(`[Zandle] Syncing ${storeName}.${key}`);
        }
      });
    }) as typeof set;

    return stateCreator(zandleSet, get, api);
  };
