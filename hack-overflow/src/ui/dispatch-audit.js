import { ui, uiSyncJudgeDataBadge, uiRenderApp } from './app.js';
import { uiHasOption } from './render-actions.js';
import { uiChipPosition, uiRemovePosition } from './line-actions.js';
import { UI_ONBOARD_STAGE_CHIP, UI_ONBOARD_STAGE_VERDICT, UI_ONBOARD_STAGE_RULE, uiOnboardStage3Message } from './onboarding.js';
import { uiMarkOnboarded } from './storage.js';
import { uiPanelAnnounceText, uiBreachInert } from './render-submit-panel.js';
import { uiAfterBreachAction, uiNoBreachYet } from './breach-flow.js';
import { judgeAct } from './judge-client.js';
import { VERDICT_WORDS } from '../logic/index.js';

const UI_WORKER_ACTION_IDS = { run:1,submit:1 };

function uiActionIsLegal(run,actionId) {
const position = uiRemovePosition(actionId);
if (position !== null) return Boolean(run.lock) && position < run.lock.line.length;
return uiHasOption(ui.audit.view(run),actionId);
}
function uiOnboardChipAdded(app,info) {
if (app.onboardStage !== UI_ONBOARD_STAGE_CHIP) return false;
if (uiChipPosition(info.actionId) === null) return false;
return info.run.lock.line.length > info.beforeLength;
}
function uiOnboardVerdictSubmit(app,info) {
if (info.actionId !== 'submit') return false;
return app.onboardStage === UI_ONBOARD_STAGE_VERDICT || app.onboardStage === UI_ONBOARD_STAGE_RULE;
}
function uiAdvanceOnboarding(app,info) {
if (uiOnboardChipAdded(app,info)) {
app.onboardStage = UI_ONBOARD_STAGE_VERDICT;
} else if (uiOnboardVerdictSubmit(app,info)) {
app.onboardStage = UI_ONBOARD_STAGE_RULE;
app.onboardMessage = uiOnboardStage3Message(info.run.lock.lastSubmit.verdict);
uiMarkOnboarded();
}
}
function uiFocusKeyAfterAction(app,actionId) {
const chipPos = uiChipPosition(actionId);
if (chipPos !== null) return 'chip-' + chipPos;
if (actionId === 'clear' || uiRemovePosition(actionId) !== null) return 'chip-' + app.trayFocusIndex;
return actionId;
}
function uiAnnounceVerdict(app,actionId,run) {
if (actionId !== 'run' && actionId !== 'submit') return;
app.lastPanelKind = actionId;
app.pendingAnnounce = uiPanelAnnounceText(actionId,actionId === 'run' ? run.lock.lastRun :run.lock.lastSubmit);
app.pendingScrollToVerdict = true;
}
function uiLockKeyOf(run) {
return run.lock ? run.lock.key :null;
}
function uiTrayLength(run) {
return run.lock ? run.lock.tray.order.length :0;
}
function uiClampTrayIndex(index,length) {
if (length <= 0) return 0;
if (index < 0) return 0;
return index < length ? index :length - 1;
}
function uiTrayFocusIndexFor(app,chipPos,keys) {
if (chipPos !== null) return chipPos;
const changedLock = keys.next !== null && keys.next !== keys.previous;
const index = changedLock ? 0 :app.trayFocusIndex;
return uiClampTrayIndex(index,keys.trayLength);
}
function uiLineKey(run) {
return run.lock.line.join();
}
function uiReplayedRun(app) {
const breach = app.game.breach;
const cached = breach && breach.verdicts ? breach.verdicts.get(uiLineKey(app.run)) :null;
return cached ? { ...app.run,lock:{ ...app.run.lock,lastSubmit:cached } } :null;
}
function uiMercyApplies(app,lock) {
return uiNoBreachYet(app.game.save.stats) && lock.submitted.length === 1 && lock.lastSubmit.verdict === VERDICT_WORDS.T;
}
function uiKeepFailure(app,ctx,nextRun) {
const lastSubmit = nextRun.lock.lastSubmit;
if (ctx.actionId !== 'submit' || ctx.free || !lastSubmit || lastSubmit.verdict === VERDICT_WORDS.P) return nextRun;
if (app.game.breach.verdicts) app.game.breach.verdicts.set(uiLineKey(nextRun),lastSubmit);
ctx.mercy = uiMercyApplies(app,nextRun.lock);
return ctx.mercy ? { ...nextRun,lock:{ ...nextRun.lock,submitted:[] } } :nextRun;
}
function uiFinishAuditAction(app,ctx,judgedRun) {
const nextRun = uiKeepFailure(app,ctx,judgedRun);
app.run = nextRun;
app.trayFocusIndex = uiTrayFocusIndexFor(app,ctx.chipPos,{ previous:ctx.previousLockKey,next:uiLockKeyOf(nextRun),trayLength:uiTrayLength(nextRun) });
uiAnnounceVerdict(app,ctx.actionId,nextRun);
uiAdvanceOnboarding(app,{ actionId:ctx.actionId,beforeLength:ctx.before,run:nextRun });
app.lastFocusKey = uiFocusKeyAfterAction(app,ctx.actionId);
uiAfterBreachAction(app,ctx,nextRun);
}
function uiJudgeOnMainThread(app,actionId) {
return ui.audit.act(app.run,actionId);
}
function uiAuditRefused(app) {
return !app.run || uiBreachInert(app);
}
function uiAuditContext(app,actionId) {
const previousRun = app.run;
const previousLockKey = uiLockKeyOf(previousRun);
if (actionId === 'submit' && previousLockKey) uiSyncJudgeDataBadge(previousLockKey);
return { actionId,before:previousRun.lock ? previousRun.lock.line.length :0,previousLockKey,previousRun,chipPos:uiChipPosition(actionId) };
}
async function uiApplyAuditAction(app,actionId) {
if (uiAuditRefused(app) || !uiActionIsLegal(app.run,actionId)) return;
const ctx = uiAuditContext(app,actionId);
const replayed = actionId === 'submit' ? uiReplayedRun(app) :null;
if (replayed) return uiFinishAuditAction(app,{ ...ctx,free:true },replayed);
if (!UI_WORKER_ACTION_IDS[actionId]) return uiFinishAuditAction(app,ctx,ui.audit.act(app.run,actionId));
app.judging = true;
uiRenderApp(app);
const nextRun = await judgeAct(ctx.previousRun,actionId).catch(() => null);
app.judging = false;
if (app.run !== ctx.previousRun) return;
uiFinishAuditAction(app,ctx,nextRun || uiJudgeOnMainThread(app,actionId));
}

export { uiApplyAuditAction, uiTrayFocusIndexFor };
