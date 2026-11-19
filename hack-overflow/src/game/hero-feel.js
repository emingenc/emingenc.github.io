import { clamp01 } from './ease.js';
import { WALK_FEEL } from './tween.js';


const SPRITE_PX = 16;
const HALF = 0.5;
const FULL_TURN = 2 * Math.PI;
const CYCLE = { footEnd:0.3,passEnd:0.7,bobPx:2 };
const LEAN = { px:1,settleMs:70 };
const LAUNCH = { squashPx:1 };
const LAND = { ms:120,squashPx:1.2,reboundTurns:1.5 };
const TURN = { ms:50,shiftPx:1 };
const BUMP = { squashPx:1.6 };
const BREATH = { periodMs:1600,liftPx:0.34,stretchPx:0.4,settleMs:220 };
const BLINK = { periodMs:4300,lidMs:120,offsetMs:900,calmMin:0.95 };
const MAX_FRAME_MS = 100;
const NEVER = -Infinity;
const HERO_STANDING = Object.freeze({ frame:0,bob:0 });
const FACING_SIGN = { left:-1,right:1 };
const SIDE_BUMP = { left:true,right:true };

function heroCycle(phase) {
if (phase <= 0) return HERO_STANDING;
const whole = Math.floor(phase);
const within = phase - whole;
return { frame:cycleFrame(whole % 2,within),bob:CYCLE.bobPx * Math.sin(Math.PI * within) };
}
function cycleFrame(stride,within) {
if (within < CYCLE.footEnd) return 1 + stride;
if (within < CYCLE.passEnd) return 0;
return 2 - stride;
}
function settleToward(value,target,timing) {
return target + (value - target) * Math.exp(-Math.max(0,timing.dtMs) / timing.settleMs);
}
function heroLaunch(progress) {
if (progress <= 0 || progress >= 1) return 0;
return LAUNCH.squashPx * (1 - progress) * Math.sin(FULL_TURN * progress);
}
function heroLanding(sinceMs) {
if (sinceMs < 0 || sinceMs >= LAND.ms) return 0;
const progress = sinceMs / LAND.ms;
return LAND.squashPx * (1 - progress) * Math.cos(LAND.reboundTurns * Math.PI * progress);
}
function heroTurnShift(facing,sinceMs) {
if (sinceMs < 0 || sinceMs >= TURN.ms) return 0;
return (FACING_SIGN[facing] || 0) * TURN.shiftPx * (1 - sinceMs / TURN.ms);
}
function breathWave(now) {
return (1 - Math.cos(FULL_TURN * now / BREATH.periodMs)) * HALF;
}
function heroBlinking(now) {
return (now + BLINK.offsetMs) % BLINK.periodMs < BLINK.lidMs;
}
function squashScale(px,axis) {
const give = px / SPRITE_PX;
return axis === 'x' ? { x:1 - give,y:1 + give * HALF } :{ x:1 + give * HALF,y:1 - give };
}
function createHeroTrack() {
return { at:NEVER,facing:null,moving:false,restAt:NEVER,landAt:NEVER,turnAt:NEVER,lean:0,calm:0 };
}
function leanTarget(sample) {
if (!sample.moving) return 0;
return (FACING_SIGN[sample.facing] || 0) * LEAN.px;
}
function noteTransitions(track,sample) {
if (sample.moving && !track.moving) track.restAt = sample.now;
if (!sample.moving && track.moving) track.landAt = sample.now;
if (sample.facing !== track.facing) track.turnAt = sample.now;
}
function trackHero(track,sample) {
const first = track.facing === null;
const timing = { dtMs:first ? 0 :Math.min(sample.now - track.at,MAX_FRAME_MS),settleMs:LEAN.settleMs };
if (!first) noteTransitions(track,sample);
track.lean = settleToward(track.lean,leanTarget(sample),timing);
track.calm = settleToward(track.calm,sample.moving || sample.nudge ? 0 :1,{ ...timing,settleMs:BREATH.settleMs });
track.moving = sample.moving;
track.facing = sample.facing;
track.at = sample.now;
return track;
}
function multiplied(one,other) {
return { x:one.x * other.x,y:one.y * other.y };
}
function heightSquash(track,sample) {
const rest = clamp01((sample.now - track.restAt) / WALK_FEEL.stepMs);
const crouch = track.moving ? heroLaunch(rest) :0;
const breath = BREATH.stretchPx * breathWave(sample.now) * track.calm;
return crouch + heroLanding(sample.now - track.landAt) - breath;
}
function bumpScale(nudge) {
if (!nudge) return squashScale(0,'y');
return squashScale(BUMP.squashPx * nudge.push,SIDE_BUMP[nudge.dir] ? 'x' :'y');
}
function heroBody(track,sample) {
const turnShift = heroTurnShift(sample.facing,sample.now - track.turnAt);
const cycle = turnShift === 0 ? heroCycle(sample.phase) :HERO_STANDING;
const wave = breathWave(sample.now) * track.calm;
return {
frame:cycle.frame,bob:cycle.bob + BREATH.liftPx * wave,lean:track.lean,shift:turnShift,
scale:multiplied(squashScale(heightSquash(track,sample),'y'),bumpScale(sample.nudge)),
blink:track.calm > BLINK.calmMin && heroBlinking(sample.now),
};
}

export { heroCycle,settleToward,heroLaunch,heroLanding,heroTurnShift,heroBlinking,squashScale,createHeroTrack,trackHero,heroBody };
