/**
 * useMediaSession Hook
 *
 * NOTE: This hook is now a no-op. Playback state synchronization is now handled
 * automatically by the Zandle middleware in playerStore.ts.
 *
 * The Zandle middleware:
 * - Automatically subscribes to playback state changes via IPC
 * - Handles initial state hydration on mount
 * - Syncs state across all windows without manual intervention
 *
 * This hook is kept for backward compatibility and can be safely removed
 * if all call sites are updated.
 */
export function useMediaSession() {
  // No-op: Zandle middleware handles all state synchronization
}
