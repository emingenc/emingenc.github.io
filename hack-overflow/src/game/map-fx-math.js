const MAP_FX = { bands:8,bandStaggerMs:30,bandFadeMs:120,revealDelayMs:90,ringMs:1700,ringReach:3.2,ringAlpha:0.8,ringCount:2,dashPx:4,dashMarchMs:900 };
const HALF = 0.5;
const EASE_POWER = 3;
const RING_FADE_POWER = 1.5;

function easeOut(time) {
return 1 - Math.pow(1 - time,EASE_POWER);
}
function mapBandAlpha(index,elapsedMs) {
const time = (elapsedMs - index * MAP_FX.bandStaggerMs) / MAP_FX.bandFadeMs;
return easeOut(Math.min(1,Math.max(0,time)));
}
function mapRevealMs() {
return (MAP_FX.bands - 1) * MAP_FX.bandStaggerMs + MAP_FX.bandFadeMs;
}
function mapRingProgress(nowMs,index) {
const turns = nowMs / MAP_FX.ringMs + index / MAP_FX.ringCount;
return turns - Math.floor(turns);
}
function mapRingAlpha(progress) {
return Math.pow(1 - progress,RING_FADE_POWER) * MAP_FX.ringAlpha;
}
function mapRingScale(progress) {
return 1 + easeOut(progress) * MAP_FX.ringReach;
}
function mapDashOffset(nowMs) {
const turns = nowMs / MAP_FX.dashMarchMs;
return (turns - Math.floor(turns)) * MAP_FX.dashPx * 2;
}
function mapBandEdges(index,width) {
const step = width / MAP_FX.bands;
return { left:Math.round(index * step),right:Math.round((index + 1) * step) };
}

export { MAP_FX,HALF,mapBandAlpha,mapRevealMs,mapRingProgress,mapRingAlpha,mapRingScale,mapDashOffset,mapBandEdges };
