import { awayUnit,deathPose,hurtPose,strikeShift,windupPose } from '../game/foe-motion.js';
import { mitesView } from '../game/mites.js';
import { uiArtCanvas,uiArtRevision,uiDrawArt } from './art-hook.js';
import { uiGridPainter } from './grid-draw-fx.js';

const FLASH_ART = { sentinel:'sentinel',crate:'crate',mite:'mite' };
const MITE_ACCENT = { plain:'amber',armoured:'cyan' };
const SILHOUETTE_CAP = 8;
const WHITE = '#ffffff';
const DRONE = 'drone';
const DRONE_ARM_URGENT = 1;
const HALF = 0.5;
const REST = { dying:false,shown:true,flash:0,sx:1,sy:1,alpha:1,dx:0,dy:0,debris:-1 };
const GONE = { ...REST,dying:true,shown:false };

const uiTrack = { fight:null,notes:null,hero:{ col:0,row:0 },painted:false };
const uiSilhouettes = new Map();
let uiSilhouetteRevision = -1;

function uiTrackFight(fight,view) {
Object.assign(uiTrack,{ fight,notes:view.notes,hero:view.hero });
if (uiTrack.painted) return;
uiTrack.painted = true;
uiGridPainter(uiDrawFallenMites);
}
function uiUrgentSince(clock,view,now) {
const urgent = view.kind === DRONE && view.foe.arm <= DRONE_ARM_URGENT;
if (!urgent) clock.urgentAt = null;
else if (clock.urgentAt === null) clock.urgentAt = now;
return clock.urgentAt;
}
function uiLivingLook(frame,view) {
const { clock,away } = view;
const reduced = frame.reducedMotion;
const hurt = hurtPose(clock.hurtAt === null ? -1 :frame.now - clock.hurtAt,reduced);
const shift = hurt.push + strikeShift(view.kind,{ age:clock.struckAt === null ? -1 :frame.now - clock.struckAt,reduced });
const since = uiUrgentSince(clock,view,frame.now);
const wind = since === null ? { scale:1,jx:0,jy:0 } :windupPose({ now:frame.now,since },reduced);
return { ...REST,flash:hurt.flash,sx:wind.scale,sy:wind.scale,dx:away.x * shift + wind.jx,dy:away.y * shift + wind.jy };
}
function uiFallenLook(frame,view) {
const { clock,away } = view;
if (clock.impactAt === null) return GONE;
const pose = deathPose(frame.now - clock.impactAt,{ kind:view.kind,reduced:frame.reducedMotion });
return { ...pose,dying:true,dx:pose.jx,dy:pose.jy + pose.drop,away };
}
function uiFoeLook(frame,foe) {
const clock = uiTrack.notes && uiTrack.notes.drones.get(foe.id);
if (!clock) return foe.hp > 0 ? REST :GONE;
const view = { foe,clock,kind:foe.kind ?? DRONE,away:awayUnit(foe,uiTrack.hero) };
return foe.hp > 0 ? uiLivingLook(frame,view) :uiFallenLook(frame,view);
}
function uiSilhouette(name,spec) {
if (typeof document === 'undefined') return null;
const art = uiArtCanvas(name,{ accent:'cyan',devicePx:spec.devicePx,palette:spec.palette });
if (!art) return null;
if (uiSilhouetteRevision !== uiArtRevision() || uiSilhouettes.size >= SILHOUETTE_CAP) {
uiSilhouettes.clear();
uiSilhouetteRevision = uiArtRevision();
}
const key = name + '|' + art.width;
if (!uiSilhouettes.has(key)) uiSilhouettes.set(key,uiBakeSilhouette(art));
return uiSilhouettes.get(key);
}
function uiBakeSilhouette(art) {
const canvas = document.createElement('canvas');
canvas.width = art.width;
canvas.height = art.height;
const paint = canvas.getContext('2d');
paint.drawImage(art,0,0);
paint.globalCompositeOperation = 'source-in';
paint.fillStyle = WHITE;
paint.fillRect(0,0,art.width,art.height);
return canvas;
}
function uiDrawFlash(ctx,frame,place) {
const look = place.look;
if (look.flash <= 0 || !place.flashArt) return;
const devicePx = Math.round(frame.tile * frame.dpr);
const canvas = uiSilhouette(place.flashArt,{ devicePx,palette:frame.palette });
if (!canvas) return;
const size = frame.tile * canvas.width / devicePx;
ctx.globalAlpha = look.alpha * look.flash;
ctx.drawImage(canvas,place.left - (size - frame.tile) * HALF,place.top - (size - frame.tile) * HALF,size,size);
}
function uiAtRest(look) {
return look.sx === 1 && look.sy === 1 && look.dx === 0 && look.dy === 0 && look.alpha === 1 && look.flash === 0;
}
function uiPoseApply(ctx,frame,place) {
const look = place.look;
const centre = { x:place.left + frame.tile * HALF,y:place.top + frame.tile * HALF };
ctx.save();
ctx.translate(centre.x + look.dx * frame.tile,centre.y + look.dy * frame.tile);
ctx.scale(look.sx,look.sy);
ctx.translate(-centre.x,-centre.y);
if (look.alpha < 1) ctx.globalAlpha = look.alpha;
}
function uiDrawInPose(ctx,frame,job) {
if (uiAtRest(job.look)) {
job.paint();
return;
}
uiPoseApply(ctx,frame,{ ...uiCellOf(frame,job.foe),look:job.look });
job.paint();
ctx.restore();
}
function uiDrawPosed(ctx,frame,place) {
const { look,paint } = place;
if (!look.shown) return;
if (uiAtRest(look)) {
paint();
return;
}
uiPoseApply(ctx,frame,place);
paint();
uiDrawFlash(ctx,frame,place);
ctx.restore();
}
function uiCellOf(frame,foe) {
return { left:(foe.col - frame.camera.col) * frame.tile,top:(foe.row - frame.camera.row) * frame.tile };
}
function uiDrawFoePosed(ctx,frame,job) {
const cell = uiCellOf(frame,job.foe);
uiDrawPosed(ctx,frame,{ ...cell,look:job.look || uiFoeLook(frame,job.foe),flashArt:FLASH_ART[job.foe.kind ?? DRONE],paint:job.paint });
}
function uiFallenMiteArt(ctx,frame,mite) {
const cell = uiCellOf(frame,mite);
const accent = mite.maxHp > 1 ? MITE_ACCENT.armoured :MITE_ACCENT.plain;
uiDrawArt(ctx,'mite',{ left:cell.left,top:cell.top,size:frame.tile,dpr:frame.dpr,accent });
}
function uiDrawFallenMites(frame) {
const fight = uiTrack.fight;
if (!fight || !fight.mites || !uiTrack.notes) return;
mitesView(fight.mites).filter(function (mite) { return mite.hp <= 0; }).forEach(function (mite) {
uiDrawFoePosed(frame.ctx,frame,{ foe:mite,paint:function () { uiFallenMiteArt(frame.ctx,frame,mite); } });
});
}

export { uiTrackFight,uiFoeLook,uiDrawPosed,uiDrawFoePosed,uiDrawInPose };
