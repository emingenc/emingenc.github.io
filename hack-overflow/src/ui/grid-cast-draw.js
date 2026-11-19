import { arriveAlpha,emergeAt,glideCell } from '../game/cast/follower-motion.js';
import { BENCH_CELLS,PATCH_CELL,TRAIL_MS,facingOf,followerPose,trailLost,trailPose } from '../game/cast/patch.js';
import { pulseAt } from '../game/wayfinding.js';
import { uiPaintFollower } from './grid-cast-follower.js';
import { uiNoteHp,uiNpcPose,uiPoseBegin } from './grid-foe-glide.js';
import { uiPaintCastArt } from './grid-cast-sprites.js';
import { uiDrawActorTag,uiRegisterActorPainter } from './grid-draw-actors.js';
import { uiDrawDebris } from './grid-crate-debris.js';
import { uiRegisterSpeaker,uiSpeechAge } from './grid-speech.js';

const PIP_TILES = 0.14;
const PIP_GAP_TILES = 0.06;
const PIP_TOP_TILES = 0.06;
const HALF = 0.5;
const NEAR_CELLS = 2;
const FAR_CELLS = 2.5;
const SCREEN_GLOW = { x:0.32,y:0.14,w:0.3,h:0.24,alpha:0.18,swing:0.22 };
const KEYS_GLOW = { x:0.3,y:0.5,w:0.5,h:0.12,alpha:0.18 };
const TYPE_BEAT_MS = 180;
const CLACK_MS = 90;

function uiSpotIn(cell,frame) {
const left = (cell.col - frame.camera.col) * frame.tile;
const top = (cell.row - frame.camera.row) * frame.tile;
const seen = left + frame.tile > 0 && top + frame.tile > 0 && left < frame.width && top < frame.height;
return seen ? { left,top } :null;
}
function uiDrawArtAt(ctx,frame,place) {
const spot = uiSpotIn(place.cell,frame);
if (spot) uiPaintCastArt(ctx,frame,{ name:place.name,...spot });
}
function uiGlow(ctx,frame,spec) {
const spot = uiSpotIn(spec.cell,frame);
if (!spot || spec.alpha <= 0) return;
const box = spec.box;
ctx.globalCompositeOperation = 'lighter';
ctx.globalAlpha = spec.alpha;
ctx.fillStyle = frame.palette[spec.ink];
ctx.fillRect(spot.left + box.x * frame.tile,spot.top + box.y * frame.tile,box.w * frame.tile,box.h * frame.tile);
ctx.globalAlpha = 1;
ctx.globalCompositeOperation = 'source-over';
}
function uiBenchGlow(ctx,frame,role) {
if (frame.reducedMotion) return;
const pulse = pulseAt(frame.now,false);
uiGlow(ctx,frame,{ cell:BENCH_CELLS[0],box:SCREEN_GLOW,ink:'cyan',alpha:SCREEN_GLOW.alpha + SCREEN_GLOW.swing * pulse });
const clack = frame.now % TYPE_BEAT_MS < CLACK_MS && role === 'busy';
uiGlow(ctx,frame,{ cell:BENCH_CELLS[1],box:KEYS_GLOW,ink:'text',alpha:clack ? KEYS_GLOW.alpha :0 });
}
function uiDrawBench(ctx,frame,role) {
BENCH_CELLS.forEach(function (cell,index) { uiDrawArtAt(ctx,frame,{ cell,name:index === 0 ? 'screen' :'keys' }); });
uiBenchGlow(ctx,frame,role);
}
function uiDrawPips(ctx,frame,sentinel) {
const spot = uiSpotIn(sentinel,frame);
if (!spot) return;
const pip = frame.tile * PIP_TILES;
const gap = frame.tile * PIP_GAP_TILES;
const left = spot.left + (frame.tile - (pip * sentinel.maxHp + gap * (sentinel.maxHp - 1))) * HALF;
for (let index = 0; index < sentinel.maxHp; index += 1) {
ctx.fillStyle = index < sentinel.hp ? frame.palette.red :frame.palette.dim;
ctx.fillRect(left + index * (pip + gap),spot.top + frame.tile * PIP_TOP_TILES,pip,pip);
}
}
function uiDrawSentinel(ctx,frame,spot) {
const actor = spot.actor;
uiNoteHp(actor.id,{ hp:actor.hp,now:frame.now });
const pose = uiNpcPose(frame,{ id:actor.id,cell:actor,hero:null });
uiPoseBegin(ctx,frame,{ left:(actor.col - frame.camera.col) * frame.tile,top:(actor.row - frame.camera.row) * frame.tile,pose });
uiDrawArtAt(ctx,frame,{ cell:actor,name:'sentinel' });
ctx.restore();
if (spot.look.dying) return;
uiDrawPips(ctx,frame,actor);
uiDrawActorTag(ctx,frame,{ actor,calm:false,look:spot.look,left:(actor.col - frame.camera.col) * frame.tile,top:(actor.row - frame.camera.row) * frame.tile });
}
function uiDrawCrate(ctx,frame,spot) {
if (spot.look.debris >= 0) uiDrawDebris(ctx,frame,spot);
else uiDrawArtAt(ctx,frame,{ cell:spot.actor,name:'crate' });
}
function uiPatchCell(app) {
const cast = app.game.cast;
if (cast.role === 'busy' || cast.role === 'talk') return PATCH_CELL;
if (cast.role !== 'follow' && cast.role !== 'walk') return null;
if (!cast.trail || cast.dragged) return app.game.avatar.pos;
return trailPose(cast.trail,{ now:performance.now(),still:false });
}
function uiRegisterCastPainters() {
uiRegisterActorPainter('sentinel',uiDrawSentinel);
uiRegisterActorPainter('crate',uiDrawCrate);
uiRegisterSpeaker('PATCH',uiPatchCell);
}
const UI_TRAIL = { trail:null,facing:'down',turnAt:-Infinity,firstAt:0 };
function uiNoteTrail(trail,now) {
if (UI_TRAIL.trail === trail) return;
if (UI_TRAIL.trail === null) UI_TRAIL.firstAt = now;
UI_TRAIL.trail = trail;
const facing = facingOf(trail.from,trail);
if (facing === UI_TRAIL.facing) return;
UI_TRAIL.facing = facing;
UI_TRAIL.turnAt = now;
}
function uiForget() {
UI_TRAIL.trail = null;
}
function uiCues(trail,frame) {
const stopAt = trail.at + TRAIL_MS;
return { turnAge:frame.now - UI_TRAIL.turnAt,settleAge:Number.isFinite(stopAt) ? frame.now - stopAt :-1,hopAge:uiSpeechAge('PATCH',frame.now) };
}
function uiPresence(app,frame,apart) {
const emerge = emergeAt(apart);
const arrive = app.game.cast.role === 'walk' && !frame.reducedMotion ? arriveAlpha(frame.now - UI_TRAIL.firstAt) :1;
return { alpha:emerge.alpha * arrive,stretch:emerge.scaleY };
}
function uiDrawFollower(ctx,app,frame) {
const cast = app.game.cast;
if (cast.dragged) return;
const hero = app.game.avatar.pos;
if (cast.trail && cast.role !== 'walk' && trailLost(cast.trail,hero)) cast.trail = null;
if (!cast.trail) { uiForget(); return; }
uiNoteTrail(cast.trail,frame.now);
const clock = { now:frame.now,still:frame.reducedMotion };
const cell = glideCell(cast.trail,clock);
const apart = Math.max(Math.abs(cell.col - frame.avatar.col),Math.abs(cell.row - frame.avatar.row));
const presence = uiPresence(app,frame,apart);
const spot = presence.alpha > 0 ? uiSpotIn(cell,frame) :null;
if (spot) uiPaintFollower(ctx,frame,{ spot,pose:{ ...followerPose(cast.trail,clock),...uiCues(cast.trail,frame),...presence } });
}
const UI_BENCH = { near:false,hopAt:-Infinity };
function uiBenchCues(app,frame,seat) {
const talk = app.game.cast.role === 'talk';
const hero = frame.avatar || app.game.avatar.pos;
const dc = hero.col - seat.col;
const apart = Math.max(Math.abs(dc),Math.abs(hero.row - seat.row));
if (talk && !UI_BENCH.near && apart <= NEAR_CELLS) { UI_BENCH.near = true; UI_BENCH.hopAt = frame.now; }
if (apart > FAR_CELLS) UI_BENCH.near = false;
const hopAge = Math.min(uiSpeechAge('PATCH',frame.now),frame.now - UI_BENCH.hopAt);
return { typing:app.game.cast.role === 'busy',toward:talk && apart <= FAR_CELLS ? Math.sign(dc) :0,hopAge };
}
function uiDrawBenchPatch(ctx,frame,bench) {
const { app,seat } = bench;
const spot = uiSpotIn(seat,frame);
if (spot) uiPaintFollower(ctx,frame,{ spot,pose:{ facing:'down',moving:false,phase:0,...uiBenchCues(app,frame,seat) } });
}
function uiIsBenched(cast,flood) {
return cast.role === 'busy' || cast.role === 'talk' || Boolean(flood && flood.patchAt === 'bench');
}
function uiDrawCast(ctx,app,frame) {
const role = app.game.cast.role;
const flood = app.game.ordealFlood;
const seat = flood && flood.bench ? flood.bench :PATCH_CELL;
const benched = uiIsBenched(app.game.cast,flood);
if (role !== 'none' || benched) uiDrawBench(ctx,frame,role);
if (benched && !app.game.cast.dragged) uiDrawBenchPatch(ctx,frame,{ app,seat });
if (role === 'follow' || role === 'walk') uiDrawFollower(ctx,app,frame);
}

export { uiDrawCast,uiRegisterCastPainters };
