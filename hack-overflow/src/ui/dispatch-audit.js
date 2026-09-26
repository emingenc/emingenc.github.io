import { isDue } from '../logic/index.js';
import { BUILD_PHASE } from '../logic/run-phase.js';
import { ui, uiSyncJudgeDataBadge, uiRenderApp } from './app.js';
import { uiHasOption } from './render-actions.js';
import { uiChipPosition, uiLineRemovePosition, uiRemoveLineChipAt } from './line-actions.js';
import { UI_ONBOARD_STAGE_CHIP, UI_ONBOARD_STAGE_VERDICT, UI_ONBOARD_STAGE_RULE, uiOnboardStage3Message } from './onboarding.js';
import { uiMarkOnboarded, uiSaveRun } from './storage.js';
import { uiDayLabel } from './format.js';
import { uiPanelAnnounceText } from './render-submit-panel.js';
import { uiPlayActionSound } from './sound-map.js';
import { judgeAct } from './judge-client.js';

// RUN and SUBMIT are the only actions that run the Python judge, so they
// are the only ones sent to the judge worker (`judge-client.js`); every
// other action (chip, clear, backspace, show-line, next, ...) stays on the
// main thread, unchanged.
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
function uiOnboardFirstSubmit(app,info) {
return app.onboardStage === UI_ONBOARD_STAGE_VERDICT && info.actionId === 'submit';
}
function uiAdvanceOnboarding(app,info) {
if (uiOnboardChipAdded(app,info)) {
app.onboardStage = UI_ONBOARD_STAGE_VERDICT;
} else if (uiOnboardFirstSubmit(app,info)) {
app.onboardStage = UI_ONBOARD_STAGE_RULE;
app.onboardMessage = uiOnboardStage3Message(info.run.lock.lastSubmit.verdict);
uiMarkOnboarded();
} else if (app.onboardStage === UI_ONBOARD_STAGE_RULE) {
app.onboardStage = null;
}
}
function uiNaturalJoin(items) {
if (items.length <= 1) return items.join('');
return items.slice(0,-1).join(', ') + ' and ' + items[items.length - 1];
}
function uiFamilyNamesDue(profile,day) {
return ui.content.families.filter(function (family) { return isDue(profile.families[family.key],day); })
.map(function (family) { return family.name; });
}
function uiDayTransitionMessage(previousRun,nextRun) {
const due = uiFamilyNamesDue(nextRun.profile,nextRun.when.day);
const fromDay = uiDayLabel(previousRun.when.day);
const toDay = uiDayLabel(nextRun.when.day);
return 'Day ' + fromDay + ' → Day ' + toDay + ': ' + uiNaturalJoin(due) + ' due';
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
function uiHandleRunRestart(app,info) {
const isRestart = info.actionId === 'practice' || info.actionId === 'next-day';
if (!isRestart) return;
app.runStartProfile = info.nextRun.profile;
app.dayTransitionMessage = null;
if (info.actionId !== 'next-day') return;
app.dayTransitionMessage = uiDayTransitionMessage(info.previousRun,info.nextRun);
app.pendingAnnounce = app.dayTransitionMessage;
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
// Defensive bound: a roving-tabindex index only ever comes from a clicked
// chip position or a reset to 0, so it should already be in range, but this
// keeps `uiFocusKeyAfterAction`'s 'chip-<index>' key from ever naming a chip
// that does not exist in the current lock's tray (which would silently fall
// back to the screen heading instead of the tray).
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
app.dayTransitionMessage = null;
app.trayFocusIndex = uiTrayFocusIndexFor(app,ctx.chipPos,{ previous:ctx.previousLockKey,next:uiLockKeyOf(nextRun),trayLength:uiTrayLength(nextRun) });
uiPlayActionSound(ctx.actionId,nextRun);
uiAnnounceVerdict(app,ctx.actionId,nextRun);
uiAdvanceOnboarding(app,{ actionId:ctx.actionId,beforeLength:ctx.before,run:nextRun });
app.lastFocusKey = uiFocusKeyAfterAction(app,ctx.actionId);
uiHandleRunRestart(app,{ actionId:ctx.actionId,previousRun:ctx.previousRun,nextRun:nextRun });
uiSaveRun(nextRun);
}
// Falls back to the ordinary main-thread judge (same call the non-worker
// actions use) when the worker cannot be reached: never worse than before
// this action moved to a worker, just no longer off the main thread.
function uiJudgeOnMainThread(app,actionId) {
return ui.audit.act(app.run,actionId);
}
async function uiApplyAuditAction(app,actionId) {
if (app.judging) return;
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
