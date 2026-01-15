# Fix Seekbar Reset Issue

The seek bar fails to reset correctly when a song changes because the metadata (specifically the `videoId` extracted from the URL) updates before the video element's `currentTime` is reset. This results in "glitched" playback info where a new `videoId` is paired with the previous song's position.

## Proposed Changes

### [Renderer] UI Layer Fix
Combine the separate `useEffect` hooks in [SeekBar.tsx](file:///Users/tsumugu/Desktop/dev/cursor/silent/src/renderer/components/PlayerView/SeekBar.tsx) into a single hook that prioritizes `videoId` changes. This ensures that if a new `videoId` is detected, the visual time is immediately reset to 0, even if the `currentTime` prop is still reporting a stale value.

#### [MODIFY] [SeekBar.tsx](file:///Users/tsumugu/Desktop/dev/cursor/silent/src/renderer/components/PlayerView/SeekBar.tsx)
- Consolidate `useEffect([videoId])` and `useEffect([currentTime])`.
- If `videoId` has changed since the last render, force `visualTime` to 0.

### [Preload] Data Reporting Layer Fix (Robust Transition)
The previous fix only handled the first frame of a transition. We need to "lock" the position to 0 until the video element actually resets.

#### [MODIFY] [hidden-preload.ts](file:///Users/tsumugu/Desktop/dev/cursor/silent/src/preload/hidden-preload.ts)
- Add a persistent `isTransitioning` flag and `lastReportedVideoId`.
- When `videoId` changes, set `isTransitioning = true`.
- While `isTransitioning` is true, force `position = 0` UNTIL `video.currentTime < 1.0`.

#### [MODIFY] [observables.ts](file:///Users/tsumugu/Desktop/dev/cursor/silent/src/preload/playback/observables.ts)
- Update the `scan` logic to maintain the "transitioning" state across multiple emissions.

## Verification Plan

### Manual Verification
1. Play a song and let it reach near the end.
2. Watch the seek bar as it transitions to the next song.
3. Verify that the seek bar immediately resets to 0 and doesn't jump to the previous song's end position even for a split second.
4. Test manual "Next" button clicks and verify the same.
5. Test clicking a song from the library when another is playing.
