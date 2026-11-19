import { CHARGE_FEEL,chargeAlpha,chargeGap,chargeLook,chargePop,chargeSolid,releaseLook } from '../game/power-feel.js';
import { uiGridPainter } from './grid-draw-fx.js';

const ARM_TILES = 0.28;
const BAR_TILES = 0.07;
const MIN_BAR_PX = 2;
const HALF = 0.5;
const CHARGE_INK = 'amber';
const FULL_INK = 'bright';
const NEVER = -Infinity;

const uiCharge = { downAt:null,chargeMs:0,releasedAt:NEVER };

function uiHeroBox(frame,gap) {
const reach = frame.tile * gap;
return {
left:Math.round((frame.avatar.col - frame.camera.col) * frame.tile - reach),top:Math.round((frame.avatar.row - frame.camera.row) * frame.tile - reach),
side:Math.round(frame.tile + reach * 2),
};
}
function uiBarPx(frame) {
return Math.max(Math.round(frame.tile * BAR_TILES),MIN_BAR_PX);
}
function uiDrawCorners(ctx,frame,box) {
const arm = Math.round(frame.tile * ARM_TILES);
const bar = uiBarPx(frame);
const right = box.left + box.side;
const bottom = box.top + box.side;
ctx.fillRect(box.left,box.top,arm,bar);
ctx.fillRect(box.left,box.top,bar,arm);
ctx.fillRect(right - arm,box.top,arm,bar);
ctx.fillRect(right - bar,box.top,bar,arm);
ctx.fillRect(box.left,bottom - bar,arm,bar);
ctx.fillRect(box.left,bottom - arm,bar,arm);
ctx.fillRect(right - arm,bottom - bar,arm,bar);
ctx.fillRect(right - bar,bottom - arm,bar,arm);
}
function uiDrawSolid(ctx,frame,box) {
const bar = uiBarPx(frame);
ctx.fillRect(box.left,box.top,box.side,bar);
ctx.fillRect(box.left,box.top + box.side - bar,box.side,bar);
ctx.fillRect(box.left,box.top,bar,box.side);
ctx.fillRect(box.left + box.side - bar,box.top,bar,box.side);
}
function uiDrawPop(ctx,frame,pop) {
const side = Math.round(frame.tile * pop.size);
const centre = { x:(frame.avatar.col - frame.camera.col + HALF) * frame.tile,y:(frame.avatar.row - frame.camera.row + HALF) * frame.tile };
ctx.globalAlpha = pop.alpha;
ctx.fillStyle = frame.palette[FULL_INK];
uiDrawSolid(ctx,frame,{ left:Math.round(centre.x - side / 2),top:Math.round(centre.y - side / 2),side });
}
function uiDrawFull(ctx,frame,look) {
ctx.fillStyle = frame.palette[FULL_INK];
if (frame.reducedMotion || chargeSolid(look.sinceFull)) uiDrawSolid(ctx,frame,uiHeroBox(frame,chargeGap(1)));
else uiDrawCorners(ctx,frame,uiHeroBox(frame,chargeGap(1)));
const pop = frame.reducedMotion ? null :chargePop(look.sinceFull);
if (pop) uiDrawPop(ctx,frame,pop);
}
function uiDrawFilling(ctx,frame,look) {
ctx.fillStyle = frame.palette[CHARGE_INK];
ctx.globalAlpha = chargeAlpha(look.progress);
uiDrawCorners(ctx,frame,uiHeroBox(frame,chargeGap(look.progress)));
}
function uiDrawHeld(ctx,frame,look) {
if (!look.visible) return;
if (look.full) uiDrawFull(ctx,frame,look);
else if (!frame.reducedMotion) uiDrawFilling(ctx,frame,look);
}
function uiDrawThrown(ctx,frame,sinceRelease) {
const look = releaseLook(sinceRelease);
if (!look) return;
ctx.fillStyle = frame.palette[FULL_INK];
ctx.globalAlpha = look.alpha;
uiDrawCorners(ctx,frame,uiHeroBox(frame,look.gap));
}
function uiIdle(frame) {
return uiCharge.downAt === null && (frame.reducedMotion || frame.now - uiCharge.releasedAt >= CHARGE_FEEL.releaseMs);
}
function uiDrawCharge(frame) {
if (uiIdle(frame)) return;
const ctx = frame.ctx;
ctx.save();
if (uiCharge.downAt === null) uiDrawThrown(ctx,frame,frame.now - uiCharge.releasedAt);
else uiDrawHeld(ctx,frame,chargeLook(frame.now - uiCharge.downAt,uiCharge.chargeMs));
ctx.restore();
}
function uiChargeStart(downAt,chargeMs) {
uiGridPainter(uiDrawCharge);
Object.assign(uiCharge,{ downAt,chargeMs });
}
function uiChargeRelease(now) {
if (uiCharge.downAt !== null && chargeLook(now - uiCharge.downAt,uiCharge.chargeMs).visible) uiCharge.releasedAt = now;
uiCharge.downAt = null;
}
function uiChargeCancel() {
uiCharge.downAt = null;
}

export { uiChargeStart,uiChargeRelease,uiChargeCancel };
