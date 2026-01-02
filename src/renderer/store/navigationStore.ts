import { create } from 'zustand';
import {
  MusicItem,
  isSongItem,
  isAlbumItem,
  isArtistItem,
  isPlaylistItem,
  isRadioItem
} from '../../shared/types/music';

export type ViewType = 'home' | 'detail' | 'search' | 'artist';

export interface StackEntry {
  view: ViewType;
  item: MusicItem | null;
}

interface NavigationState {
  // State
  viewStack: StackEntry[];
  isPlayerOpen: boolean;
  searchQuery: string;
  searchResults: any; // TODO: 型定義を改善

  // Computed getters (derived state)
  currentView: ViewType;
  currentItem: MusicItem | null;

  // Actions
  pushView: (view: ViewType, item?: MusicItem | null) => void;
  popView: () => void;
  replaceView: (view: ViewType, item?: MusicItem | null) => void;
  resetToHome: () => void;

  openPlayer: () => void;
  closePlayer: () => void;

  setSearchQuery: (query: string) => void;
  setSearchResults: (results: any) => void;
  clearSearch: () => void;
}

// Helper function for item comparison
function isSameItem(a: MusicItem, b: MusicItem): boolean {
  if (a.type !== b.type) return false;

  // Type-specific ID comparison using discriminated unions
  if (isSongItem(a) && isSongItem(b)) {
    return a.youtube_video_id === b.youtube_video_id;
  }
  if ((isAlbumItem(a) || isArtistItem(a)) &&
      (isAlbumItem(b) || isArtistItem(b))) {
    return (a as any).youtube_browse_id === (b as any).youtube_browse_id;
  }
  if ((isPlaylistItem(a) || isRadioItem(a)) &&
      (isPlaylistItem(b) || isRadioItem(b))) {
    return (a as any).youtube_playlist_id === (b as any).youtube_playlist_id;
  }

  return false;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  // Initial state
  viewStack: [{ view: 'home', item: null }],
  isPlayerOpen: false,
  searchQuery: '',
  searchResults: null,

  // Computed properties
  get currentView() {
    const stack = get().viewStack;
    return stack[stack.length - 1]?.view || 'home';
  },
  get currentItem() {
    const stack = get().viewStack;
    return stack[stack.length - 1]?.item || null;
  },

  // Actions
  pushView: (view, item = null) => {
    console.log('[navigationStore] pushView called:', { view, item });
    set((state) => {
      const current = state.viewStack[state.viewStack.length - 1];
      console.log('[navigationStore] current:', current);

      // 重複チェック: 同じビュー + 同じアイテムなら push しない
      if (current.view === view && current.item === item) {
        console.log('[navigationStore] Duplicate detected (reference check)');
        return state;
      }

      // detail/artist の場合、ID で重複チェック
      if ((view === 'detail' || view === 'artist') && item && current.item) {
        const isSame = isSameItem(current.item, item);
        console.log('[navigationStore] isSameItem check:', isSame);
        if (isSame) {
          console.log('[navigationStore] Duplicate detected (ID check)');
          return state;
        }
      }

      console.log('[navigationStore] Pushing new view');
      return {
        viewStack: [...state.viewStack, { view, item }],
        isPlayerOpen: false // 新しいビューに遷移したらプレイヤーを閉じる
      };
    });
  },

  popView: () => {
    set((state) => {
      // プレイヤーが開いていたら、まずそれを閉じる
      if (state.isPlayerOpen) {
        return { isPlayerOpen: false };
      }

      // スタックが 1 つ以下なら何もしない
      if (state.viewStack.length <= 1) {
        return state;
      }

      const poppedEntry = state.viewStack[state.viewStack.length - 1];

      // 検索ビューから離れる場合、検索状態をクリア
      const updates: Partial<NavigationState> = {
        viewStack: state.viewStack.slice(0, -1)
      };

      if (poppedEntry.view === 'search') {
        updates.searchQuery = '';
        updates.searchResults = null;
      }

      return updates as NavigationState;
    });
  },

  replaceView: (view, item = null) => {
    set((state) => ({
      viewStack: [...state.viewStack.slice(0, -1), { view, item }]
    }));
  },

  resetToHome: () => {
    set({
      viewStack: [{ view: 'home', item: null }],
      isPlayerOpen: false,
      searchQuery: '',
      searchResults: null
    });
  },

  openPlayer: () => set({ isPlayerOpen: true }),
  closePlayer: () => set({ isPlayerOpen: false }),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  clearSearch: () => set({ searchQuery: '', searchResults: null })
}));
