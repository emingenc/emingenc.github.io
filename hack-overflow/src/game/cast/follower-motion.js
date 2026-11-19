import { TRAIL_MS } from './patch.js';
import { clamp01,lerp } from '../ease.js';
import { stepPose } from '../tween.js';

const EMERGE_FROM = 0.2;
const EMERGE_TO = 0.8;
const EMERGE_ALPHA = 0.2;
const EMERGE_SCALE = 0.6;
const SMOOTH_A = 3;
const SMOOTH_B = 2;
const ARRIVE_MS = 200;
const DRAG_EASE = 2;
const FADE_FROM = 0.7;
const PUFF_GAP_MS = 70;
const PUFF_LIFE_MS = 420;
const PUFF_BACK = 0.5;
const PUFF_UP = 1.5;
const PUFF_GRAVITY = 4;
const PUFF_SIZE = 0.16;
const PUFF_GROW = 0.6;
const MS_PER_S = 1000;
const HALF = 0.5;

function glideCell(trail,clock) {
const tween = { from:trail.from,to:trail,start:trail.at,glideMs:clock.still ? 0 :TRAIL_MS,curve:trail.curve || 'ease',stride:trail.stride || 0 };
const pose = stepPose(tween,clock.now);
return { col:pose.col,row:pose.row };
}
function emergeAt(apart) {
if (apart < EMERGE_FROM) return { alpha:0,scaleY:EMERGE_SCALE };
const raw = clamp01((apart - EMERGE_FROM) / (EMERGE_TO - EMERGE_FROM));
const step = raw * raw * (SMOOTH_A - SMOOTH_B * raw);
return { alpha:lerp(EMERGE_ALPHA,1,step),scaleY:lerp(EMERGE_SCALE,1,step) };
}
function arriveAlpha(age) {
return clamp01(age / ARRIVE_MS);
}
function dragAlong(age,ms) {
return ms > 0 ? Math.pow(clamp01(age / ms),DRAG_EASE) :1;
}
function dragAlpha(age,ms) {
const time = ms > 0 ? clamp01(age / ms) :1;
return 1 - clamp01((time - FADE_FROM) / (1 - FADE_FROM));
}
function dustPuff(index,age) {
const emitAge = index * PUFF_GAP_MS;
const life = age - emitAge;
if (life < 0 || life >= PUFF_LIFE_MS) return null;
const sec = life / MS_PER_S;
const progress = life / PUFF_LIFE_MS;
return {
emitAge,back:PUFF_BACK * sec,up:Math.max(0,PUFF_UP * sec - HALF * PUFF_GRAVITY * sec * sec),
alpha:(1 - progress) * (1 - progress),size:PUFF_SIZE * (1 + PUFF_GROW * progress),
};
}

export { PUFF_GAP_MS,PUFF_LIFE_MS,arriveAlpha,dragAlong,dragAlpha,dustPuff,emergeAt,glideCell };
