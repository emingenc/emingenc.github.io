import { hurtHp } from '../game/hp.js';
import { PATCH_CELL } from '../game/cast/patch.js';
import { WAVE,heartsLost,waveColumns,waveHits } from '../game/finale/ordeal.js';
import { uiPrefersReducedMotion } from './dom.js';
import { ensureFight,uiHurt } from './grid-actors.js';
import { uiCastSleep } from './grid-cast-act.js';
import { uiPaintCastArt } from './grid-cast-sprites.js';

const FLOOD_ALPHA = 0.32;
const FRONT_ALPHA = 0.7;

function uiSpotOf(cell,frame) {
return { left:(cell.col - frame.camera.col) * frame.tile,top:(cell.row - frame.camera.row) * frame.tile };
}
function uiPaintFlood(ctx,frame,front) {
const rows = WAVE.maxRow - WAVE.minRow + 1;
const columns = front - WAVE.fromCol + 1;
const origin = uiSpotOf({ col:WAVE.fromCol,row:WAVE.minRow },frame);
ctx.save();
ctx.fillStyle = frame.palette.red;
ctx.globalAlpha = FLOOD_ALPHA;
ctx.fillRect(origin.left,origin.top,columns * frame.tile,rows * frame.tile);
ctx.globalAlpha = FRONT_ALPHA;
ctx.fillRect(origin.left + (columns - 1) * frame.tile,origin.top,frame.tile,rows * frame.tile);
ctx.restore();
}
function uiDrawOrdeal(ctx,app,frame) {
const flood = app.game.ordealFlood;
if (!flood) return;
uiPaintCastArt(ctx,frame,{ name:'patch',...uiSpotOf(PATCH_CELL,frame) });
if (flood.front >= WAVE.fromCol) uiPaintFlood(ctx,frame,flood.front);
}
function uiFloodStart(game) {
const cast = game.drawCast;
game.ordealFlood = { front:WAVE.fromCol - 1,cast };
game.drawCast = function (ctx,app,frame) {
if (cast) cast(ctx,app,frame);
uiDrawOrdeal(ctx,app,frame);
};
}
function uiFloodStop(game) {
const flood = game.ordealFlood;
if (!flood) return;
game.drawCast = flood.cast;
game.ordealFlood = null;
}
function uiFloodHurt(app,count) {
const fight = ensureFight(app.game);
const lost = heartsLost(fight.hp.hearts,count);
if (lost > 0) fight.hp = hurtHp(fight.hp,lost).hp;
return lost;
}
function uiFloodTouch(app) {
if (heartsLost(ensureFight(app.game).hp.hearts,1) > 0) uiHurt(app,1,'flood');
}
async function uiFloodWave(app) {
const game = app.game;
const reduced = uiPrefersReducedMotion();
let touched = false;
for (const col of waveColumns()) {
game.ordealFlood.front = col;
if (!touched && waveHits(col,game.avatar.pos)) {
touched = true;
uiFloodTouch(app);
}
if (!reduced) await uiCastSleep(app,WAVE.stepMs);
}
}

export { uiFloodStart,uiFloodStop,uiFloodHurt,uiFloodWave,uiDrawOrdeal };
