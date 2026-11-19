import { clamp01 } from '../ease.js';

const SLOT_MS = 3000;
const BURST_MS = 180;
const STEP_MS = 60;
const START_SPAN_MS = 1400;
const JITTER_PX = 2;
const HASH_A = 2654435761;
const HASH_B = 40503;
const HASH_RANGE = 1024;
const SALT_X = 1;
const SALT_Y = 4;
const SPAN = 2;
const POP_MS = 260;
const POP_BACK = 1.9;
const PULSE_MS = 2400;
const TAU = Math.PI * 2;
const HALF = 0.5;

function hashOf(first,second) {
return ((Math.imul(first + 1,HASH_A) ^ Math.imul(second + 1,HASH_B)) >>> 0) % HASH_RANGE / HASH_RANGE;
}
function glitchAt(now) {
const slot = Math.floor(now / SLOT_MS);
const into = now - slot * SLOT_MS - hashOf(slot,0) * START_SPAN_MS;
if (into < 0 || into >= BURST_MS) return { x:0,y:0 };
const step = Math.floor(into / STEP_MS);
return { x:Math.round((hashOf(slot,step + SALT_X) - HALF) * SPAN * JITTER_PX),y:Math.round((hashOf(slot,step + SALT_Y) - HALF) * SPAN * JITTER_PX) };
}
function popScale(age) {
const rest = clamp01(age / POP_MS) - 1;
return 1 + (POP_BACK + 1) * rest * rest * rest + POP_BACK * rest * rest;
}
function fillPulse(now) {
return (Math.sin(now / PULSE_MS * TAU) + 1) * HALF;
}

export { fillPulse,glitchAt,popScale };
