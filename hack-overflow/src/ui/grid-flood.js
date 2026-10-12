import { GAME_EVENT } from '../game/game-events.js';
import { hasBeat } from '../game/ext/ops.js';
import { floodAllowed } from '../game/power/flood.js';
import { uiGameBus } from './bus.js';
import { uiRegisterShotToasts } from './grid-actors.js';
import { uiDrawActors } from './grid-draw-actors.js';
import { uiPaintFloodMarks,uiRegisterFloodPainter } from './grid-flood-draw.js';
import { uiFloodLive,uiFloodOf,uiRunFlood,uiStandDown } from './grid-flood-run.js';
import { uiHangFloodStrip } from './grid-flood-strip.js';
import { uiAddChips,uiPowerOf } from './grid-power.js';
import { uiStoryClosed } from './story-dialogue.js';

const BIT_TOASTS = { kill:{ text:'FLOOD BIT CUT',kind:'info' },dent:{ text:'FLOOD BIT HIT',kind:'info' } };
const STAND_DOWN = { id:'flood-stand-down',label:'STAND DOWN',aria:'Stand down the write-protect flood',tone:'warn' };
let uiBound = null;
let uiHooked = false;

function uiOnAccepted(payload) {
if (uiBound) uiBound.game.pendingFlood = payload.key;
}
function uiBindBus(app) {
uiBound = app;
if (uiHooked) return;
uiHooked = true;
uiGameBus().on(GAME_EVENT.ACCEPTED,uiOnAccepted);
}
function uiFirstSolve(game,key) {
return Boolean(game.outcome) && game.outcome.key === key && game.outcome.bestBefore === null;
}
function uiFinaleActive(game) {
const road = game.roadback;
return Boolean(game.kernelBusy || game.kernelUi || game.ordealFlood || (game.journey && game.journey.finale) || (road && road.over));
}
function uiGateState(app) {
const game = app.game;
return {
ended:Boolean(game.save.ended),hasBolt:hasBeat(game.ext,'bolt'),lockCount:game.progress.breached.size,finaleActive:uiFinaleActive(game),
uiBusy:Boolean(app.story) || Boolean(game.travelOpen) || Boolean(app.menuOpen) || app.screen !== 'grid',
};
}
async function uiEnterFlood(app) {
const game = app.game;
const key = game.pendingFlood;
const run = uiFloodOf(game);
if (key && !(run && run.live) && (app.story || app.screen === 'levelup')) {
if (app.story) uiStoryClosed(app).then(() => uiEnterFlood(app));
return false;
}
game.pendingFlood = null;
if (!key || (run && run.live) || !uiFirstSolve(game,key) || !floodAllowed(uiGateState(app)).ok) return false;
return uiRunFlood(app,key);
}
function uiPaintMarks(ctx,app,frame) {
const game = app.game;
const cellOf = (key) => game.world.terminals[key];
const held = (game.ext.held || []).filter((key) => Object.hasOwn(game.world.terminals,key)).map(cellOf);
const run = uiFloodOf(game);
uiPaintFloodMarks(ctx,frame,{ held,run:run && run.live ? { cell:cellOf(run.key),rewrites:run.rewrites } :null });
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isFlood) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiPaintMarks(ctx,app,frame);
};
paint.isFlood = true;
game.drawCast = paint;
}
function uiInstallFlood(app) {
const game = app.game;
uiBindBus(app);
uiRegisterShotToasts('flood',BIT_TOASTS);
uiRegisterFloodPainter();
if (!game.drawActors) game.drawActors = uiDrawActors;
uiWrapPaint(game);
uiHangFloodStrip(game,{ live:uiFloodLive,standDown:uiStandDown });
uiPowerOf(game).flood = null;
uiAddChips(game,(shown) => (uiFloodLive(shown) ? [{ ...STAND_DOWN,run:uiStandDown }] :[]));
}

export { uiEnterFlood,uiInstallFlood };
