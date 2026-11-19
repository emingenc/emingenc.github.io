import { aimBreath,lockLook } from '../game/power-feel.js';
import { uiSpotOf } from './grid-spot.js';

const WASH_ALPHA = 0.2;
const ARM_TILES = 0.32;
const BAR_TILES = 0.09;
const INKS = { TAG:'cyan',BOLT:'amber' };

const uiLock = { key:'',at:0 };

function uiArm(frame) {
return frame.tile * (ARM_TILES + aimBreath(frame.now,frame.reducedMotion));
}
function uiPushOut(frame,lock) {
return frame.tile * ARM_TILES * (lock.arm - 1);
}
function uiLockOf(frame,mark) {
const key = mark.col + ',' + mark.row + ',' + mark.verb;
if (key !== uiLock.key) Object.assign(uiLock,{ key,at:frame.now });
return frame.reducedMotion ? { arm:1,wash:1 } :lockLook(frame.now - uiLock.at);
}
function uiDrawBrackets(ctx,frame,spot) {
const arm = uiArm(frame);
const bar = frame.tile * BAR_TILES;
const out = uiPushOut(frame,spot.lock);
const left = spot.left - out;
const top = spot.top - out;
const right = spot.left + frame.tile + out;
const bottom = spot.top + frame.tile + out;
ctx.fillRect(left,top,arm,bar);
ctx.fillRect(left,top,bar,arm);
ctx.fillRect(right - arm,top,arm,bar);
ctx.fillRect(right - bar,top,bar,arm);
ctx.fillRect(left,bottom - bar,arm,bar);
ctx.fillRect(left,bottom - arm,bar,arm);
ctx.fillRect(right - arm,bottom - bar,arm,bar);
ctx.fillRect(right - bar,bottom - arm,bar,arm);
}
function uiPaintAimMark(ctx,frame,mark) {
const spot = uiSpotOf(mark,frame);
if (!spot) return;
const lock = uiLockOf(frame,mark);
ctx.fillStyle = frame.palette[INKS[mark.verb] || INKS.TAG];
ctx.globalAlpha = WASH_ALPHA * lock.wash;
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
ctx.globalAlpha = 1;
uiDrawBrackets(ctx,frame,{ ...spot,lock });
}

function uiAimLost() {
uiLock.key = '';
}

export { uiPaintAimMark,uiAimLost };
