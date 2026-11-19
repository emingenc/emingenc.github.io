import { hurtLook, pushAt, facingToward, downLook, riseLook, HURT, DOWN, RISE } from '../game/hero-hurt.js';
import { BEAT } from '../game/reboot-beat.js';
import { squashScale } from '../game/hero-feel.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiArtCanvas, uiArtRevision } from './art-hook.js';
import { uiPaintAvatar, UI_AVATAR_PX } from './avatar-sprite.js';
import { uiSetAvatarPaint } from './grid-draw-avatar.js';
import { uiGridBurst, uiGridPainter } from './grid-draw-fx.js';

const STILL_TINT = 0.45;
const SPARKS = { kind:'spark',count:8,colors:['red','bright'] };
const DOWN_SPARKS = { kind:'spark',count:14,colors:['red','bright'] };
const WAKE_RING = { kind:'pop',colors:['cyan'] };
const CELL_CENTRE = 0.5;
const HALF = 0.5;
const FEET = 0.92;
const HERO_BODY_HEIGHT = 0.8;
const SILHOUETTE_CAP = 48;
const PLAIN = { alpha:1,flash:0,tint:0,squash:0,axis:'y',sink:0,dx:0,dy:0,facing:null };

const uiHit = { at:-Infinity,push:null };
const uiSilhouettes = new Map();
const uiStash = { now:-1,frame:null,place:null,look:null,spec:null };
let uiDown = null;
let uiSeed = 0;

function uiSnap(frame,value) {
return Math.round(value * frame.dpr) / frame.dpr;
}
function uiBurstAt(cell,emission) {
uiSeed += 1;
uiGridBurst({ seed:uiSeed,origin:{ col:cell.col + CELL_CENTRE,row:cell.row + CELL_CENTRE },...emission });
}
function uiHeroHit(hit) {
uiHit.at = hit.now;
uiHit.push = null;
uiSetAvatarPaint(uiHeroPaint);
uiBurstAt(hit.cell,{ ...SPARKS,atMs:hit.now });
}
function uiHeroPush(push) {
uiHit.push = { dc:push.from.col - push.to.col,dr:push.from.row - push.to.row,face:facingToward(push.to,push.attacker) };
}
function uiHeroDown(down) {
const stage = down.game.stage;
if (uiPrefersReducedMotion() || !stage || !stage.follow) return false;
uiDown = { at:down.now,col:down.pose.col,row:down.pose.row,snapped:false,stage };
stage.holdUntil = down.now + BEAT.snapAtMs + BEAT.holdMarginMs;
uiSetAvatarPaint(uiHeroPaint);
uiBurstAt(down.pose,{ ...DOWN_SPARKS,atMs:down.now });
uiBurstAt(down.doorway,{ ...WAKE_RING,atMs:down.now + RISE.atMs });
return true;
}
function uiDownNow() {
return uiDown;
}
function uiPushShift(frame,push,age) {
const along = pushAt(age) * frame.tile;
return { dx:uiSnap(frame,push.dc * along),dy:uiSnap(frame,push.dr * along) };
}
function uiHitSpec(frame) {
const age = frame.now - uiHit.at;
const look = hurtLook(age);
if (!look) return null;
if (frame.reducedMotion) return { ...PLAIN,tint:STILL_TINT };
const push = uiHit.push;
const shift = push ? uiPushShift(frame,push,age) :{ dx:0,dy:0 };
return { ...PLAIN,...look,...shift,axis:push && push.dc !== 0 ? 'x' :'y',facing:push && age < HURT.faceMs ? push.face :null };
}
function uiSnapView(age) {
if (uiDown.snapped || age < BEAT.snapAtMs) return;
uiDown.snapped = true;
uiDown.stage.follow = null;
}
function uiFallSpec(frame,age) {
const pose = frame.avatar;
const shift = { dx:uiSnap(frame,(uiDown.col - pose.col) * frame.tile),dy:uiSnap(frame,(uiDown.row - pose.row) * frame.tile) };
return { ...PLAIN,...downLook(age),...shift };
}
function uiDownSpec(frame) {
const age = Math.max(0,frame.now - uiDown.at);
if (age >= RISE.atMs + RISE.ms) {
uiDown = null;
return null;
}
uiSnapView(age);
if (age < DOWN.ms) return uiFallSpec(frame,age);
const rise = riseLook(age);
return rise ? { ...PLAIN,alpha:rise.alpha,flash:rise.flash,sink:rise.rise } :{ ...PLAIN,alpha:0 };
}
function uiSpec(frame) {
return (uiDown && uiDownSpec(frame)) || uiHitSpec(frame);
}
function uiScaled(base,extra) {
return { x:base.x * extra.x,y:base.y * extra.y };
}
function uiLookOf(place,look) {
const spec = uiStash.spec;
const push = look.push || { x:0,y:0 };
const squash = squashScale(spec.squash,spec.axis);
return {
...look,facing:spec.facing || look.facing,scale:uiScaled(look.scale || { x:1,y:1 },squash),
push:{ x:push.x,y:push.y + spec.sink * place.unit },
};
}
function uiPlaceOf(place,spec) {
return { ...place,x:place.x + spec.dx,y:place.y + spec.dy };
}
function uiFigureOf(frame) {
const { place,look } = uiStash;
const size = place.unit * UI_AVATAR_PX;
const lift = Math.round((look.bob || 0) * place.unit * frame.dpr) / frame.dpr;
return { left:place.x + look.push.x,top:place.y + look.push.y - lift,size,ground:place.y + look.push.y + size * FEET,device:Math.round(size * frame.dpr) };
}
function uiPaintSilhouette(frame,tint) {
const look = uiStash.look;
const fig = uiFigureOf(frame);
const art = uiSilhouette(`hero${look.rootRank ? '-root' :''}-${look.facing}-${look.frame}`,fig.device,{ ink:tint.ink,palette:frame.palette });
if (!art) return;
const wide = fig.size * art.width / fig.device;
const edge = (wide - fig.size) * HALF;
const pivot = fig.left + fig.size * HALF;
const ctx = frame.ctx;
ctx.save();
ctx.globalAlpha = tint.alpha;
ctx.translate(pivot,fig.ground);
ctx.transform(look.scale.x,0,look.lean ? -look.lean * uiStash.place.unit / (HERO_BODY_HEIGHT * fig.size) :0,look.scale.y,0,0);
ctx.translate(-pivot,-fig.ground);
ctx.drawImage(art,fig.left - edge,fig.top - edge,wide,wide);
ctx.restore();
}
function uiSilhouette(name,device,paint) {
const { ink,palette } = paint;
const key = [name,device,ink,uiArtRevision()].join('|');
if (uiSilhouettes.has(key)) return uiSilhouettes.get(key);
const art = uiArtCanvas(name,{ devicePx:device });
if (!art) return null;
const canvas = document.createElement('canvas');
canvas.width = art.width;
canvas.height = art.height;
const ctx = canvas.getContext('2d');
ctx.drawImage(art,0,0);
ctx.globalCompositeOperation = 'source-in';
ctx.fillStyle = palette[ink];
ctx.fillRect(0,0,canvas.width,canvas.height);
if (uiSilhouettes.size >= SILHOUETTE_CAP) uiSilhouettes.clear();
uiSilhouettes.set(key,canvas);
return canvas;
}
function uiPaintTints(frame) {
const spec = uiStash.spec;
if (spec.flash > 0) uiPaintSilhouette(frame,{ ink:'text',alpha:spec.flash * spec.alpha });
if (spec.tint > 0) uiPaintSilhouette(frame,{ ink:'red',alpha:spec.tint * spec.alpha });
}
function uiHeroPaint(frame,place,look) {
const spec = uiSpec(frame);
if (!spec) {
uiSetAvatarPaint(null);
uiPaintAvatar(frame.ctx,place,look);
return;
}
Object.assign(uiStash,{ now:frame.now,frame,place,look,spec });
}
function uiPaintBody(ctx,figure,alpha) {
ctx.globalAlpha = alpha;
uiPaintAvatar(ctx,figure.place,figure.look);
ctx.globalAlpha = 1;
}
function uiHeroRepaint(frame) {
if (uiStash.now !== frame.now) return;
const spec = uiStash.spec;
const place = uiPlaceOf(uiStash.place,spec);
const look = uiLookOf(place,uiStash.look);
if (spec.alpha > 0) uiPaintBody(frame.ctx,{ place,look },spec.alpha);
Object.assign(uiStash,{ place,look });
uiPaintTints(frame);
}

uiGridPainter(uiHeroRepaint);

export { uiHeroHit,uiHeroPush,uiHeroDown,uiDownNow };
