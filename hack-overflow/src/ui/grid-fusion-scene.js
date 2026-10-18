import { hasFind,withBeat } from '../game/ext/ops.js';
import { drawerReady,refactorDue } from '../game/finale/refactor.js';
import { rewardDue } from '../game/finale/reward.js';
import { MACHINES } from '../game/fusion/machines.js';
import { fusionCard } from '../game/fusion/result.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiCue } from './audio-wire.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiCommitExt } from './ext-storage.js';
import { uiSay } from './grid-kernel-common.js';
import { uiHangKernel } from './grid-kernel-chips.js';
import { uiCovered,uiFinaleBusy,uiFinaleYields } from './grid-reward.js';
import { LET_GO_ID,uiBenchBumped,uiExclusive,uiHookBench,uiLetGo,uiLiveState,uiParked,uiReleaseStrip,uiSceneState,uiTellInBackground } from './grid-scene-strip.js';
import { uiShowToast } from './grid-toast.js';


const LET_GO = { id:LET_GO_ID,label:'LET GO',aria:'Let go of the trial. Nothing is lost, you can come back',tone:'warn' };
const CHIP_PREFIX = 'move-';
const AUTO_PAUSE = 'auto-pause';
const AUTO_MANUAL = 'auto-manual';
const uiAutoPref = { manual:false };
const floors = new WeakMap();

function uiStateOf(fusion,game) {
return game[fusion.key] && game[fusion.key].gen === game.gen ? game[fusion.key] :null;
}
function uiMachineOf(fusion) {
return MACHINES.find((machine) => machine.id === fusion.hook);
}
function uiBenchTaken(game) {
const { ext,progress,save } = game;
return Boolean(game.reward && game.reward.busy) || rewardDue(ext,save) || refactorDue(progress.won,ext,save) || drawerReady(progress.won,ext,save);
}
function uiRulesNote(fusion,state) {
return state.run.moves === 0 && !hasFind(state.app.game.ext,fusion.trial.CLEAR_FIND) ? fusion.trial.OFFER_LINES.map((line) => line.text).join(' ') :'';
}
function uiAutoChips(state) {
const view = state.auto.snapshot();
const pause = { id:AUTO_PAUSE,label:view.state === 'paused' ? 'RESUME' :'PAUSE',aria:'Pause or resume the automatic moves',run:() => state.auto.togglePause() };
const manual = { id:AUTO_MANUAL,label:view.manual ? 'AUTO' :'MANUAL',aria:view.manual ? 'Let the machine take the forced moves' :'Do every move yourself, no automatic moves',run:() => state.auto.setManual(!view.manual) };
return [pause,manual];
}
function uiAutoTele(state) {
const view = state.auto.snapshot();
if (view.manual) return 'MANUAL: every move is yours';
return view.state === 'running' ? 'AUTO: the machine takes the forced moves' :'YOUR CALL';
}
function uiViewOf(fusion,state) {
const view = fusion.trial.trialView(state.run);
const autoOn = Boolean(state.auto) && fusion.auto.ready(state.run);
const moves = view.chips.map((chip) => ({ ...chip,run:() => state.pick(chip.id) }));
return {
...view,
tele:autoOn ? uiAutoTele(state) :view.tele,
note:uiRulesNote(fusion,state) || view.note,
chips:[...moves,...(autoOn ? uiAutoChips(state) :[]),{ ...LET_GO,run:() => state.pick(LET_GO_ID) }],
};
}
function uiMachineWalking(state) {
return Boolean(state.auto) && state.auto.snapshot().state === 'running';
}
function uiAwaitMove(fusion,app,state) {
const gen = app.game.gen;
return new Promise(function (resolve) {
state.cancel = () => resolve(LET_GO_ID);
state.finish = () => resolve(null);
state.pick = (id) => { if (app.game.gen === gen && !uiParked(app) && !uiMachineWalking(state)) resolve(id); };
state.ui.view = () => uiViewOf(fusion,state);
uiRenderKeepingFocus(app);
});
}
function uiApply(state,move) {
const out = state.fusion.rules.apply(state.run,move);
state.run = out.state;
const wrong = state.fusion.rules.mistake(out.kind);
if (wrong) state.mistakes.push(out.kind);
return { out,wrong };
}
function uiPress(state,pick) {
const { out,wrong } = uiApply(state,pick.slice(CHIP_PREFIX.length));
state.called += 1;
if (out.note) uiSay(state.app,out.note,wrong ? 'warn' :'info');
}
function uiMachineMove(fusion,app,state) {
if (uiParked(app) || !state.auto) return false;
const move = fusion.auto.forced(state.run);
if (!move) return false;
const { out } = uiApply(state,move);
state.machine += 1;
state.said = out.note;
if (state.run.status !== 'running') state.finish();
else uiRenderKeepingFocus(app);
return true;
}
function uiAutoStopped(app,state) {
if (state.said) uiSay(app,state.said,'info');
state.said = '';
uiRenderKeepingFocus(app);
}
async function uiAttachAuto(fusion,app,state) {
const { runToDecision } = await import('./auto-run.js');
state.auto = runToDecision({
step:() => uiMachineMove(fusion,app,state),
isForced:() => state.run.status === 'running' && fusion.auto.ready(state.run) && fusion.auto.forced(state.run) !== null,
onDecision:() => uiAutoStopped(app,state),
isManual:() => uiAutoPref.manual,
onManualChange:(manual) => { uiAutoPref.manual = manual; },
onChange:() => { if (state.auto) uiRenderKeepingFocus(app); },
});
}
async function uiRun(fusion,app,state) {
const gen = app.game.gen;
while (state.run.status === 'running') {
const pick = await uiAwaitMove(fusion,app,state);
if (app.game.gen !== gen || pick === LET_GO_ID) return null;
if (pick === null) continue;
uiPress(state,pick);
if (state.auto) state.auto.go();
}
return state.run;
}
async function uiPlay(fusion,app,state) {
const ui = uiHangKernel(app);
Object.assign(state,{ ui,app,run:fusion.rules.create(),mistakes:[],called:0,machine:0,said:'',auto:null });
ui.paint = (ctx,frame) => fusion.paint(ctx,{ ...frame,floor:true },state.run);
try {
if (fusion.auto) await uiAttachAuto(fusion,app,state);
return await uiRun(fusion,app,state);
} finally {
const auto = state.auto;
state.auto = null;
if (auto) auto.destroy();
ui.paint = null;
uiReleaseStrip(app,state,ui);
}
}
async function uiPay(fusion,app,outcome) {
const gen = app.game.gen;
const { uiPayRank } = await import('./rank-pay.js');
const paid = await uiPayRank(app,outcome.source,outcome.rank);
if (app.game.gen !== gen) return false;
uiCommitExt(app,fusion.trial.trialClear(app.game.ext));
return paid.paid;
}
function uiCardOf(state,outcome,paid) {
const fusion = state.fusion;
const machine = uiMachineOf(fusion);
return fusionCard({
id:'fusion-' + fusion.hook,title:machine.name,run:state.run,par:fusion.rules.par(),bruteLabel:outcome.lines[1],bruteCount:fusion.rules.brute(),
kinds:state.mistakes,names:fusion.trial.MISTAKE_NAMES,rank:outcome.rank,paid,called:fusion.auto ? state.called :null,machine:fusion.auto ? state.machine :null,
});
}
async function uiSettle(fusion,app,state) {
const gen = app.game.gen;
const outcome = fusion.trial.trialOutcome(state.run);
const paid = await uiPay(fusion,app,outcome);
if (app.game.gen !== gen) return 'done';
uiCue(app,'FUSION');
const card = await import('./grid-result-card.js');
state.carded = true;
try {
return await card.uiShowResultCard(app,uiCardOf(state,outcome,paid));
} finally {
state.carded = false;
}
}
async function uiTrialLoop(fusion,app,state) {
const gen = app.game.gen;
app.game.camHold = uiMachineOf(fusion).hold;
try {
for (let again = true; again && app.game.gen === gen;) {
const run = await uiPlay(fusion,app,state);
state.run = run;
again = Boolean(run) && (await uiSettle(fusion,app,state)) === 'replay';
state.run = null;
}
} finally {
if (app.game.gen === gen) app.game.camHold = null;
}
}
function uiStartTrial(fusion,app) {
const state = uiStateOf(fusion,app.game);
if (!state) return Promise.resolve();
Object.assign(state,{ fusion,app });
return uiExclusive(state,async function () {
const game = app.game;
if (uiFinaleBusy(game) || !fusion.trial.machineOpen(game.progress.won,game.ext,game.save)) return;
await uiTrialLoop(fusion,app,state);
});
}
async function uiAnnounce(fusion,app) {
uiCommitExt(app,withBeat(app.game.ext,fusion.trial.LIT_BEAT));
for (const text of fusion.trial.LIT_LINES) await uiCastSay(app,{ text,kind:'reward' });
}
function uiIdle(fusion,app) {
const state = uiLiveState(app,(game) => uiStateOf(fusion,game));
return Boolean(state) && !uiFinaleBusy(app.game) && !uiCovered(app) && !state.busy && !uiBenchTaken(app.game);
}
function uiOnPad(fusion,pos) {
const pad = uiMachineOf(fusion).pad;
return pos.col === pad.col && pos.row === pad.row;
}
function uiOpenOnes(game) {
const floor = floors.get(game);
return floor ? floor.fusions.filter((one) => one.trial.machineOpen(game.progress.won,game.ext,game.save)) :[];
}
function uiOnBump(fusion,payload) {
const app = uiBenchBumped(payload);
if (!app || !uiIdle(fusion,app)) return;
const floor = floors.get(app.game);
if (!floor || floor.heard === payload) return;
floor.heard = payload;
const open = uiOpenOnes(app.game);
if (open.length === 0 || uiBenchTaken(app.game)) return;
const names = open.map((one) => uiMachineOf(one).name).join(', ');
uiShowToast(app,{ text:'PATCH: ' + names + ' stand' + (open.length === 1 ? 's' :'') + ' lit on the floor. Step on the glowing tile.',kind:'info' });
}
function uiCrossing(game) {
const plan = game.walk && game.walk.plan;
return Boolean(plan) && plan.dirs.length > 0;
}
function uiRecheck(app) {
const floor = floors.get(app.game);
const gen = app.game.gen;
window.setTimeout(function () {
if (floor && app.game.gen === gen) floor.fusions.forEach((one) => uiOnMove(one,{ app }));
},0);
}
function uiOnMove(fusion,info) {
const app = info.app;
const state = uiLiveState(app,(game) => uiStateOf(fusion,game));
if (!state) return;
if (state.cancel && uiFinaleYields(app.game)) state.cancel();
if (!uiIdle(fusion,app)) return;
const game = app.game;
if (fusion.trial.due(game.progress.won,game.ext,game.save)) {
uiTellInBackground(state,async () => {
await uiAnnounce(fusion,app);
uiRecheck(app);
});
return;
}
const pos = info.pos || game.avatar.pos;
if (uiCrossing(game)) return;
if (uiOnPad(fusion,pos) && fusion.trial.machineOpen(game.progress.won,game.ext,game.save)) uiStartTrial(fusion,app).catch(console.error);
}
function uiWrapFloor(game,floor) {
const inner = game.drawCast;
let draw = null;
import('./grid-fusion-floor.js').then(function (module) { draw = module.uiPaintFusionFloor; }).catch(console.error);
game.drawCast = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
if (draw) draw(ctx,frame,uiPlates(app,floor));
};
}
function uiPlateStatus(fusion,game) {
const state = uiStateOf(fusion,game);
if (state && state.busy && state.run) return 'playing';
return hasFind(game.ext,fusion.trial.CLEAR_FIND) ? 'cleared' :'new';
}
function uiPlates(app,floor) {
const game = app.game;
if (app.screen !== 'grid' || !game.ext || !game.progress || uiFinaleBusy(game)) return [];
const open = floor.fusions.filter((one) => one.trial.machineOpen(game.progress.won,game.ext,game.save));
const plates = open.map((one) => ({ ...uiMachineOf(one),status:uiPlateStatus(one,game) }));
const playing = plates.filter((plate) => plate.status === 'playing');
return playing.length > 0 ? playing :plates;
}
function uiInstallFusion(fusion,app) {
const game = app.game;
game[fusion.key] = uiSceneState(game);
let floor = floors.get(game);
if (!floor) {
floor = { fusions:[],heard:null };
floors.set(game,floor);
uiWrapFloor(game,floor);
}
floor.fusions.push(fusion);
uiHookBench(fusion.hook,(payload) => uiOnBump(fusion,payload),(info) => uiOnMove(fusion,info));
}
function uiFusionEnter(fusion,app) {
const state = uiStateOf(fusion,app.game);
uiLetGo(state);
if (!state || !state.carded) return;
import('./grid-result-card.js').then((card) => card.uiCloseResultCard(app,'done')).catch(console.error);
}
function uiFusionBusy(fusion,game) {
const state = uiStateOf(fusion,game);
return Boolean(state && state.busy);
}

export { uiFusionBusy,uiFusionEnter,uiInstallFusion };
