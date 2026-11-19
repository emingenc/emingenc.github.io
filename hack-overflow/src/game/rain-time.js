const MS_PER_SECOND = 1000;
const FRAMES_PER_SECOND = 60;
const FRAME_MS = MS_PER_SECOND / FRAMES_PER_SECOND;
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const FADE_PER_FRAME = 0.15;

function rainFrameScale(elapsedMs) {
if (!(elapsedMs > 0)) return 1;
return Math.min(MAX_SCALE,Math.max(MIN_SCALE,elapsedMs / FRAME_MS));
}
function rainFadeAlpha(scale) {
return 1 - Math.pow(1 - FADE_PER_FRAME,scale);
}

export { rainFrameScale,rainFadeAlpha };
