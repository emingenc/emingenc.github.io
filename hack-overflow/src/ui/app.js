import { createProfile } from '../logic/index.js';
import { BUILD_PHASE, RESULT_PHASE, REVIEW_PHASE } from '../logic/run-phase.js';
import { uiQs, uiMount, uiAnnounce, uiFindByFocusKey, uiRestoreFocus, UI_ROOT_ID, UI_BADGE_ID } from './dom.js';
import { uiLoadRun, uiLoadSoundOn, uiLoadOnboarded, uiLoadProfile } from './storage.js';
import { UI_ONBOARD_STAGE_CHIP } from './onboarding.js';
import { uiMenuIfOpen } from './menu.js';
import { uiStartRain, uiStopRain } from './rain.js';
import { uiRenderTitle } from './render-title.js';
import { uiRenderRoute } from './render-route.js';
import { uiRenderResult } from './render-result.js';
import { uiRenderReview } from './render-review.js';
import { uiRenderLock } from './render-lock.js';
import { checkMaxTestData } from './judge-client.js';

// Shared UI-layer state: the loaded content bundle and the judge audit
// (prototype globals E_DATA and HO_AUDIT). Set once by main.js before boot.
const ui = { content:null,audit:null };
function setUiContext(content,audit) {
ui.content = content;
ui.audit = audit;
}
function uiCreateApp() {
return {
screen:'title',
run:null,
savedRun:uiLoadRun(),
runStartProfile:null,
soundOn:uiLoadSoundOn(),
trayFocusIndex:0,
lastPanelKind:null,
lastFocusKey:null,
onboardStage:uiLoadOnboarded() ? null :UI_ONBOARD_STAGE_CHIP,
onboardMessage:null,
menuOpen:false,
routePeekKey:null,
costModelOpen:false,
rainState:null,
dayTransitionMessage:null,
pendingAnnounce:null,
lastAnnouncedScreen:null,
pendingScrollToVerdict:false,
// Set while a RUN/SUBMIT verdict is being computed on the judge worker
// (dispatch-audit.js); the lock screen shows a "Judging..." state and
// disables the action buttons for that window (render-actions.js,
// render-submit-panel.js).
judging:false,
};
}
function uiProfileForRoute(app) {
if (app.run) return app.run.profile;
return uiLoadProfile() || createProfile(ui.content.families);
}
function uiInGame(app) {
return app.screen === 'lock' && Boolean(app.run);
}
function uiScreenNode(app) {
if (app.screen === 'route') return uiRenderRoute(app,uiProfileForRoute(app));
if (!uiInGame(app)) return uiRenderTitle(app);
const view = ui.audit.view(app.run);
if (app.run.phase === RESULT_PHASE) return uiRenderResult(app,app.run,view);
if (app.run.phase === REVIEW_PHASE) return uiRenderReview(app,app.run,view);
return uiRenderLock(app,app.run,view);
}
function uiDefaultFocusKey(app) {
if (app.screen === 'route') return 'route-header';
if (!uiInGame(app)) return 'title-start';
if (app.run.phase === RESULT_PHASE) return 'result-header';
if (app.run.phase === REVIEW_PHASE) return 'review-header';
return 'lock-header';
}
function uiScreenAnnounceKey(app) {
if (app.screen === 'route') return 'route';
return uiInGame(app) ? app.run.phase :'title';
}
const UI_SCREEN_ANNOUNCE_TEXT = {
title:'Title screen.',
route:'Route screen.',
};
UI_SCREEN_ANNOUNCE_TEXT[RESULT_PHASE] = 'Lock breached.';
UI_SCREEN_ANNOUNCE_TEXT[REVIEW_PHASE] = 'Review screen.';
UI_SCREEN_ANNOUNCE_TEXT[BUILD_PHASE] = 'Lock screen.';
function uiScreenAnnounceIfChanged(app) {
const key = uiScreenAnnounceKey(app);
const changed = key !== app.lastAnnouncedScreen;
app.lastAnnouncedScreen = key;
return changed ? UI_SCREEN_ANNOUNCE_TEXT[key] :null;
}
const UI_NARROW_VIEWPORT_MAX = 768;
function uiIsNarrowViewport() {
return window.innerWidth < UI_NARROW_VIEWPORT_MAX;
}
function uiScrollVerdictIntoView(root) {
const panel = root.querySelector('.test-panel');
if (panel && typeof panel.scrollIntoView === 'function') panel.scrollIntoView({ block:'start' });
}
// Re-render keeps window.scrollY unless the screen itself changed (screen
// change -> jump to top so the new heading is visible); a same-screen
// RUN/SUBMIT re-render only nudges the phone viewport to the verdict.
function uiApplyPendingScroll(app,root,screenChanged) {
if (screenChanged) {
window.scrollTo(0,0);
} else if (app.pendingScrollToVerdict && uiIsNarrowViewport()) {
uiScrollVerdictIntoView(root);
}
app.pendingScrollToVerdict = false;
}
function uiSyncRain(app,root) {
const canvas = root.querySelector('.rain-canvas');
if (canvas && !app.rainState) app.rainState = uiStartRain(canvas);
if (!canvas && app.rainState) {
uiStopRain(app.rainState);
app.rainState = null;
}
}
function uiRenderApp(app) {
const nodes = [uiScreenNode(app),uiMenuIfOpen(app)].filter(Boolean);
const root = uiMount(UI_ROOT_ID,nodes);
uiSyncRain(app,root);
const screenAnnounce = uiScreenAnnounceIfChanged(app);
const announce = app.pendingAnnounce || screenAnnounce;
app.pendingAnnounce = null;
if (announce) uiAnnounce(announce);
const fallback = uiFindByFocusKey(root,uiDefaultFocusKey(app));
uiRestoreFocus(root,app.lastFocusKey,fallback);
uiApplyPendingScroll(app,root,Boolean(screenAnnounce));
}
// Data-integrity check ported from the dropped in-page selftest suite's
// uiSelfCheckMaxHashes: on first need for a problem's max test, verify its
// hashes and surface the prototype's red badge on mismatch. Building the
// judge context this needs (`ui.audit.checks.maxTest`) is exactly as
// expensive as judging a submit for a problem with a large max test (lc84's
// max test is one real example), so it runs on the judge worker instead of
// blocking the main thread the same way a synchronous RUN/SUBMIT used to.
const uiJudgeCheckedKeys = {};
function uiShowJudgeDataBadgeFailure() {
const badge = uiQs(UI_BADGE_ID);
if (!badge) return;
badge.textContent = 'judge data check failed';
badge.className = 'selftest-badge selftest-fail';
}
function uiSyncJudgeDataBadge(key) {
if (uiJudgeCheckedKeys[key]) return;
uiJudgeCheckedKeys[key] = true;
checkMaxTestData(key).then(function (check) {
if (!check.inputHashOk || !check.expectedHashOk) uiShowJudgeDataBadgeFailure();
}).catch(function () {
// Falls back to the same check on the main thread (its original cost,
// pre-worker) only if the worker itself is unreachable.
const check = ui.audit.checks.maxTest(key);
if (!check.inputHashOk || !check.expectedHashOk) uiShowJudgeDataBadgeFailure();
});
}

export { ui, setUiContext, uiCreateApp, uiRenderApp, uiSyncJudgeDataBadge };
