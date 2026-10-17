import { withBeat } from '../game/ext/ops.js';
import { drawerReady,refactorDue } from '../game/finale/refactor.js';
import { rewardDue } from '../game/finale/reward.js';
import { applyMonoDeque,createMonoDeque,monoDequeMistake } from '../game/fusion/mono-deque.js';
import { LIT_BEAT,LIT_LINES,OFFER_ID,OFFER_LINES,monoDequeDue,trialClear,trialOutcome,trialReady,trialView } from '../game/fusion/mono-deque-trial.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiCue } from './audio-wire.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiPaintMonoDeque } from './grid-mono-deque-draw.js';
import { uiHangKernel } from './grid-kernel-chips.js';
import { LET_GO_ID,uiAwaitChip,uiBenchBumped,uiExclusive,uiHookBench,uiLetGo,uiLiveState,uiReleaseStrip,uiSceneState,uiTellInBackground } from './grid-scene-strip.js';
import { uiSay } from './grid-kernel-common.js';
import { uiAtBench,uiCovered,uiFinaleBusy,uiFinaleYields } from './grid-reward.js';
import { uiStoryChoice } from './story-dialogue.js';


const LET_GO = { id:LET_GO_ID,label:'LET GO',aria:'Let go of the trial. Nothing is lost, you can come back',tone:'warn' };
const CHIP_PREFIX = 'move-';

function uiStateOf(game) {
return game.monoDeque && game.monoDeque.gen === game.gen ? game.monoDeque :null;
}
function uiLive(app) {
return Boolean(uiLiveState(app,uiStateOf));
}
function uiBenchTaken(game) {
const { ext,progress,save } = game;
return Boolean(game.reward && game.reward.busy) || rewardDue(ext,save) || refactorDue(progress.won,ext,save) || drawerReady(progress.won,ext,save);
}
async function uiPress(app,state) {
const view = trialView(state.run);
const pick = await uiAwaitChip(app,state,{ ...view,chips:[...view.chips,LET_GO] });
if (pick === LET_GO.id) return false;
const out = applyMonoDeque(state.run,pick.slice(CHIP_PREFIX.length));
state.run = out.state;
if (out.note) uiSay(app,out.note,monoDequeMistake(out.kind) ? 'warn' :'info');
return true;
}
async function uiRun(app,state) {
const gen = app.game.gen;
while (state.run.status === 'running') {
if (!await uiPress(app,state) || app.game.gen !== gen) return null;
}
return state.run;
}
async function uiPlay(app,state) {
const ui = uiHangKernel(app);
state.ui = ui;
state.run = createMonoDeque();
ui.paint = (ctx,frame) => uiPaintMonoDeque(ctx,frame,state.run);
try {
return await uiRun(app,state);
} finally {
ui.paint = null;
uiReleaseStrip(app,state,ui);
}
}
async function uiSettle(app,run) {
const gen = app.game.gen;
const outcome = trialOutcome(run);
const { uiPayRank } = await import('./rank-pay.js');
await uiPayRank(app,outcome.source,outcome.rank);
if (app.game.gen !== gen) return;
uiCommitExt(app,trialClear(app.game.ext));
uiCue(app,'FUSION');
for (const text of outcome.lines) await uiCastSay(app,{ text,kind:'reward' });
}
function uiTrialScene(app) {
const state = uiStateOf(app.game);
const gen = app.game.gen;
return uiExclusive(state,async function () {
const pick = await uiStoryChoice(app,{ id:OFFER_ID,lines:OFFER_LINES,choices:[{ id:'go',label:'TRY IT' },{ id:'later',label:'NOT NOW',default:true }] });
if (app.game.gen !== gen) return;
if (pick !== 'go') state.declined = true;
const game = app.game;
if (pick !== 'go' || uiFinaleBusy(game) || !trialReady(game.progress.won,game.ext,game.save)) return;
const run = await uiPlay(app,state);
if (run) await uiSettle(app,run);
});
}
async function uiAnnounce(app) {
uiCommitExt(app,withBeat(app.game.ext,LIT_BEAT));
for (const text of LIT_LINES) await uiCastSay(app,{ text,kind:'reward' });
}
function uiIdle(app) {
return uiLive(app) && !uiFinaleBusy(app.game) && !uiCovered(app) && !uiStateOf(app.game).busy && !uiBenchTaken(app.game);
}
function uiOnBump(payload) {
const app = uiBenchBumped(payload);
if (!app || !uiIdle(app)) return;
const game = app.game;
const state = uiStateOf(game);
if (monoDequeDue(game.progress.won,game.ext,game.save)) {
uiTellInBackground(state,() => uiAnnounce(app));
} else if (trialReady(game.progress.won,game.ext,game.save) && !state.declined) uiTrialScene(app).catch(console.error);
}
function uiOnMove(info) {
const app = info.app;
const state = uiLiveState(app,uiStateOf);
if (!state) return;
if (state.cancel && uiFinaleYields(app.game)) state.cancel();
if (state.declined && !uiAtBench(app.game.avatar.pos)) state.declined = false;
if (!uiIdle(app)) return;
const game = app.game;
if (!monoDequeDue(game.progress.won,game.ext,game.save)) return;
uiTellInBackground(state,() => uiAnnounce(app));
}
function uiInstallMonoDeque(app) {
app.game.monoDeque = uiSceneState(app.game);
uiHookBench('mono-deque',uiOnBump,uiOnMove);
}

function uiMonoDequeEnter(app) {
const state = uiStateOf(app.game);
uiLetGo(state);
if (state) state.declined = false;
}

export { uiInstallMonoDeque,uiMonoDequeEnter };
