# Background Color Enhancement Plan

Improve background color extraction and add a dynamic, animated mesh-like background to `PlayerView` for a more premium and interesting visual experience.

## Proposed Changes

### 1. Multi-Color Extraction
Update `mediaCache.ts` and `node-vibrant` logic to extract 4 swatches instead of 2.
- `primary`: Vibrant
- `secondary`: DarkVibrant
- `tertiary`: Muted
- `quaternary`: LightVibrant

### 2. Animated Mesh Background
Implement a dynamic background in `PlayerView` using:
- Overlapping radial gradients (blobs) using the 4 extracted colors.
- CSS keyframe animations to move these blobs slowly, creating a "wiggling" or "liquid" effect.
- Backdrop blur on content overlays to maintain legibility.

### 3. Consistency
Update the `MiniPlayer` to pull from the same 4-color palette for a richer look.
