import { typedChars } from '../story/story.js';
import { clamp01,easeOutCubic } from '../ease.js';

const POP_MS = 140;
const POP_FROM = 0.85;
const FADE_MS = 160;
const FLOAT_PX = 3;

function bubbleLook(line) {
if (line.still) return { scale:1,alpha:1,lift:0 };
const rise = easeOutCubic(clamp01(line.age / POP_MS));
const out = clamp01((line.age - (line.ms - FADE_MS)) / FADE_MS);
return { scale:POP_FROM + (1 - POP_FROM) * rise,alpha:Math.min(rise,1 - out),lift:FLOAT_PX * out };
}
function typedLines(lines,clock) {
const total = lines.reduce(function (sum,line) { return sum + line.length; },0);
let left = typedChars({ length:total,elapsedMs:clock.age,reduced:clock.still });
return lines.map(function (line) {
const shown = line.slice(0,left);
left = Math.max(0,left - line.length);
return shown;
});
}

export { bubbleLook,typedLines };
