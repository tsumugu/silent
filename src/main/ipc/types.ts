// IPC channel names
export enum IPCChannels {
  // Window controls
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_MAXIMIZE = 'window:maximize',
  WINDOW_CLOSE = 'window:close',
  FULLSCREEN_CHANGED = 'fullscreen-changed',

  // Playback state updates (Hidden → Main → UI)
  PLAYBACK_STATE_CHANGED = 'playback:state-changed',
  PLAYBACK_GET_STATE = 'playback:get-state',

  // Playback controls (UI → Main → Hidden)
  PLAYBACK_PLAY = 'playback:play',
  PLAYBACK_PAUSE = 'playback:pause',
  PLAYBACK_NEXT = 'playback:next',
  PLAYBACK_PREVIOUS = 'playback:previous',
  PLAYBACK_SEEK = 'playback:seek',

  // Image Proxy
  IMAGE_PROXY_FETCH = 'image:proxy-fetch',

  // YTMusic API
  YT_GET_HOME_ALBUMS = 'ytmusic:get-home-albums',
  YT_GET_HOME = 'ytmusic:get-home',
  YT_GET_ALBUM_DETAILS = 'ytmusic:get-album-details',
  YT_GET_PLAYLIST = 'ytmusic:get-playlist',
  YT_GET_SONG_DETAILS = 'ytmusic:get-song-details',
  YT_SEARCH = 'ytmusic:search',
  YT_SHOW_LOGIN = 'ytmusic:show-login',
  YT_PLAY = 'ytmusic:play',
  YT_CHECK_LOGIN = 'ytmusic:check-login',
  YT_SESSION_UPDATED = 'ytmusic:session-updated',
  WINDOW_SET_VIBRANCY = 'window:set-vibrancy',
}
