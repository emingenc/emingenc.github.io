import { PATCH_CELL } from '../game/cast/patch.js';
import { withBeat } from '../game/ext/ops.js';
import { withTag } from '../game/ext/power-ops.js';
import { roadBackDue,skipOrdeal } from '../game/finale/contract.js';
import { MILESTONE_LINES,THRESHOLD,inSafehouse,journeyFacts,milestoneDue,thresholdPlan } from '../game/quest/journey.js';
import { ordealDue } from '../game/quest/milestones.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastSay } from './grid-cast-act.js';
import { uiGatePillText,uiRefreshPill } from './rank-hud.js';

let uiHooked = false;
const NO_FACTS = Object.freeze({ solved:[],roomsWon:[] });
const MILESTONE_EFFECTS = { m5:(ext) => withTag(ext,'patch-0',PATCH_CELL) };
const FINALE_RUNS = {
ordeal:() => import('./grid-ordeal.js').then((module) => module.uiStartOrdeal),
kernel:() => import('./grid-kernel.js').then((module) => module.uiKernelRun),
};

function uiJourneyOf(game) {
if (!game.journey) game.journey = { before:null,inside:false,played:false,gate:null,finale:false };
return game.journey;
}
function uiLive(app) {
return app.screen === 'grid' && Boolean(app.game) && Boolean(app.game.journey) && Boolean(app.game.ext) && Boolean(app.game.progress);
}
function uiLastLook(state,facts) {
const before = state.before;
const shrunk = before && (facts.solved.length < before.solved.length || facts.roomsWon.length < before.roomsWon.length);
return shrunk ? NO_FACTS :before;
}
function uiThreshold(app,facts) {
const game = app.game;
const state = game.journey;
const plan = thresholdPlan(facts,uiLastLook(state,facts),game.ext.beats || []);
state.before = { solved:facts.solved,roomsWon:facts.roomsWon };
if (!plan.write) return;
uiCommitExt(app,withBeat(game.ext,THRESHOLD));
if (plan.text) uiCastSay(app,{ text:plan.text,kind:'reward' }).catch(console.error);
}
async function uiPlayMilestone(app,id) {
const effect = MILESTONE_EFFECTS[id] || ((ext) => ext);
uiCommitExt(app,effect(withBeat(app.game.ext,id)));
for (const text of MILESTONE_LINES[id]) await uiCastSay(app,{ text,kind:'info' });
}
function uiVisit(app,facts) {
const state = app.game.journey;
if (!inSafehouse(app.game.avatar.pos)) { state.played = false; return; }
if (state.played || app.story) return;
const id = milestoneDue(facts,app.game.ext.beats || []);
if (!id) return;
state.played = true;
uiPlayMilestone(app,id).catch(console.error);
}
function uiGate(app) {
const state = app.game.journey;
const text = uiGatePillText(app.game);
if (text === state.gate) return;
state.gate = text;
uiRefreshPill(app).catch(console.error);
}
function uiRunFinale(app,name) {
const state = app.game.journey;
state.finale = true;
FINALE_RUNS[name]().then((run) => run(app)).catch(console.error).finally(() => { state.finale = false; });
}
function uiFinale(app,facts) {
const game = app.game;
if (game.save.ended || game.journey.finale || app.story || app.menuOpen) return;
const left = game.progress.left;
if (ordealDue(facts,game.ext.beats || [])) {
if (left > 0) return uiRunFinale(app,'ordeal');
uiCommitExt(app,skipOrdeal(game.ext));
}
if (roadBackDue(game.ext,left,game.save)) uiRunFinale(app,'kernel');
}
function uiOnMove(info) {
const app = info.app;
if (!uiLive(app)) return;
const facts = journeyFacts(app.game.world,app.game.progress);
uiThreshold(app,facts);
uiVisit(app,facts);
uiFinale(app,facts);
uiGate(app);
}
function uiHook() {
if (uiHooked) return;
uiHooked = true;
uiGridHook('enter-cell',uiOnMove);
uiGridHook('step',uiOnMove);
}

function uiStartJourney(app) {
uiJourneyOf(app.game);
uiHook();
uiOnMove({ app });
return app;
}

export { uiStartJourney };
