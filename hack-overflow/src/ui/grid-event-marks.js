import { pendingEvents } from '../game/power/event-cells.js';
import { uiPowerOf } from './grid-power.js';

const MARK_INSET_PX = 3;
const MARK_LINE_PX = 2;
const PULSE_MS = 1200;
const ALPHA_FLOOR = 0.55;
const LABEL_REACH = 6;
const LABEL_TILES = 0.3;
const LABEL_MIN_PX = 10;
const GLYPH_TILES = 0.55;
const GLYPH_EM = 0.6;
const PAD_EM = 0.6;
const HALF = 0.5;
const FULL_TURN = Math.PI * 2;

function uiLive(game,id) {
const state = uiPowerOf(game)[id];
return Boolean(state && state.live);
}
function uiPulse(frame) {
if (frame.reducedMotion) return 1;
return ALPHA_FLOOR + (1 - ALPHA_FLOOR) * (HALF + HALF * Math.sin(FULL_TURN * (frame.now % PULSE_MS) / PULSE_MS));
}
function uiSpotOf(cell,frame) {
return { left:(cell.col - frame.camera.col) * frame.tile,top:(cell.row - frame.camera.row) * frame.tile };
}
function uiInView(spot,frame) {
return spot.left > -frame.tile && spot.top > -frame.tile && spot.left < frame.width && spot.top < frame.height;
}
function uiNear(game,cell) {
const hero = game.avatar.pos;
return Math.max(Math.abs(hero.col - cell.col),Math.abs(hero.row - cell.row)) <= LABEL_REACH;
}
function uiPaintTile(ctx,frame,spot) {
const side = frame.tile - MARK_INSET_PX * 2;
ctx.lineWidth = MARK_LINE_PX;
ctx.strokeStyle = frame.palette.amber;
ctx.strokeRect(spot.left + MARK_INSET_PX,spot.top + MARK_INSET_PX,side,side);
ctx.fillStyle = frame.palette.amber;
ctx.font = 'bold ' + Math.round(frame.tile * GLYPH_TILES) + 'px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('!',spot.left + frame.tile * HALF,spot.top + frame.tile * HALF);
}
function uiPaintLabel(ctx,frame,place) {
const { event,spot } = place;
const size = Math.max(LABEL_MIN_PX,Math.round(frame.tile * LABEL_TILES));
const width = event.label.length * size * GLYPH_EM + size * PAD_EM;
const height = size + size * PAD_EM;
const left = spot.left + frame.tile * HALF - width * HALF;
const top = Math.max(0,spot.top - height);
ctx.fillStyle = frame.palette.bg;
ctx.fillRect(left,top,width,height);
ctx.font = 'bold ' + size + 'px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = frame.palette.amber;
ctx.fillText(event.label,left + width * HALF,top + height * HALF);
}
function uiPaintMarks(ctx,app,frame) {
const game = app.game;
if (!game.ext || game.opening) return;
const events = pendingEvents(game.ext,game.progress.won).filter((event) => !uiLive(game,event.id));
if (events.length === 0) return;
ctx.save();
ctx.globalAlpha = uiPulse(frame);
events.forEach((event) => {
const spot = uiSpotOf(event.cell,frame);
if (!uiInView(spot,frame)) return;
uiPaintTile(ctx,frame,spot);
if (uiNear(game,event.cell)) uiPaintLabel(ctx,frame,{ event,spot });
});
ctx.restore();
}
function uiInstallEventMarks(app) {
const game = app.game;
const inner = game.drawCast;
game.drawCast = function (ctx,shown,frame) {
if (inner) inner(ctx,shown,frame);
uiPaintMarks(ctx,shown,frame);
};
}

export { uiInstallEventMarks,uiPaintMarks };
