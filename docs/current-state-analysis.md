# Current State Analysis: ID Flow & State Management

## 1. ID Flow Architecture

YouTube Music uses several types of IDs, each with a specific purpose.

| ID Type | Example Prefix | Purpose | Used in |
| :--- | :--- | :--- | :--- |
| **`youtube_video_id`** | (11 chars) | Playback of a specific song. | `window.electronAPI.play` |
| **`youtube_browse_id`** | `MPRE...` | Fetching Album details. | `window.electronAPI.getAlbumDetails` |
| **`youtube_browse_id`** | `UC...` | Fetching Artist details. | `window.electronAPI.getArtistDetails` |
| **`youtube_playlist_id`** | `PL...`, `RD...` | Fetching Playlist details / Playback context. | `window.electronAPI.getPlaylist`, `play(id, 'SONG', playlistId)` |

### Progression Example
1.  **Search**: Returns a list of `MusicItem`s with mixed ID types.
2.  **Navigate**: 
    - Click Album -> `navigateTo('detail', item)` using `youtube_browse_id`.
    - Click Artist -> `navigateTo('artist', item)` using `youtube_browse_id`.
3.  **Fetch**: `MusicDetailView` / `ArtistDetailView` calls the corresponding IPC method with the ID.
4.  **Play**: Selecting a song calls `window.electronAPI.play(videoId, type, contextId, artists, albumId)`.

## 2. State Management Overview

Currently, state is split between React local state (App.tsx) and a Zustand store (playerStore.ts).

### Renderer State (Zustand)
- **`playerStore.ts`**:
    - `playbackInfo`: Holds the "Now Playing" metadata and status.
    - `isPlaying`: Simple boolean for UI play/pause buttons.
    - Synced via `useMediaSession.ts` hook listening to `playback:state-changed` IPC events.

### UI State (React `useState` in App.tsx)
- **`viewStack`**: 
    ```typescript
    interface StackEntry {
      view: 'home' | 'detail' | 'search' | 'artist';
      item: MusicItem | null;
    }
    ```
    Used for navigation history and "Back" button functionality.
- **`isPlayerOpen`**: Controls the visibility of the full-screen `PlayerView`.
- **Search State**: `searchQuery` and `searchResults`.

## 3. Current Issues & Limitations

1.  **Type Safety**: `MusicItem` uses optional fields for all IDs, leading to frequent null-checks and potential runtime errors.
2.  **ID Propagation**: Artist IDs are often missing from song items when fetched within an album context, making navigation to artist pages from the player difficult.
3.  **Complex Navigation**: `App.tsx` handles all navigation logic, which will become harder to maintain as more views are added.
4.  **Data Consistency**: The same song might have different metadata (e.g., missing album info) depending on where it was fetched from (Search vs. Album vs. Playlist).
