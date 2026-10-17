import { withBeat } from '../game/ext/ops.js';
import { drawerReady,refactorDue } from '../game/finale/refactor.js';
import { rewardDue } from '../game/finale/reward.js';
import { uiCue } from './audio-wire.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiHangKernel } from './grid-kernel-chips.js';
import { uiSay } from './grid-kernel-common.js';
import { uiAtBench,uiCovered,uiFinaleBusy,uiFinaleYields } from './grid-reward.js';
import { LET_GO_ID,uiAwaitChip,uiBenchBumped,uiExclusive,uiHookBench,uiLetGo,uiLiveState,uiReleaseStrip,uiSceneState,uiTellInBackground } from './grid-scene-strip.js';
import { uiStoryChoice } from './story-dialogue.js';


const LET_GO = { id:LET_GO_ID,label:'LET GO',aria:'Let go of the trial. Nothing is lost, you can come back',tone:'warn' };
const CHIP_PREFIX = 'move-';

function uiStateOf(fusion,game) {
return game[fusion.key] && game[fusion.key].gen === game.gen ? game[fusion.key] :null;
}
function uiBenchTaken(fusion,game) {
const { ext,progress,save } = game;
return Boolean(game.reward && game.reward.busy) || rewardDue(ext,save) || refactorDue(progress.won,ext,save) || drawerReady(progress.won,ext,save) || fusion.others(game);
}
async function uiPress(fusion,app,state) {
const view = fusion.trial.trialView(state.run);
const pick = await uiAwaitChip(app,state,{ ...view,chips:[...view.chips,LET_GO] });
if (pick === LET_GO.id) return false;
const out = fusion.rules.apply(state.run,pick.slice(CHIP_PREFIX.length));
state.run = out.state;
if (out.note) uiSay(app,out.note,fusion.rules.mistake(out.kind) ? 'warn' :'info');
return true;
}
async function uiRun(fusion,app,state) {
const gen = app.game.gen;
while (state.run.status === 'running') {
if (!await uiPress(fusion,app,state) || app.game.gen !== gen) return null;
}
return state.run;
}
async function uiPlay(fusion,app,state) {
const ui = uiHangKernel(app);
state.ui = ui;
state.run = fusion.rules.create();
ui.paint = (ctx,frame) => fusion.paint(ctx,frame,state.run);
try {
return await uiRun(fusion,app,state);
} finally {
ui.paint = null;
uiReleaseStrip(app,state,ui);
}
}
async function uiSettle(fusion,app,run) {
const gen = app.game.gen;
const outcome = fusion.trial.trialOutcome(run);
const { uiPayRank } = await import('./rank-pay.js');
await uiPayRank(app,outcome.source,outcome.rank);
if (app.game.gen !== gen) return;
uiCommitExt(app,fusion.trial.trialClear(app.game.ext));
uiCue(app,'FUSION');
for (const text of outcome.lines) await uiCastSay(app,{ text,kind:'reward' });
}
function uiTrialScene(fusion,app) {
const state = uiStateOf(fusion,app.game);
const gen = app.game.gen;
return uiExclusive(state,async function () {
const pick = await uiStoryChoice(app,{ id:fusion.trial.OFFER_ID,lines:fusion.trial.OFFER_LINES,choices:[{ id:'go',label:'TRY IT' },{ id:'later',label:'NOT NOW',default:true }] });
if (app.game.gen !== gen) return;
if (pick !== 'go') state.declined = true;
const game = app.game;
if (pick !== 'go' || uiFinaleBusy(game) || !fusion.trial.trialReady(game.progress.won,game.ext,game.save)) return;
const run = await uiPlay(fusion,app,state);
if (run) await uiSettle(fusion,app,run);
});
}
async function uiAnnounce(fusion,app) {
uiCommitExt(app,withBeat(app.game.ext,fusion.trial.LIT_BEAT));
for (const text of fusion.trial.LIT_LINES) await uiCastSay(app,{ text,kind:'reward' });
}
function uiIdle(fusion,app) {
const state = uiLiveState(app,(game) => uiStateOf(fusion,game));
return Boolean(state) && !uiFinaleBusy(app.game) && !uiCovered(app) && !state.busy && !uiBenchTaken(fusion,app.game);
}
function uiOnBump(fusion,payload) {
const app = uiBenchBumped(payload);
if (!app || !uiIdle(fusion,app)) return;
const game = app.game;
const state = uiStateOf(fusion,game);
if (fusion.trial.due(game.progress.won,game.ext,game.save)) {
uiTellInBackground(state,() => uiAnnounce(fusion,app));
} else if (fusion.trial.trialReady(game.progress.won,game.ext,game.save) && !state.declined) uiTrialScene(fusion,app).catch(console.error);
}
function uiOnMove(fusion,info) {
const app = info.app;
const state = uiLiveState(app,(game) => uiStateOf(fusion,game));
if (!state) return;
if (state.cancel && uiFinaleYields(app.game)) state.cancel();
if (state.declined && !uiAtBench(app.game.avatar.pos)) state.declined = false;
if (!uiIdle(fusion,app)) return;
const game = app.game;
if (!fusion.trial.due(game.progress.won,game.ext,game.save)) return;
uiTellInBackground(state,() => uiAnnounce(fusion,app));
}
function uiInstallFusion(fusion,app) {
app.game[fusion.key] = uiSceneState(app.game);
uiHookBench(fusion.hook,(payload) => uiOnBump(fusion,payload),(info) => uiOnMove(fusion,info));
}
function uiFusionEnter(fusion,app) {
const state = uiStateOf(fusion,app.game);
uiLetGo(state);
if (state) state.declined = false;
}
function uiFusionBusy(fusion,game) {
const state = uiStateOf(fusion,game);
const { ext,progress,save } = game;
return Boolean(state && (state.busy || (!state.declined && (fusion.trial.due(progress.won,ext,save) || fusion.trial.trialReady(progress.won,ext,save)))));
}

export { uiFusionBusy,uiFusionEnter,uiInstallFusion };
