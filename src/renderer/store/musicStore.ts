import { create } from 'zustand';
import { MusicDetail } from '../../shared/types/music';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean; // SWR flag
}

interface LoadingState {
  [key: string]: boolean;
}

interface MusicState {
  // Cache storage
  albumCache: Map<string, CacheEntry<MusicDetail>>;
  playlistCache: Map<string, CacheEntry<MusicDetail>>;
  artistCache: Map<string, CacheEntry<MusicDetail>>;

  // Loading states
  loadingStates: LoadingState;

  // Actions
  getAlbum: (id: string) => MusicDetail | null;
  setAlbum: (id: string, data: MusicDetail) => void;

  getPlaylist: (id: string) => MusicDetail | null;
  setPlaylist: (id: string, data: MusicDetail) => void;

  getArtist: (id: string) => MusicDetail | null;
  setArtist: (id: string, data: MusicDetail) => void;

  isLoading: (type: 'album' | 'playlist' | 'artist', id: string) => boolean;
  setLoading: (type: 'album' | 'playlist' | 'artist', id: string, loading: boolean) => void;

  markStale: (type: 'album' | 'playlist' | 'artist', id: string) => void;
  invalidate: (type: 'album' | 'playlist' | 'artist', id: string) => void;
  clearAll: () => void;
}

const STALE_TIME = 5 * 60 * 1000; // 5 minutes until cache is considered stale

export const useMusicStore = create<MusicState>((set, get) => ({
  albumCache: new Map(),
  playlistCache: new Map(),
  artistCache: new Map(),
  loadingStates: {},

  // Album actions
  getAlbum: (id) => {
    const entry = get().albumCache.get(id);
    if (!entry) return null;

    // Check if stale
    const now = Date.now();
    if (now - entry.timestamp > STALE_TIME && !entry.isStale) {
      // Mark as stale but still return data (SWR pattern)
      set((state) => {
        const newCache = new Map(state.albumCache);
        newCache.set(id, { ...entry, isStale: true });
        return { albumCache: newCache };
      });
    }

    return entry.data;
  },

  setAlbum: (id, data) => {
    set((state) => {
      const newCache = new Map(state.albumCache);
      newCache.set(id, {
        data,
        timestamp: Date.now(),
        isStale: false
      });
      return { albumCache: newCache };
    });
  },

  // Playlist actions
  getPlaylist: (id) => {
    const entry = get().playlistCache.get(id);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > STALE_TIME && !entry.isStale) {
      set((state) => {
        const newCache = new Map(state.playlistCache);
        newCache.set(id, { ...entry, isStale: true });
        return { playlistCache: newCache };
      });
    }

    return entry.data;
  },

  setPlaylist: (id, data) => {
    set((state) => {
      const newCache = new Map(state.playlistCache);
      newCache.set(id, {
        data,
        timestamp: Date.now(),
        isStale: false
      });
      return { playlistCache: newCache };
    });
  },

  // Artist actions
  getArtist: (id) => {
    const entry = get().artistCache.get(id);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > STALE_TIME && !entry.isStale) {
      set((state) => {
        const newCache = new Map(state.artistCache);
        newCache.set(id, { ...entry, isStale: true });
        return { artistCache: newCache };
      });
    }

    return entry.data;
  },

  setArtist: (id, data) => {
    set((state) => {
      const newCache = new Map(state.artistCache);
      newCache.set(id, {
        data,
        timestamp: Date.now(),
        isStale: false
      });
      return { artistCache: newCache };
    });
  },

  // Loading state management
  isLoading: (type, id) => {
    const key = `${type}:${id}`;
    return get().loadingStates[key] || false;
  },

  setLoading: (type, id, loading) => {
    const key = `${type}:${id}`;
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: loading
      }
    }));
  },

  // Cache management
  markStale: (type, id) => {
    set((state) => {
      const cacheKey = `${type}Cache` as keyof Pick<MusicState, 'albumCache' | 'playlistCache' | 'artistCache'>;
      const cache = state[cacheKey];
      const entry = cache.get(id);

      if (!entry) return state;

      const newCache = new Map(cache);
      newCache.set(id, { ...entry, isStale: true });

      return { [cacheKey]: newCache } as Partial<MusicState>;
    });
  },

  invalidate: (type, id) => {
    set((state) => {
      const cacheKey = `${type}Cache` as keyof Pick<MusicState, 'albumCache' | 'playlistCache' | 'artistCache'>;
      const newCache = new Map(state[cacheKey]);
      newCache.delete(id);

      return { [cacheKey]: newCache } as Partial<MusicState>;
    });
  },

  clearAll: () => {
    set({
      albumCache: new Map(),
      playlistCache: new Map(),
      artistCache: new Map(),
      loadingStates: {}
    });
  }
}));
