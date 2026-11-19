import { UI_SHAKES,uiShakeOffsets } from './fx.js';

const FIRST_SEED = 1;

let uiKnock = null;
let uiKnockSeed = FIRST_SEED;

function uiBeatAt(offsets,progress) {
const spans = offsets.length - 1;
const place = Math.min(Math.max(progress,0),1) * spans;
const index = Math.min(Math.floor(place),spans - 1);
const share = place - index;
const from = offsets[index];
const to = offsets[index + 1];
return { across:Math.round(from.across + (to.across - from.across) * share),down:Math.round(from.down + (to.down - from.down) * share) };
}
function uiLeft(knock,now) {
return knock.px * Math.max(1 - (now - knock.atMs) / knock.ms,0);
}
function uiKickStage(kind,atMs) {
const shake = UI_SHAKES[kind];
if (uiKnock && uiLeft(uiKnock,atMs) > shake.px) return;
uiKnockSeed += 1;
uiKnock = { px:shake.px,ms:shake.ms,atMs,offsets:uiShakeOffsets(shake,uiKnockSeed) };
}
function uiKnockAt(now) {
if (!uiKnock || now < uiKnock.atMs) return null;
const age = now - uiKnock.atMs;
if (age >= uiKnock.ms) uiKnock = null;
return uiKnock ? uiBeatAt(uiKnock.offsets,age / uiKnock.ms) :null;
}
function uiStageShake(canvas,frame) {
if (!canvas || !canvas.style) return;
const offset = frame.reducedMotion ? null :uiKnockAt(frame.now);
if (offset) canvas.style.setProperty('transform','translate(' + offset.across + 'px,' + offset.down + 'px)');
else if (canvas.style.transform) canvas.style.removeProperty('transform');
}
function uiStageShakeClear() {
uiKnock = null;
}

export { uiBeatAt,uiKickStage,uiStageShake,uiStageShakeClear };
