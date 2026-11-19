import { followerRig } from '../game/cast/follower-rig.js';
import { uiArtCanvas,uiDrawArt } from './art-hook.js';
import { uiPaintCastArt } from './grid-cast-sprites.js';

const BODY_END = 0.71;
const LEGS_END = 0.9;
const MID = 0.5;
const FEET_Y = 0.86;
const FACE = { x:0.545,y:0.36,rx:0.11,ry:0.1 };
const HOOD = { x:0.4,y:0.2 };

function uiHoodColor(canvas) {
const data = canvas.getContext('2d').getImageData(Math.round(canvas.width * HOOD.x),Math.round(canvas.height * HOOD.y),1,1).data;
return `rgb(${data[0]},${data[1]},${data[2]})`;
}
function uiCover(ctx,canvas) {
ctx.fillStyle = uiHoodColor(canvas);
ctx.beginPath();
ctx.ellipse(canvas.width * FACE.x,canvas.height * FACE.y,canvas.width * FACE.rx,canvas.height * FACE.ry,0,0,Math.PI * 2);
ctx.fill();
}
function uiCopyOf(cache,canvas,paint) {
if (!cache.has(canvas)) {
const copy = document.createElement('canvas');
copy.width = canvas.width;
copy.height = canvas.height;
const ctx = copy.getContext('2d');
ctx.drawImage(canvas,0,0);
paint(ctx,copy);
cache.set(canvas,copy);
}
return cache.get(canvas);
}
const UI_AWAY = new WeakMap();
function uiAwayFrame(canvas) {
return uiCopyOf(UI_AWAY,canvas,uiCover);
}
function uiWhiten(ctx,copy) {
ctx.globalCompositeOperation = 'source-in';
ctx.fillStyle = '#ffffff';
ctx.fillRect(0,0,copy.width,copy.height);
}
const UI_WHITE = new WeakMap();
function uiWhiteFrame(canvas) {
return uiCopyOf(UI_WHITE,canvas,uiWhiten);
}
function uiSlice(ctx,canvas,part) {
const width = canvas.width;
const height = canvas.height;
ctx.drawImage(canvas,part.sx * width,part.sy * height,part.sw * width,part.sh * height,part.sx * width + (part.dx || 0) * width,part.sy * height + (part.dy || 0) * height,part.sw * width,part.sh * height);
}
function uiBody(ctx,canvas) {
uiSlice(ctx,canvas,{ sx:0,sy:0,sw:1,sh:BODY_END });
}
function uiLeg(ctx,canvas,spec) {
uiSlice(ctx,canvas,{ sx:spec.left ? 0 :MID,sy:BODY_END,sw:MID,sh:LEGS_END - BODY_END,dx:spec.reach,dy:-spec.lift });
}
function uiParts(ctx,source,rig) {
uiBody(ctx,source);
uiLeg(ctx,source,{ left:true,lift:rig.liftSide === -1 ? rig.legLift :0,reach:rig.liftSide === -1 ? rig.legSwing :0 });
uiLeg(ctx,source,{ left:false,lift:rig.liftSide === 1 ? rig.legLift :0,reach:rig.liftSide === 1 ? rig.legSwing :0 });
}
function uiPosed(ctx,canvas,rig) {
const pivotX = canvas.width * MID;
const pivotY = canvas.height * FEET_Y;
ctx.translate(pivotX,pivotY - canvas.height * rig.rise);
ctx.rotate(rig.lean);
ctx.scale(rig.scaleX,rig.scaleY);
ctx.translate(-pivotX,-pivotY);
const source = rig.away ? uiAwayFrame(canvas) :canvas;
uiParts(ctx,source,rig);
if (rig.flash <= 0) return;
ctx.globalAlpha *= rig.flash;
uiParts(ctx,uiWhiteFrame(source),rig);
}
function uiRigOf(frame,pose) {
const rig = followerRig(pose,{ now:frame.now,still:frame.reducedMotion });
return frame.reducedMotion || pose.stretch === undefined ? rig :{ ...rig,scaleY:rig.scaleY * pose.stretch };
}
function uiPaintPosed(ctx,frame,subject) {
const { spot,rig } = subject;
const device = Math.round(frame.tile * frame.dpr);
const canvas = uiArtCanvas('patch',{ devicePx:device,palette:frame.palette });
const box = { left:spot.left,top:spot.top,size:frame.tile,dpr:frame.dpr,palette:frame.palette };
if (!canvas || !uiDrawArt(ctx,'hero-shadow',box)) {
uiPaintCastArt(ctx,frame,{ name:'patch',left:spot.left,top:spot.top - rig.rise * frame.tile });
return;
}
const size = frame.tile * canvas.width / device;
ctx.imageSmoothingEnabled = true;
ctx.translate(spot.left - (size - frame.tile) / 2,spot.top - (size - frame.tile) / 2);
ctx.scale(size / canvas.width,size / canvas.height);
uiPosed(ctx,canvas,rig);
}
function uiPaintFollower(ctx,frame,subject) {
const { spot,pose } = subject;
const smooth = ctx.imageSmoothingEnabled;
ctx.save();
if (pose.alpha !== undefined && !frame.reducedMotion) ctx.globalAlpha = pose.alpha;
uiPaintPosed(ctx,frame,{ spot,rig:uiRigOf(frame,pose) });
ctx.restore();
ctx.imageSmoothingEnabled = smooth;
}

export { uiPaintFollower };
