// IPC channel names
export enum IPCChannels {
  // Window controls
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_MAXIMIZE = 'window:maximize',
  WINDOW_CLOSE = 'window:close',
  FULLSCREEN_CHANGED = 'fullscreen-changed',

  WINDOW_SET_VIBRANCY = 'window:set-vibrancy',
  WINDOW_SET_SHADOW = 'window:set-shadow',
  // Playback state updates (Hidden → Main → UI)
  PLAYBACK_STATE_CHANGED = 'playback:state-changed',
  PLAYBACK_GET_STATE = 'playback:get-state',

  // Playback controls (UI → Main → Hidden)
  PLAYBACK_PLAY = 'playback:play',
  PLAYBACK_PAUSE = 'playback:pause',
  PLAYBACK_NEXT = 'playback:next',
  PLAYBACK_PREVIOUS = 'playback:previous',
  PLAYBACK_SEEK = 'playback:seek',
  PLAYBACK_SHUFFLE = 'playback:shuffle',

  // Image Proxy
  IMAGE_PROXY_FETCH = 'image:proxy-fetch',

  // YTMusic API
  YT_GET_HOME_ALBUMS = 'ytmusic:get-home-albums',
  YT_GET_HOME = 'ytmusic:get-home',
  YT_GET_ALBUM_DETAILS = 'ytmusic:get-album-details',
  YT_GET_PLAYLIST = 'ytmusic:get-playlist',
  YT_GET_ARTIST_DETAILS = 'ytmusic:get-artist-details',
  YT_GET_SONG_DETAILS = 'ytmusic:get-song-details',
  YT_SEARCH = 'ytmusic:search',
  YT_SHOW_LOGIN = 'ytmusic:show-login',
  YT_PLAY = 'ytmusic:play',
  YT_CHECK_LOGIN = 'ytmusic:check-login',
  YT_SESSION_UPDATED = 'ytmusic:session-updated',
  YT_SET_LIKE_STATUS = 'ytmusic:set-like-status',
  YT_GET_LIKED_MUSIC = 'ytmusic:get-liked-music',

  // Settings
  SETTINGS_GET = 'settings:get',
  SETTINGS_UPDATE = 'settings:update',
  SETTINGS_CHANGED = 'settings:changed',
  SETTINGS_SHOW_ABOUT = 'settings:show-about',
  SETTINGS_SHOW_PREFERENCES = 'settings:show-preferences',
  SETTINGS_REQUEST_RESTART = 'settings:request-restart',
  APP_GET_VERSION = 'app:get-version',
  APP_CHECK_FOR_UPDATES = 'app:check-for-updates',

  // Cache
  CACHE_CLEAR = 'cache:clear',
  CACHE_GET_SIZE = 'cache:get-size',

  // Zandle state synchronization
  ZANDLE_REQUEST_SYNC = 'zandle:request-sync',
  ZANDLE_SYNC_PLAYER = 'zandle:sync:player',
  ZANDLE_SYNC_LIKE = 'zandle:sync:like',
  ZANDLE_REQUEST_HYDRATION = 'zandle:request-hydration',
  GET_WINDOW_ID = 'get-window-id',
}
