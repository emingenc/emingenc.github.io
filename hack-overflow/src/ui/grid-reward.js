import { drawerReady,refactorDue,refactorLit,openDrawer,DRAWER_LINES,DRAWER_RANK,DRAWER_SOURCE,LIT_BEAT,LIT_LINES,WAIT_LINE } from '../game/finale/refactor.js';
import { TRIM_CELLS } from '../game/finale/reward-cells.js';
import { createReward,openingSheet,restoreSheet,rewardDue,rewardOutcome,rewardStep,rewardView,withReward } from '../game/finale/reward.js';
import { withBeat } from '../game/ext/ops.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiDropKernel,uiHangKernel } from './grid-kernel-chips.js';
import { uiSay } from './grid-kernel-common.js';
import { uiStoryChoice } from './story-dialogue.js';

let uiHooked = false;

function uiRewardOf(game) {
return game.reward && game.reward.gen === game.gen ? game.reward :null;
}
function uiLive(app) {
return app.screen === 'grid' && Boolean(app.game) && Boolean(uiRewardOf(app.game)) && Boolean(app.game.ext) && Boolean(app.game.progress);
}
function uiParked(app) {
return Boolean(app.story) || app.screen !== 'grid' || Boolean(app.game.travelOpen);
}
function uiFinaleBusy(game) {
const road = game.roadback;
return Boolean(game.kernelUi || game.kernelBusy || game.ordealFlood || (game.journey && game.journey.finale) || (road && road.over));
}
function uiCovered(app) {
return Boolean(app.story || app.menuOpen || app.game.travelOpen);
}
function uiAwaitChip(app,state,view) {
const ui = state.ui;
const gen = app.game.gen;
return new Promise(function (resolve) {
const run = (pick) => () => { if (app.game.gen === gen && !uiParked(app)) resolve(pick); };
state.cancel = () => resolve(LET_GO.id);
ui.view = () => ({ ...view,chips:view.chips.map((chip) => ({ ...chip,run:run(chip.id) })) });
uiRenderKeepingFocus(app);
});
}
const LET_GO = { id:'letgo',label:'LET GO',aria:'Let go of the sweep. Nothing is lost, you can come back',tone:'warn' };
async function uiTurn(app,state) {
const view = rewardView(state.run);
const pick = await uiAwaitChip(app,state,{ ...view,chips:[...view.chips,LET_GO] });
if (pick === LET_GO.id) return null;
const step = rewardStep(state.run);
state.run = step.reward;
uiSay(app,step.texts.join(' '),'info');
return step;
}
async function uiTurns(app,state) {
const gen = app.game.gen;
let step = { done:false };
while (!step.done) {
step = await uiTurn(app,state);
if (app.game.gen !== gen || !step) return null;
}
return state.run;
}
async function uiSweep(app,state,first) {
const ui = uiHangKernel(app);
state.ui = ui;
state.run = first;
try {
return await uiTurns(app,state);
} finally {
state.run = null;
state.cancel = null;
state.ui = null;
ui.view = null;
uiDropKernel(app);
uiRenderKeepingFocus(app);
}
}
async function uiAnnounceRefactor(app) {
const game = app.game;
uiCommitExt(app,withBeat(game.ext,LIT_BEAT));
for (const text of LIT_LINES) await uiCastSay(app,{ text,kind:'reward' });
}
async function uiRestore(app,outcome) {
const gen = app.game.gen;
for (let again = true; again && app.game.gen === gen;) again = (await uiStoryChoice(app,restoreSheet(outcome))) === 'again';
}
async function uiSettle(app,done) {
const gen = app.game.gen;
const outcome = rewardOutcome(done);
const { uiPayRank } = await import('./rank-pay.js');
await uiPayRank(app,outcome.source,outcome.rank);
if (app.game.gen !== gen) return;
uiCommitExt(app,withReward(app.game.ext,outcome));
await uiRestore(app,outcome);
const game = app.game;
if (game.gen !== gen) return;
if (refactorDue(game.progress.won,game.ext,game.save)) await uiAnnounceRefactor(app);
else if (!refactorLit(game.progress.won,game.ext)) await uiCastSay(app,{ text:WAIT_LINE,kind:'info' });
}
async function uiRewardScene(app) {
const state = uiRewardOf(app.game);
const gen = app.game.gen;
if (state.busy) return;
state.busy = true;
try {
const first = createReward(app.game.ext);
const pick = await uiStoryChoice(app,openingSheet(first.tagged));
if (app.game.gen !== gen) return;
if (pick !== 'go') state.declined = true;
if (pick !== 'go' || uiFinaleBusy(app.game) || !rewardDue(app.game.ext,app.game.save)) return;
const done = await uiSweep(app,state,first);
if (done) await uiSettle(app,done);
} finally {
state.busy = false;
}
}
async function uiOpenDrawer(app) {
const state = uiRewardOf(app.game);
if (state.busy) return;
state.busy = true;
try {
const gen = app.game.gen;
const { uiPayRank } = await import('./rank-pay.js');
await uiPayRank(app,DRAWER_SOURCE,DRAWER_RANK);
if (app.game.gen !== gen) return;
uiCommitExt(app,withBeat(openDrawer(app.game.ext),LIT_BEAT));
uiRenderKeepingFocus(app);
for (const text of DRAWER_LINES) await uiCastSay(app,{ text,kind:'reward' });
} finally {
state.busy = false;
}
}
function uiOnBump(payload) {
const app = payload.app;
const prop = payload.event && payload.event.prop;
if (!uiLive(app) || !prop || !prop.startsWith('bench-') || uiFinaleBusy(app.game) || uiCovered(app)) return;
const game = app.game;
const state = uiRewardOf(game);
if (rewardDue(game.ext,game.save) && !state.declined) uiRewardScene(app).catch(console.error);
else if (drawerReady(game.progress.won,game.ext,game.save)) uiOpenDrawer(app).catch(console.error);
}
function uiYield(app,state) {
const game = app.game;
const road = game.roadback;
if (state.cancel && (game.kernelBusy || game.ordealFlood || (game.journey && game.journey.finale) || (road && road.over))) state.cancel();
}
function uiAtBench(pos) {
return TRIM_CELLS.some((cell) => Math.abs(cell.col - pos.col) + Math.abs(cell.row - pos.row) <= 1);
}
function uiOnMove(info) {
const app = info.app;
if (!uiLive(app)) return;
const state = uiRewardOf(app.game);
const declined = state.declined;
if (declined && !uiAtBench(app.game.avatar.pos)) state.declined = false;
uiYield(app,state);
if (uiFinaleBusy(app.game) || uiCovered(app)) return;
const game = app.game;
if (state.busy || !refactorDue(game.progress.won,game.ext,game.save) || (rewardDue(game.ext,game.save) && !declined)) return;
state.busy = true;
uiAnnounceRefactor(app).catch(console.error).finally(() => { state.busy = false; });
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isReward) return;
let draw = null;
import('./grid-reward-draw.js').then(function (module) { draw = module.uiPaintReward; }).catch(console.error);
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
if (draw) draw(ctx,app,frame);
};
paint.isReward = true;
game.drawCast = paint;
}
function uiHook() {
if (uiHooked) return;
uiHooked = true;
uiGridHook('bump',uiOnBump);
['step','enter-cell'].forEach((name) => uiGridHook(name,uiOnMove));
}

function uiInstallReward(app) {
const game = app.game;
game.reward = { gen:game.gen,busy:false,declined:false,run:null,ui:null,cancel:null };
uiWrapPaint(game);
uiHook();
}

function uiRewardEnter(app) {
const state = uiRewardOf(app.game);
if (state && state.cancel) state.cancel();
}

export { uiInstallReward,uiRewardEnter };
