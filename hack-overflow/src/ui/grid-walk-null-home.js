import { fillPulse,glitchAt,popScale } from '../game/cast/glitch.js';
import { HOME,homeBump,homeProps } from '../game/walk/null-home.js';
import { uiHooksOnce } from './grid-power.js';
import { uiPropGuard,uiQuestLive,uiQuestPaint } from './grid-quest-kit.js';
import { uiShowToast } from './grid-toast.js';
import { uiSpotOf } from './grid-spot.js';

const HALF = 0.5;
const BOX_INSET = 0.18;
const BOX_BORDER = 2;
const LABEL_TILES = 0.28;
const FONT = 'px VT323, monospace';
const FILL_ALPHA = 0.06;
const FILL_SWING = 0.1;
const SPLIT_INK = 'cyan';
const SPLIT_ALPHA = 0.8;
const CHAR_SPLIT_PX = 2;
const UI_STAY = { since:null };

function uiProps(app) {
return homeProps(app.game.ext);
}
function uiFill(ctx,box) {
ctx.fillStyle = box.colour;
ctx.fillRect(box.left,box.top,box.size,box.size);
}
function uiLabel(ctx,frame,spec) {
ctx.font = Math.round(frame.tile * LABEL_TILES) + FONT;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
if (spec.glitch.x !== 0 || spec.glitch.y !== 0) {
ctx.fillStyle = frame.palette[SPLIT_INK];
ctx.globalAlpha = SPLIT_ALPHA;
ctx.fillText('NULL',spec.x - spec.glitch.x * CHAR_SPLIT_PX,spec.y - spec.glitch.y);
ctx.globalAlpha = 1;
}
ctx.fillStyle = frame.palette.magenta;
ctx.fillText('NULL',spec.x + spec.glitch.x,spec.y + spec.glitch.y);
}
function uiBox(ctx,frame,spot) {
const glitch = frame.reducedMotion ? { x:0,y:0 } :glitchAt(frame.now);
const inset = frame.tile * BOX_INSET;
const size = frame.tile - inset * 2;
const left = spot.left + inset + glitch.x;
const top = spot.top + inset + glitch.y;
uiFill(ctx,{ left,top,size,colour:frame.palette.magenta });
uiFill(ctx,{ left:left + BOX_BORDER,top:top + BOX_BORDER,size:size - BOX_BORDER * 2,colour:frame.palette.bg });
if (!frame.reducedMotion) uiPulse(ctx,frame,{ left:left + BOX_BORDER,top:top + BOX_BORDER,size:size - BOX_BORDER * 2 });
uiLabel(ctx,frame,{ x:spot.left + frame.tile * HALF,y:spot.top + frame.tile * HALF,glitch });
}
function uiPulse(ctx,frame,box) {
ctx.globalAlpha = FILL_ALPHA + FILL_SWING * fillPulse(frame.now);
uiFill(ctx,{ ...box,colour:frame.palette.magenta });
ctx.globalAlpha = 1;
}
function uiPopIn(ctx,frame,spot) {
if (UI_STAY.since === null) UI_STAY.since = frame.now;
const scale = frame.reducedMotion ? 1 :popScale(frame.now - UI_STAY.since);
const pivotX = spot.left + frame.tile * HALF;
const pivotY = spot.top + frame.tile * HALF;
ctx.translate(pivotX,pivotY);
ctx.scale(scale,scale);
ctx.translate(-pivotX,-pivotY);
}
function uiPaintHome(ctx,app,frame) {
if (!uiProps(app).length) { UI_STAY.since = null; return; }
const spot = uiSpotOf(HOME,frame);
if (!spot) return;
ctx.save();
uiPopIn(ctx,frame,spot);
uiBox(ctx,frame,spot);
ctx.restore();
}
function uiOnBump(info) {
const app = info.app;
if (!uiQuestLive(app)) return;
const line = homeBump(app.game.ext,info.event && info.event.prop);
if (line) uiShowToast(app,{ text:line,kind:'info' });
}
const uiHook = uiHooksOnce({ bump:uiOnBump });
function uiInstallNullHome(app) {
uiPropGuard(app,uiProps);
uiQuestPaint(app,uiPaintHome);
uiHook();
}

export { uiInstallNullHome };
