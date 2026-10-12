import { PATCH_CELL } from '../game/cast/patch.js';
import { withBeat } from '../game/ext/ops.js';
import { withTag } from '../game/ext/power-ops.js';
import { roadBackDue,skipOrdeal } from '../game/finale/contract.js';
import { inRing } from '../game/finale/roadback.js';
import { MILESTONE_LINES,THRESHOLD,inSafehouse,journeyFacts,thresholdPlan } from '../game/quest/journey.js';
import { ordealDue } from '../game/quest/milestones.js';
import { TAIL_BEAT,owedMilestones,tailPlan } from '../game/story/catchup.js';
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
function uiWriteMilestones(app,ids) {
const told = ids.reduce((ext,id) => (MILESTONE_EFFECTS[id] || ((same) => same))(withBeat(ext,id)),app.game.ext);
uiCommitExt(app,told);
}
async function uiPlayMilestone(app,id) {
uiWriteMilestones(app,[id]);
for (const text of MILESTONE_LINES[id]) await uiCastSay(app,{ text,kind:'info' });
}
async function uiPlayCatchup(app,ids,opts) {
uiWriteMilestones(app,ids);
const card = await import('./grid-catchup.js');
await card.uiPlayCard(app,ids,opts);
}
function uiTail(app,facts,before) {
const plan = tailPlan(facts.solved.length,before ? before.solved.length :null,app.game.ext.beats || []);
if (!plan.write) return;
uiCommitExt(app,withBeat(app.game.ext,TAIL_BEAT));
if (plan.text) uiCastSay(app,{ text:plan.text,kind:'reward' }).catch(console.error);
}
function uiOwedAtVisit(app,facts) {
const beats = app.game.ext.beats || [];
const owed = owedMilestones(facts,beats);
if (owed.length === 0 || roadBackDue(app.game.ext,app.game.progress.left,app.game.save)) return null;
if (app.game.progress.left > 0 && ordealDue(facts,beats)) return null;
return owed;
}
function uiVisit(app,facts) {
const state = app.game.journey;
if (!inSafehouse(app.game.avatar.pos)) { state.played = false; return; }
if (state.played || app.story) return;
const owed = uiOwedAtVisit(app,facts);
if (!owed) return;
const card = owed.length > 1 && !app.game.save.ended;
if (inRing(app.game.avatar.pos)) return;
state.played = true;
(card ? uiPlayCatchup(app,owed) :uiPlayMilestone(app,owed[0])).catch(console.error);
}
function uiGate(app) {
const state = app.game.journey;
const text = uiGatePillText(app.game);
if (text === state.gate) return;
state.gate = text;
uiRefreshPill(app).catch(console.error);
}
function uiRunFinale(app,name,before) {
const state = app.game.journey;
state.finale = true;
Promise.resolve(before && before()).then(() => FINALE_RUNS[name]()).then((run) => run(app)).catch(console.error).finally(() => { state.finale = false; });
}
function uiOwedFirst(app,facts) {
const owed = owedMilestones(facts,app.game.ext.beats || []);
if (owed.length === 0 || inRing(app.game.avatar.pos)) return null;
return () => uiPlayCatchup(app,owed,{ settle:true });
}
function uiFinale(app,facts) {
const game = app.game;
if (game.save.ended || game.journey.finale || app.story || app.menuOpen) return;
const left = game.progress.left;
if (ordealDue(facts,game.ext.beats || [])) {
if (left > 0) return uiRunFinale(app,'ordeal');
uiCommitExt(app,skipOrdeal(game.ext));
}
if (roadBackDue(game.ext,left,game.save)) uiRunFinale(app,'kernel',uiOwedFirst(app,facts));
}
function uiOnMove(info) {
const app = info.app;
if (!uiLive(app)) return;
const facts = journeyFacts(app.game.world,app.game.progress);
if (!app.game.save.ended) uiTail(app,facts,uiLastLook(app.game.journey,facts));
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
