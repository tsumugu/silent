export const config = {
    /**
     * Whether to show the hidden window (which loads music.youtube.com).
     *
     * When set to true, the hidden window will always be visible.
     * When set to false, visibility is controlled by the debugMode setting in Preferences.
     *
     * Use cases:
     * - Development: Set to true to debug YouTube Music integration
     * - Login: Set to true to log into YouTube Music account
     * - Production: Keep false (users can enable via Preferences > Debug Mode)
     */
    showHiddenWindow: false,
};
