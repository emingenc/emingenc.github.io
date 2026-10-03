import { BUILD_PHASE } from '../logic/run-phase.js';
import { ui, uiSyncJudgeDataBadge, uiRenderApp } from './app.js';
import { uiHasOption } from './render-actions.js';
import { uiChipPosition, uiLineRemovePosition, uiRemoveLineChipAt } from './line-actions.js';
import { UI_ONBOARD_STAGE_CHIP, UI_ONBOARD_STAGE_VERDICT, UI_ONBOARD_STAGE_RULE, uiOnboardStage3Message } from './onboarding.js';
import { uiMarkOnboarded } from './storage.js';
import { uiPanelAnnounceText, uiBreachInert } from './render-submit-panel.js';
import { uiAfterBreachAction } from './breach-flow.js';
import { judgeAct } from './judge-client.js';

const UI_WORKER_ACTION_IDS = { run:1,submit:1 };

function uiActionIsLegal(run,actionId) {
return uiHasOption(ui.audit.view(run),actionId);
}
function uiAuditActionIsLegal(run,actionId) {
if (uiLineRemovePosition(actionId) !== null) return run.phase === BUILD_PHASE;
return uiActionIsLegal(run,actionId);
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
if (uiLineRemovePosition(actionId) !== null) return 'backspace';
if (actionId === 'clear') return 'chip-' + app.trayFocusIndex;
return actionId;
}
function uiRunAfterAction(run,actionId,removePos) {
return removePos !== null ? uiRemoveLineChipAt(run,removePos) :ui.audit.act(run,actionId);
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
function uiFinishAuditAction(app,ctx,nextRun) {
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
async function uiApplyAuditAction(app,actionId) {
if (uiAuditRefused(app)) return;
if (!uiAuditActionIsLegal(app.run,actionId)) return;
const before = app.run.lock ? app.run.lock.line.length :0;
const previousLockKey = uiLockKeyOf(app.run);
const previousRun = app.run;
const chipPos = uiChipPosition(actionId);
const removePos = uiLineRemovePosition(actionId);
if (actionId === 'submit' && previousLockKey) uiSyncJudgeDataBadge(previousLockKey);
const ctx = { actionId,before,previousLockKey,previousRun,chipPos };
if (!UI_WORKER_ACTION_IDS[actionId]) {
uiFinishAuditAction(app,ctx,uiRunAfterAction(app.run,actionId,removePos));
return;
}
app.judging = true;
uiRenderApp(app);
const nextRun = await judgeAct(previousRun,actionId).catch(() => null);
app.judging = false;
if (app.run !== previousRun) return;
uiFinishAuditAction(app,ctx,nextRun || uiJudgeOnMainThread(app,actionId));
}

export { uiApplyAuditAction, uiTrayFocusIndexFor };
