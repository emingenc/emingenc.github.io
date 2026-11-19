import { levelBand } from './progress.js';
import { clamp01, countUpValue, easeOutCubic } from './ease.js';


const LEVEL_COUNT_DELAY_MS = 260;
const LEVEL_STEP_MS = 120;
const CACHE_VANISH_MS = 260;
const CACHE_FLASH_MS = 60;
const CACHE_LIFT_TILES = 0.4;
const XP_TWEEN_MS = 500;
const XP_HOLD_MS = 120;
const XP_CLIMB_SHARE = 0.6;
const SWEEP_FLASH_MS = 120;
const SWEEP_SETTLE_MS = 300;
const SWEEP_KICK = 0.14;
const SWEEP_JITTER_PX = 2;
const SWEEP_JITTER_CYCLES = 3;
const RECALL_STAGGER_MS = 60;
const WARN_SHARE = 0.25;
const WARN_BLINK_MS = 90;
const WARN_SHAKE_PX = 1;
const TAG_POP_MS = 220;
const TAG_POP_PEAK = 0.25;
const FLICKER_PERIOD_MS = 160;
const FLICKER_RADIANS = Math.PI * 2;
const HALF = 0.5;

function levelShownAt(range,elapsedMs) {
const span = range.after - range.before;
const since = elapsedMs - LEVEL_COUNT_DELAY_MS;
if (span <= 0 || since < 0) return range.before;
return range.before + Math.min(span,1 + Math.floor(since / LEVEL_STEP_MS));
}
function levelLandMs(range) {
return LEVEL_COUNT_DELAY_MS + LEVEL_STEP_MS * Math.max(0,range.after - range.before - 1);
}
function elapsedFromVar(text) {
const value = parseFloat(text);
return Number.isFinite(value) ? Math.max(0,-value) :0;
}
function cacheVanishLook(elapsedMs) {
if (elapsedMs < 0 || elapsedMs >= CACHE_VANISH_MS) return null;
const progress = elapsedMs / CACHE_VANISH_MS;
return { alpha:1 - progress * progress,lift:CACHE_LIFT_TILES * easeOutCubic(progress),flash:elapsedMs < CACHE_FLASH_MS ? 1 :0 };
}
function climbOf(from,edge,elapsedMs) {
const climbMs = XP_TWEEN_MS * XP_CLIMB_SHARE;
return { xp:countUpValue(from,edge,elapsedMs / climbMs),band:levelBand(from),done:false };
}
function wrapOf(range,elapsedMs) {
const floor = levelBand(range.to).floor;
const climbMs = XP_TWEEN_MS * XP_CLIMB_SHARE;
const wrapMs = XP_TWEEN_MS - climbMs;
const progress = (elapsedMs - climbMs - XP_HOLD_MS) / wrapMs;
return { xp:countUpValue(floor,range.to,progress),band:levelBand(range.to),done:progress >= 1 };
}
function xpBarAt(range,elapsedMs) {
const oldBand = levelBand(range.from);
if (oldBand.next === null || range.to < oldBand.next) {
return { xp:countUpValue(range.from,range.to,elapsedMs / XP_TWEEN_MS),band:oldBand,done:elapsedMs >= XP_TWEEN_MS };
}
const climbMs = XP_TWEEN_MS * XP_CLIMB_SHARE;
if (elapsedMs < climbMs) return climbOf(range.from,oldBand.next,elapsedMs);
if (elapsedMs < climbMs + XP_HOLD_MS) return { xp:oldBand.next,band:oldBand,done:false };
return wrapOf(range,elapsedMs);
}
function sweepLook(elapsedMs) {
if (elapsedMs < 0 || elapsedMs >= SWEEP_FLASH_MS + SWEEP_SETTLE_MS) return null;
if (elapsedMs < SWEEP_FLASH_MS) {
const shake = Math.sin(elapsedMs / SWEEP_FLASH_MS * SWEEP_JITTER_CYCLES * FLICKER_RADIANS);
return { flash:1 - elapsedMs / SWEEP_FLASH_MS * HALF,scale:1,jitter:shake * SWEEP_JITTER_PX };
}
const settle = clamp01((elapsedMs - SWEEP_FLASH_MS) / SWEEP_SETTLE_MS);
return { flash:0,scale:1 + SWEEP_KICK * (1 - easeOutCubic(settle)),jitter:0 };
}
function blockDelayMs(change) {
return change.to === 'ref' ? change.at * RECALL_STAGGER_MS :0;
}
function sweepWarning(share,nowMs) {
if (share >= WARN_SHARE || share <= 0) return { blink:1,shake:0 };
const odd = Math.floor(nowMs / WARN_BLINK_MS) % 2 === 1;
return { blink:odd ? HALF :1,shake:odd ? WARN_SHAKE_PX :-WARN_SHAKE_PX };
}
function tagPopScale(elapsedMs) {
if (elapsedMs < 0 || elapsedMs >= TAG_POP_MS) return 1;
return 1 + TAG_POP_PEAK * Math.sin(elapsedMs / TAG_POP_MS * Math.PI);
}
function flickerAlpha(range,nowMs) {
const wave = (Math.sin(nowMs / FLICKER_PERIOD_MS * FLICKER_RADIANS) + 1) * HALF;
return range.low + (range.high - range.low) * wave;
}

export { LEVEL_COUNT_DELAY_MS,TAG_POP_MS,levelShownAt,levelLandMs,elapsedFromVar,cacheVanishLook,xpBarAt,sweepLook,blockDelayMs,sweepWarning,tagPopScale,flickerAlpha };
