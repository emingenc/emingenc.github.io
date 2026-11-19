import { clamp01, easeOutCubic } from './ease.js';

const BEAT = { dipFromMs:300,fullAtMs:440,snapAtMs:460,clearFromMs:480,clearToMs:740,cardAtMs:640,holdMarginMs:120 };
const WASH = { alpha:0.2,ms:200 };
const CARD = { slideMs:240,slidePx:12,lineGapMs:90,lineMs:150,outMs:280 };

function blackAt(age) {
if (age < BEAT.dipFromMs || age >= BEAT.clearToMs) return 0;
if (age < BEAT.fullAtMs) return clamp01((age - BEAT.dipFromMs) / (BEAT.fullAtMs - BEAT.dipFromMs)) ** 2;
if (age < BEAT.clearFromMs) return 1;
return (1 - clamp01((age - BEAT.clearFromMs) / (BEAT.clearToMs - BEAT.clearFromMs))) ** 2;
}
function washAt(age) {
return age < 0 || age >= WASH.ms ? 0 :WASH.alpha * (1 - age / WASH.ms);
}
function oldViewAt(age) {
return age < BEAT.snapAtMs;
}
function cardBox(age,lifeMs) {
const slide = easeOutCubic(clamp01(age / CARD.slideMs));
const out = clamp01((age - (lifeMs - CARD.outMs)) / CARD.outMs);
return { alpha:slide * (1 - out * out),dy:-CARD.slidePx * (1 - slide) };
}
function cardLine(age,index) {
return easeOutCubic(clamp01((age - index * CARD.lineGapMs) / CARD.lineMs));
}

export { BEAT,CARD,blackAt,washAt,oldViewAt,cardBox,cardLine };
