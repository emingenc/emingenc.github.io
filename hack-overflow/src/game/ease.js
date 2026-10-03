const HALF = 0.5;
const CUBIC_EXPONENT = 3;

function clamp01(value) {
return Math.min(1,Math.max(0,value));
}
function lerp(from,to,progress) {
return from + (to - from) * progress;
}
function easeOutCubic(progress) {
return 1 - Math.pow(1 - progress,CUBIC_EXPONENT);
}
function easeInOutQuad(progress) {
if (progress < HALF) return 2 * progress * progress;
return 1 - Math.pow(2 * (1 - progress),2) / 2;
}
function countUpValue(from,to,progress) {
return lerp(from,to,easeOutCubic(clamp01(progress)));
}

export { clamp01, lerp, easeOutCubic, easeInOutQuad, countUpValue };
