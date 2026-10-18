import { drawerReady,refactorDue,refactorLit,openDrawer,DRAWER_LINES,DRAWER_RANK,DRAWER_SOURCE,LIT_BEAT,LIT_LINES,WAIT_LINE } from '../game/finale/refactor.js';
import { TRIM_CELLS } from '../game/finale/reward-cells.js';
import { GC_GRACE_MS,GC_TICK_MS,createReward,createTimedReward,openingSheet,rewardAct,rewardCard,rewardDue,rewardOutcome,rewardStep,rewardSweep,rewardTimedView,rewardView,withReward } from '../game/finale/reward.js';
import { withBeat } from '../game/ext/ops.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiHangKernel } from './grid-kernel-chips.js';
import { uiSay } from './grid-kernel-common.js';
import { LET_GO_ID,uiAwaitChip,uiParked,uiBenchBumped,uiExclusive,uiHookBench,uiLetGo,uiLiveState,uiReleaseStrip,uiSceneState,uiTellInBackground } from './grid-scene-strip.js';
import { uiStoryChoice } from './story-dialogue.js';


function uiRewardOf(game) {
return game.reward && game.reward.gen === game.gen ? game.reward :null;
}
function uiLive(app) {
return Boolean(uiLiveState(app,uiRewardOf));
}
function uiFinaleBusy(game) {
const road = game.roadback;
return Boolean(game.kernelUi || game.kernelBusy || game.ordealFlood || (game.journey && game.journey.finale) || (road && road.over));
}
function uiCovered(app) {
return Boolean(app.story || app.menuOpen || app.game.travelOpen);
}
const LET_GO = { id:LET_GO_ID,label:'LET GO',aria:'Let go of the sweep. Nothing is lost, you can come back',tone:'warn' };
const GC_ID = 'gc';
const PARKED_RETRY_MS = 300;
function uiPaced(app) {
return app.game.ext.assist === true || Boolean(uiPrefersReducedMotion());
}
async function uiTurn(app,state) {
const view = rewardView(state.run);
const pick = await uiAwaitChip(app,state,{ ...view,chips:[...view.chips,LET_GO] });
if (pick === LET_GO.id) return null;
const step = rewardStep(state.run);
state.run = step.reward;
uiSay(app,step.texts.join(' '),'info');
return step;
}
function uiArmGc(app,state,finish) {
const wait = Math.max(0,state.clock.at - performance.now());
state.gc = window.setTimeout(function () {
if (!uiParked(app) && !app.menuOpen && !document.hidden) return finish(GC_ID);
state.clock.at = performance.now() + PARKED_RETRY_MS;
uiArmGc(app,state,finish);
},wait);
}
function uiTimedView(app,state) {
const view = rewardTimedView(state.run,{ scanning:state.scanning });
const pick = (id) => () => { if (app.game.gen === state.gen && !uiParked(app) && !state.scanning) state.take(id); };
return { ...view,chips:[...view.chips.map((chip) => ({ ...chip,run:pick(chip.id) })),{ ...LET_GO,run:() => state.take(LET_GO_ID) }] };
}
function uiAwaitTimed(app,state) {
return new Promise(function (resolve) {
const finish = (id) => { window.clearTimeout(state.gc); state.gc = 0; resolve(id); };
state.take = finish;
state.cancel = () => finish(LET_GO_ID);
state.ui.view = () => uiTimedView(app,state);
uiArmGc(app,state,finish);
uiRenderKeepingFocus(app);
});
}
function uiCoolScan(app,state) {
state.scanning = true;
window.setTimeout(function () {
state.scanning = false;
if (state.ui) uiRenderKeepingFocus(app);
},GC_TICK_MS);
}
function uiTimedStep(app,state,pick) {
const step = pick === GC_ID ? rewardSweep(state.run) : rewardAct(state.run);
state.run = step.reward;
if (pick === GC_ID) state.clock.at = performance.now() + GC_TICK_MS;
else if (!state.run.tagged && !step.done) uiCoolScan(app,state);
if (step.texts.length > 0) uiSay(app,step.texts.join(' '),pick === GC_ID ? 'warn' :'info');
return step;
}
async function uiTimedTurns(app,state) {
const gen = app.game.gen;
state.clock = { at:performance.now() + GC_GRACE_MS,every:GC_TICK_MS };
state.scanning = false;
for (let step = { done:false }; !step.done;) {
const pick = await uiAwaitTimed(app,state);
if (app.game.gen !== gen || pick === LET_GO_ID) return null;
step = uiTimedStep(app,state,pick);
}
return state.run;
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
return await (first.timed ? uiTimedTurns(app,state) :uiTurns(app,state));
} finally {
window.clearTimeout(state.gc);
state.gc = 0;
state.clock = null;
uiReleaseStrip(app,state,ui);
}
}
async function uiAnnounceRefactor(app) {
const game = app.game;
uiCommitExt(app,withBeat(game.ext,LIT_BEAT));
for (const text of LIT_LINES) await uiCastSay(app,{ text,kind:'reward' });
}
async function uiRestore(app,outcome) {
const card = await import('./grid-result-card.js');
await card.uiShowResultCard(app,rewardCard(outcome));
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
function uiRewardScene(app) {
const state = uiRewardOf(app.game);
const gen = app.game.gen;
return uiExclusive(state,async function () {
const first = uiPaced(app) ? createReward(app.game.ext) :createTimedReward(app.game.ext);
const pick = await uiStoryChoice(app,openingSheet(first.tagged));
if (app.game.gen !== gen) return;
if (pick !== 'go') state.declined = true;
if (pick !== 'go' || uiFinaleBusy(app.game) || !rewardDue(app.game.ext,app.game.save)) return;
const done = await uiSweep(app,state,first);
if (done) await uiSettle(app,done);
});
}
function uiOpenDrawer(app) {
const gen = app.game.gen;
return uiExclusive(uiRewardOf(app.game),async function () {
const { uiPayRank } = await import('./rank-pay.js');
await uiPayRank(app,DRAWER_SOURCE,DRAWER_RANK);
if (app.game.gen !== gen) return;
uiCommitExt(app,withBeat(openDrawer(app.game.ext),LIT_BEAT));
uiRenderKeepingFocus(app);
for (const text of DRAWER_LINES) await uiCastSay(app,{ text,kind:'reward' });
});
}
function uiOnBump(payload) {
const app = uiBenchBumped(payload);
if (!app || !uiLive(app) || uiFinaleBusy(app.game) || uiCovered(app)) return;
const game = app.game;
const state = uiRewardOf(game);
if (rewardDue(game.ext,game.save) && !state.declined) uiRewardScene(app).catch(console.error);
else if (drawerReady(game.progress.won,game.ext,game.save)) uiOpenDrawer(app).catch(console.error);
}
function uiFinaleYields(game) {
const road = game.roadback;
return Boolean(game.kernelBusy || game.ordealFlood || (game.journey && game.journey.finale) || (road && road.over));
}
function uiYield(app,state) {
if (state.cancel && uiFinaleYields(app.game)) state.cancel();
}
function uiAtBench(pos) {
return TRIM_CELLS.some((cell) => Math.abs(cell.col - pos.col) + Math.abs(cell.row - pos.row) <= 1);
}
function uiOnMove(info) {
const app = info.app;
const state = uiLiveState(app,uiRewardOf);
if (!state) return;
const declined = state.declined;
if (declined && !uiAtBench(app.game.avatar.pos)) state.declined = false;
uiYield(app,state);
if (uiFinaleBusy(app.game) || uiCovered(app)) return;
const game = app.game;
if (state.busy || !refactorDue(game.progress.won,game.ext,game.save) || (rewardDue(game.ext,game.save) && !declined)) return;
uiTellInBackground(state,() => uiAnnounceRefactor(app));
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
function uiInstallReward(app) {
const game = app.game;
game.reward = uiSceneState(game);
uiWrapPaint(game);
uiHookBench('reward',uiOnBump,uiOnMove);
}

function uiRewardEnter(app) {
uiLetGo(uiRewardOf(app.game));
}

export { uiInstallReward,uiRewardEnter,uiCovered,uiFinaleBusy,uiFinaleYields,uiAtBench };
