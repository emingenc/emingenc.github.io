import { clamp01,easeInOutQuad,easeOutCubic,lerp } from './ease.js';


const FULL_TURN = 2 * Math.PI;
const BACK_OVERSHOOT = 1.4;
const BACK_CUBIC = 3;
const NEVER = -Infinity;
const CHARGE_FEEL = { showMs:90,solidMs:80,popMs:260,releaseMs:150,farGap:0.75,nearGap:0.06,throwGap:0.5,popFrom:0.6,popTo:1.6,minAlpha:0.3 };
const AIM_FEEL = { lockMs:120,lockScale:1.6,breathMs:1200,breathDepth:0.08 };
const PRESS_FEEL = { flashMs:80,shakeMs:200,shakeCycles:2,shakeTiles:0.07 };
const DROP_FEEL = { dropMs:100,dropTiles:0.3 };

function easeOutBack(progress) {
const shifted = progress - 1;
return 1 + (BACK_OVERSHOOT + 1) * Math.pow(shifted,BACK_CUBIC) + BACK_OVERSHOOT * shifted * shifted;
}
function chargeLook(heldMs,chargeMs) {
const full = heldMs >= chargeMs;
return {
visible:heldMs >= CHARGE_FEEL.showMs,progress:clamp01((heldMs - CHARGE_FEEL.showMs) / (chargeMs - CHARGE_FEEL.showMs)),
full,sinceFull:full ? heldMs - chargeMs :0,
};
}
function chargeGap(progress) {
return lerp(CHARGE_FEEL.farGap,CHARGE_FEEL.nearGap,easeInOutQuad(progress));
}
function chargeAlpha(progress) {
return lerp(CHARGE_FEEL.minAlpha,1,progress);
}
function chargePop(sinceFull) {
const progress = sinceFull / CHARGE_FEEL.popMs;
if (progress >= 1) return null;
return { size:lerp(CHARGE_FEEL.popFrom,CHARGE_FEEL.popTo,easeOutCubic(progress)),alpha:1 - progress };
}
function chargeSolid(sinceFull) {
return sinceFull < CHARGE_FEEL.solidMs;
}
function releaseLook(sinceRelease) {
const progress = sinceRelease / CHARGE_FEEL.releaseMs;
if (progress >= 1 || progress < 0) return null;
return { gap:CHARGE_FEEL.nearGap + CHARGE_FEEL.throwGap * easeOutCubic(progress),alpha:1 - progress };
}
function lockLook(age) {
const progress = clamp01(age / AIM_FEEL.lockMs);
return { arm:lerp(AIM_FEEL.lockScale,1,easeOutCubic(progress)),wash:progress };
}
function aimBreath(now,reduced) {
return reduced ? 0 :Math.sin(now / AIM_FEEL.breathMs * FULL_TURN) * AIM_FEEL.breathDepth;
}
function pressLook(age,wrong) {
const flash = clamp01(1 - age / PRESS_FEEL.flashMs);
const rest = clamp01(1 - age / PRESS_FEEL.shakeMs);
const shake = wrong ? Math.sin(age / PRESS_FEEL.shakeMs * PRESS_FEEL.shakeCycles * FULL_TURN) * PRESS_FEEL.shakeTiles * rest :0;
return { flash,shake };
}
const MOVE_SIDE = { left:'l',right:'r','wrong-left':'l','wrong-right':'r' };
function pressTargets(kind,state) {
if (kind === 'win' || kind === 'early-fire') return [state.l,state.r].map((index) => ({ index,wrong:kind === 'early-fire' }));
const side = MOVE_SIDE[kind];
return side ? [{ index:state[side],wrong:kind.startsWith('wrong') }] :[];
}
function dropLook(age) {
const progress = clamp01(age / DROP_FEEL.dropMs);
return { lift:DROP_FEEL.dropTiles * (1 - easeOutCubic(progress)),alpha:progress };
}
function createTrack(ms,ease = easeOutCubic) {
return { ms,ease,map:new Map() };
}
function trackProgress(track,entry,now) {
return clamp01((now - entry.at) / track.ms);
}
function trackValue(track,key,now) {
const entry = track.map.get(key);
if (!entry) return 0;
return lerp(entry.from,entry.to,track.ease(trackProgress(track,entry,now)));
}
function trackSeen(track,key,seen) {
const entry = track.map.get(key);
if (!entry) {
track.map.set(key,{ from:seen.value,to:seen.value,at:NEVER });
return;
}
if (entry.to === seen.value) return;
const from = typeof seen.value === 'number' ? trackValue(track,key,seen.now) :seen.value;
track.map.set(key,{ from,to:seen.value,at:seen.now });
}
function trackAge(track,key,now) {
const entry = track.map.get(key);
return entry ? now - entry.at :Infinity;
}
function trackMoving(track,key,now) {
return trackAge(track,key,now) < track.ms;
}

export {
CHARGE_FEEL,AIM_FEEL,PRESS_FEEL,DROP_FEEL,
easeOutBack,pressTargets,chargeLook,chargeGap,chargeAlpha,chargePop,chargeSolid,releaseLook,lockLook,aimBreath,pressLook,dropLook,
createTrack,trackValue,trackSeen,trackAge,trackMoving,
};
