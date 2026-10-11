import { BOLT_RANGE } from '../game/actors.js';
import { hasFind,withFind } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { tagName } from '../game/power/aim.js';
import { ownedPowers } from '../game/power/powers.js';
import { AMBUSH_FOES,KEYCARD,KEYCARD_TOAST,LEDGE_3,VENTS,canVent,ventAt,ventRefusal } from '../game/power/rift.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastCarry } from './grid-cast-act.js';
import { uiAddTagSpot,uiHooksOnce,uiPowerOf,uiTagIds } from './grid-power.js';
import { uiSpotOf } from './grid-spot.js';
import { uiShowToast } from './grid-toast.js';

const GLITCH_MS = 140;
const GLITCH_BARS = 5;
const GLITCH_INKS = ['cyan','magenta','bright'];
const TENTH = 0.1;
const BAR_SHAPES = ['90','53','71','45','82','64'];
const GRATE_BARS = 3;
const BAR_FILL = 0.6;

function uiRiftOn(app) {
const power = app.game && app.game.power;
return app.screen === 'grid' && Boolean(power) && power.gen === app.game.gen && power.rift === true;
}
function uiOwnsLookup(game) {
return ownedPowers(game.progress.won).includes('lookup');
}
function uiOnLedge(game) {
return game.avatar.pos.col === LEDGE_3.col && game.avatar.pos.row === LEDGE_3.row;
}
function uiGrantKeycard(app) {
const game = app.game;
if (!uiOnLedge(game) || hasFind(game.ext,KEYCARD)) return;
uiCommitExt(app,withFind(game.ext,KEYCARD));
uiShowToast(app,{ text:KEYCARD_TOAST,kind:'reward',replace:true });
}
function uiLedgeSpots(app) {
const game = app.game;
const here = game.avatar.pos;
const near = Math.max(Math.abs(LEDGE_3.col - here.col),Math.abs(LEDGE_3.row - here.row)) <= BOLT_RANGE;
return uiOwnsLookup(game) && near && uiAmbushFoes(game).length === 0 ? [{ id:LEDGE_3.id,col:LEDGE_3.col,row:LEDGE_3.row }] :[];
}
function uiVentBumped(game) {
const here = game.avatar.pos;
const vent = ventAt(cellToward(here,game.avatar.facing));
return vent && vent.from.col === here.col && vent.from.row === here.row ? vent :null;
}
function uiAmbushFoes(game) {
const actors = game.fight ? game.fight.actors :[];
const live = actors.filter((actor) => actor.hp > 0 && AMBUSH_FOES.includes(actor.id));
return live.map((actor) => ({ id:actor.id,name:tagName(actor.id,uiTagIds(game),actors) }));
}
function uiTryVent(app) {
const game = app.game;
const vent = uiVentBumped(game);
if (!vent) return;
const foes = uiAmbushFoes(game);
if (canVent(game.ext,foes)) uiCastCarry(app,{ cell:{ ...vent.to },facing:game.avatar.facing });
else uiShowToast(app,{ text:ventRefusal(game.ext,foes),kind:'info',replace:true });
}
function uiOnMove(info) {
if (uiRiftOn(info.app)) uiGrantKeycard(info.app);
}
function uiOnBump(info) {
if (!uiRiftOn(info.app)) return;
uiGrantKeycard(info.app);
uiTryVent(info.app);
}
const uiHook = uiHooksOnce({ 'enter-cell':uiOnMove,step:uiOnMove,tick:uiOnMove,bump:uiOnBump });
function uiPaintGlitch(ctx,frame,spot) {
const phase = frame.reducedMotion ? 0 :Math.floor(frame.now / GLITCH_MS);
const strip = frame.tile / GLITCH_BARS;
for (let bar = 0; bar < GLITCH_BARS; bar += 1) {
const [width,offset] = [...BAR_SHAPES[(phase + bar) % BAR_SHAPES.length]].map((tenths) => Number(tenths) * TENTH);
ctx.fillStyle = frame.palette[GLITCH_INKS[(phase + bar) % GLITCH_INKS.length]];
ctx.fillRect(spot.left + offset * frame.tile,spot.top + bar * strip,Math.min(width,1 - offset) * frame.tile,strip * BAR_FILL);
}
}
function uiPaintGrate(ctx,frame,spot) {
const bar = frame.tile / (GRATE_BARS * 2 + 1);
ctx.fillStyle = frame.palette.primary;
for (let at = 0; at < GRATE_BARS; at += 1) ctx.fillRect(spot.left + bar * (1 + at * 2),spot.top + bar,bar,frame.tile - bar * 2);
}
function uiPaintRift(ctx,app,frame) {
const game = app.game;
if (!uiOwnsLookup(game)) return;
const ledge = uiSpotOf(LEDGE_3,frame);
if (ledge) uiPaintGlitch(ctx,frame,ledge);
if (!hasFind(game.ext,KEYCARD)) return;
VENTS.map((vent) => uiSpotOf(vent.mouth,frame)).filter(Boolean).forEach((spot) => uiPaintGrate(ctx,frame,spot));
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isRift) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiPaintRift(ctx,app,frame);
};
paint.isRift = true;
game.drawCast = paint;
}
function uiInstallRift(app) {
const game = app.game;
uiPowerOf(game).rift = true;
uiAddTagSpot(game,uiLedgeSpots);
uiWrapPaint(game);
uiHook();
uiGrantKeycard(app);
}

export { uiInstallRift };
