import { clamp01, lerp, easeOutCubic } from './ease.js';

const FLOAT = { ms:800,popMs:120,popScale:1.6,holdMs:150,fadeFrom:0.6 };

function popScale(age) {
return lerp(FLOAT.popScale,1,easeOutCubic(clamp01(age / FLOAT.popMs)));
}
function riseAt(age) {
const left = 1 - clamp01((age - FLOAT.holdMs) / (FLOAT.ms - FLOAT.holdMs));
return 1 - left * left;
}
function fadeAt(age) {
const progress = clamp01(age / FLOAT.ms);
return progress < FLOAT.fadeFrom ? 1 :1 - (progress - FLOAT.fadeFrom) / (1 - FLOAT.fadeFrom);
}

export { FLOAT,popScale,riseAt,fadeAt };
