import { clamp01, lerp, easeOutCubic, easeInOutQuad } from './ease.js';

const HURT = { ms:330,flashMs:70,tintMs:190,tintAlpha:0.6,blinkFromMs:130,blinkStepMs:50,blinkAlpha:0.45,faceMs:220 };
const SQUASH = { px:1.8,peakMs:60,ms:200,reboundTurns:1.5 };
const PUSH = { slideMs:90,settleMs:110,overshoot:0.12 };
const DOWN = { ms:300,flashMs:70,fadeFromMs:110,redAlpha:0.7,sinkPx:6,squashPx:5 };
const RISE = { atMs:480,ms:280,risePx:4,flash:0.7 };
const FACINGS = { left:'left',right:'right',up:'up',down:'down' };

function hurtTint(age) {
if (age < HURT.flashMs || age >= HURT.tintMs) return 0;
return HURT.tintAlpha * (1 - (age - HURT.flashMs) / (HURT.tintMs - HURT.flashMs));
}
function hurtAlpha(age) {
if (age < HURT.blinkFromMs) return 1;
return Math.floor((age - HURT.blinkFromMs) / HURT.blinkStepMs) % 2 === 0 ? HURT.blinkAlpha :1;
}
function hurtSquash(age) {
if (age < SQUASH.peakMs) return SQUASH.px * age / SQUASH.peakMs;
const progress = clamp01((age - SQUASH.peakMs) / (SQUASH.ms - SQUASH.peakMs));
return SQUASH.px * (1 - progress) * Math.cos(SQUASH.reboundTurns * Math.PI * progress);
}
function hurtLook(age) {
if (age < 0 || age >= HURT.ms) return null;
return { flash:age < HURT.flashMs ? 1 :0,tint:hurtTint(age),alpha:hurtAlpha(age),squash:hurtSquash(age) };
}
function pushAt(age) {
if (age < 0) return 1;
if (age < PUSH.slideMs) return lerp(1,-PUSH.overshoot,easeOutCubic(age / PUSH.slideMs));
return -PUSH.overshoot * (1 - easeInOutQuad(clamp01((age - PUSH.slideMs) / PUSH.settleMs)));
}
function facingToward(from,target) {
const across = target.col - from.col;
const down = target.row - from.row;
if (Math.abs(across) >= Math.abs(down)) return across < 0 ? FACINGS.left :FACINGS.right;
return down < 0 ? FACINGS.up :FACINGS.down;
}
function downLook(age) {
if (age < 0 || age >= DOWN.ms) return null;
const fall = easeOutCubic(clamp01((age - DOWN.fadeFromMs) / (DOWN.ms - DOWN.fadeFromMs)));
return {
flash:age < DOWN.flashMs ? 1 :0,tint:age < DOWN.flashMs ? 0 :DOWN.redAlpha,
alpha:1 - fall * fall,sink:DOWN.sinkPx * fall,squash:DOWN.squashPx * fall,
};
}
function riseLook(age) {
const progress = clamp01((age - RISE.atMs) / RISE.ms);
if (age < RISE.atMs || progress >= 1) return null;
const eased = easeOutCubic(progress);
return { alpha:eased,rise:RISE.risePx * (1 - eased),flash:RISE.flash * (1 - progress) * (1 - progress) };
}

export { HURT,PUSH,DOWN,RISE,hurtLook,pushAt,facingToward,downLook,riseLook };
