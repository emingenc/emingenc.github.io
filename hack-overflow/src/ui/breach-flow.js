import { starsFor } from '../logic/index.js';
import { testCounts } from '../judge/counts.js';
import { GAME_EVENT } from '../game/game-events.js';
import { newLockRun, lockHistory } from '../game/lock-run.js';
import { createTrace } from '../game/trace.js';
import { breachStep } from '../game/breach.js';
import { anyExploitUsed } from '../game/exploits.js';
import { PIN_TIMING } from '../game/pins.js';
import { recordBreach, withPending, bumpEntry, bumpStat } from '../game/save.js';
import { coreState, unlocksBetween } from '../game/progress.js';
import { lockName } from '../game/messages.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiEmit } from './bus.js';
import { uiCommitSave } from './game-state.js';
import { uiRenderApp } from './app.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { UI_ONBOARD_STAGE_RULE } from './onboarding.js';
import { UI_LOCK_HEADING_KEY } from './render-lock-left.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiOpenDebriefLoaded,uiPrefetchDebrief } from './debrief-loader.js';
import { uiOpenTraced } from './screen-traced.js';

const UI_DEBRIEF_SHEETS = ['styles/lazy/debrief.css','styles/lazy/levelup.css'];
const UI_STATEMENT_OPEN_LOCKS = 2;
function uiPinCount(game,key) {
return testCounts(game.catalog.problemByKey.get(key).cases).total + 1;
}
function uiJackIn(app,key) {
const game = app.game;
uiLinkStyles(UI_DEBRIEF_SHEETS);
uiPrefetchDebrief().catch(function () {});
const pending = Object.hasOwn(game.save.pending,key) ? game.save.pending[key] :null;
const attempt = game.save.entries[key] || 0;
app.run = newLockRun(game.catalog,{ key,attempt,history:pending });
const trace = createTrace(game.progress.capacity,pending ? pending.trace :0);
const used = pending && pending.used ? { ...pending.used } :{};
const known = game.progress.breached.has(key);
game.breach = {
key,attempt,level:game.progress.level,trace,used,known,pinCount:uiPinCount(game,key),anim:null,timers:[],verdicts:new Map(),note:null,
};
Object.assign(game,{ revealing:false,traced:null,outcome:null,travelOpen:false });
game.walk.plan = null;
uiWalkReleaseAll(app);
Object.assign(app,{ trayFocusIndex:0,lastPanelKind:null,probedLine:null,statementOpen:game.progress.breached.size < UI_STATEMENT_OPEN_LOCKS,screen:'breach',lastFocusKey:UI_LOCK_HEADING_KEY });
if (app.onboardStage === UI_ONBOARD_STAGE_RULE) app.onboardStage = null;
uiEmit(GAME_EVENT.JACK_IN,{ key,lockName:lockName(key) });
}
function uiClearBreachTimers(app) {
const breach = app.game.breach;
if (!breach) return;
breach.timers.forEach(function (timer) { window.clearTimeout(timer); });
breach.timers = [];
}
function uiLeaveBreach(app) {
uiClearBreachTimers(app);
Object.assign(app.game,{ breach:null,revealing:false });
app.run = null;
}
function uiDisconnect(app) {
const key = app.game.breach ? app.game.breach.key :null;
uiLeaveBreach(app);
if (key) uiEmit(GAME_EVENT.DISCONNECT,{ key });
uiEnterGrid(app);
}
function uiLater(app,delayMs,callback) {
app.game.breach.timers.push(window.setTimeout(callback,delayMs));
}
function uiScheduleEvents(app,events) {
events.forEach(function (event) {
if (event.atMs > 0) uiLater(app,event.atMs,function () { uiEmit(event.type,event.payload); });
else uiEmit(event.type,event.payload);
});
}
function uiFinishBreach(app,open,info) {
uiLeaveBreach(app);
app.menuOpen = false;
const opening = open(app,info);
uiRenderApp(app);
if (opening) opening.then(function () { uiRenderApp(app); },function () {});
}
function uiPendingSave(app,run) {
return withPending(app.game.save,app.game.breach.key,uiPendingRecord(app,run));
}
function uiPendingRecord(app,run) {
const breach = app.game.breach;
return { ...lockHistory(run),trace:breach.trace.filled,used:{ ...breach.used } };
}
function uiStoreExploitUse(app) {
uiCommitSave(app,uiPendingSave(app,app.run));
}
function uiOnQuiet(app,info) {
if (info.actionId !== 'show-line') return;
uiCommitSave(app,uiPendingSave(app,info.run));
uiEmit(GAME_EVENT.SHOW_LINE,{ key:app.game.breach.key });
}
function uiOnProbe(app,info) {
uiCommitSave(app,bumpStat(uiPendingSave(app,info.run),'probes'));
}
function uiOnFail(app,info) {
if (info.free) return;
uiCommitSave(app,bumpStat(uiPendingSave(app,info.run),'fails'));
}
function uiTracedInfo(key,history) {
return { key,lockName:lockName(key),failed:history.submitted.length,revealed:history.revealed,visibleFails:history.visibleFails,
maxStars:starsFor(history.submitted,history.revealed) };
}
function uiOnTraced(app,info) {
const game = app.game;
const key = game.breach.key;
const history = lockHistory(info.run);
const save = withPending(game.save,key,{ ...history,trace:0,used:{} });
uiCommitSave(app,bumpStat(bumpStat(bumpEntry(save,key),'fails'),'traced'));
game.revealing = true;
uiLater(app,info.step.plan.durationMs + PIN_TIMING.tracedHoldMs,function () {
uiFinishBreach(app,uiOpenTraced,uiTracedInfo(key,history));
});
}
function uiOutcome(app,parts) {
const problem = app.game.world.problems[parts.key];
const record = parts.record;
return {
key:parts.key,lockName:lockName(parts.key),number:problem.number,name:problem.name,family:problem.family,
difficulty:problem.difficulty,stars:parts.stars,rawStars:parts.rawStars,capped:parts.stars < parts.rawStars,
acceptedText:parts.acceptedText,exploitUsed:anyExploitUsed(app.game.breach.used),
gained:record.gained,xpBefore:record.xpBefore,xpAfter:record.save.xp,levelBefore:record.levelBefore,
levelAfter:record.levelAfter,replay:record.replay,bestBefore:record.bestBefore,
unlocks:unlocksBetween(record.levelBefore,record.levelAfter),sectorDone:coreState(app.game.world,app.game.progress,problem.family) === 'ready',
};
}
function uiOnAccepted(app,info) {
const game = app.game;
const key = game.breach.key;
const stars = info.step.stars;
const record = recordBreach(game.save,{ key,difficulty:game.world.problems[key].difficulty,stars });
uiCommitSave(app,bumpEntry(withPending(record.save,key,null),key));
game.revealing = true;
game.outcome = uiOutcome(app,{ key,record,stars,rawStars:info.run.lock.stars,acceptedText:info.run.lock.acceptedText });
uiLater(app,info.step.plan.durationMs,function () { uiFinishBreach(app,uiOpenDebriefLoaded,null); });
}
const UI_OUTCOME_HANDLERS = { none:uiOnQuiet,probe:uiOnProbe,fail:uiOnFail,traced:uiOnTraced,accepted:uiOnAccepted };
function uiNoBreachYet(stats) {
return stats.fails === 0 && stats.breaches === 0;
}
function uiVerdictNote(ctx) {
if (ctx.free) return 'replay';
return ctx.mercy ? 'mercy' :null;
}
function uiAfterBreachAction(app,ctx,nextRun) {
const breach = app.game.breach;
if (!breach) return;
if (ctx.actionId === 'run') app.probedLine = nextRun.lock.line.join();
const change = { before:ctx.previousRun,after:nextRun,actionId:ctx.actionId };
const first = ctx.actionId === 'submit' && uiNoBreachYet(app.game.save.stats);
const step = breachStep(change,{
trace:breach.trace,used:breach.used,pinCount:breach.pinCount,reducedMotion:uiPrefersReducedMotion(),stretch:first,free:ctx.free,
});
breach.trace = step.trace;
if (ctx.actionId === 'run' || ctx.actionId === 'submit') breach.note = uiVerdictNote(ctx);
if (step.plan) breach.anim = { kind:step.outcome,plan:step.plan,startedAt:performance.now() };
uiScheduleEvents(app,step.events);
UI_OUTCOME_HANDLERS[step.outcome](app,{ step,run:nextRun,actionId:ctx.actionId,free:ctx.free });
}

export { uiNoBreachYet, uiJackIn, uiAfterBreachAction, uiClearBreachTimers, uiLeaveBreach, uiDisconnect, uiStoreExploitUse };
