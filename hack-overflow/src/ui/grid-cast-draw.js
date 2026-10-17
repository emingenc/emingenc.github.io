import { BENCH_CELLS,PATCH_CELL,trailLost,trailPose } from '../game/cast/patch.js';
import { uiPaintCastArt } from './grid-cast-sprites.js';
import { uiDrawActorTag,uiRegisterActorPainter } from './grid-draw-actors.js';

const PIP_TILES = 0.14;
const PIP_GAP_TILES = 0.06;
const PIP_TOP_TILES = 0.06;
const HALF = 0.5;
const FOLLOW_SHOWN_TILES = 0.5;

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
function uiDrawBench(ctx,frame) {
BENCH_CELLS.forEach(function (cell,index) { uiDrawArtAt(ctx,frame,{ cell,name:index === 0 ? 'screen' :'keys' }); });
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
uiDrawArtAt(ctx,frame,{ cell:actor,name:'sentinel' });
uiDrawPips(ctx,frame,actor);
uiDrawActorTag(ctx,frame,{ actor,calm:false,left:(actor.col - frame.camera.col) * frame.tile,top:(actor.row - frame.camera.row) * frame.tile });
}
function uiDrawCrate(ctx,frame,spot) {
uiDrawArtAt(ctx,frame,{ cell:spot.actor,name:'crate' });
}
function uiRegisterCastPainters() {
uiRegisterActorPainter('sentinel',uiDrawSentinel);
uiRegisterActorPainter('crate',uiDrawCrate);
}
function uiDrawFollower(ctx,app,frame) {
const cast = app.game.cast;
if (cast.dragged) return;
const hero = app.game.avatar.pos;
if (cast.trail && cast.role !== 'walk' && trailLost(cast.trail,hero)) cast.trail = null;
if (!cast.trail) return;
const cell = trailPose(cast.trail,{ now:frame.now,still:frame.reducedMotion });
const apart = Math.max(Math.abs(cell.col - frame.avatar.col),Math.abs(cell.row - frame.avatar.row));
if (apart >= FOLLOW_SHOWN_TILES) uiDrawArtAt(ctx,frame,{ cell,name:'patch' });
}
function uiDrawCast(ctx,app,frame) {
const role = app.game.cast.role;
if (role !== 'none') uiDrawBench(ctx,frame);
if (role === 'busy' || role === 'talk') uiDrawArtAt(ctx,frame,{ cell:PATCH_CELL,name:'patch' });
if (role === 'follow' || role === 'walk') uiDrawFollower(ctx,app,frame);
}

export { uiDrawCast,uiRegisterCastPainters };
