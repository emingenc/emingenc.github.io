import { ui } from './app.js';
import { uiLoadProfile, uiSaveRun, uiIsResumable, uiResetProgress } from './storage.js';
import { uiToggleSound } from './audio.js';

function uiFreshOrSavedRun() {
const profile = uiLoadProfile();
if (!profile) return ui.audit.newRun({ day:0,attempt:0,fresh:true });
return ui.audit.newRun({ day:profile.today,attempt:profile.attempt,fresh:false,profile:profile });
}
function uiStartOrResumeRun(app) {
app.run = uiIsResumable(app.savedRun) ? app.savedRun :uiFreshOrSavedRun();
app.runStartProfile = app.run.profile;
app.screen = 'lock';
app.lastFocusKey = 'lock-header';
uiSaveRun(app.run);
}
function uiHandleToggleSound(app) {
app.soundOn = uiToggleSound();
app.lastFocusKey = 'toggle-sound';
}
const UI_RESET_CONFIRM_TEXT = 'Reset all progress? This clears every box, due day and saved run.';
function uiHandleResetProgress(app) {
if (!window.confirm(UI_RESET_CONFIRM_TEXT)) return;
uiResetProgress();
app.run = null;
app.savedRun = null;
app.runStartProfile = null;
app.menuOpen = false;
app.screen = 'title';
app.lastFocusKey = 'title-start';
}
function uiGoToRoute(app) {
app.screen = 'route';
app.menuOpen = false;
app.lastFocusKey = 'route';
}
function uiLeaveRoute(app) {
app.screen = app.run ? 'lock' :'title';
app.lastFocusKey = 'route-back';
}
function uiHandleRoutePeek(app,actionId) {
const nodeId = actionId.slice('route-peek-'.length);
app.routePeekKey = app.routePeekKey === nodeId ? null :nodeId;
app.lastFocusKey = 'route-node-' + nodeId;
}
function uiOpenMenu(app) {
app.menuOpen = true;
app.lastFocusKey = 'menu-close';
}
function uiCloseMenu(app) {
app.menuOpen = false;
app.lastFocusKey = 'open-menu';
}
function uiGoToTitleRoute(app) {
app.screen = 'route';
app.lastFocusKey = 'title-route';
}
const UI_NAV_HANDLERS = {
'title-start':uiStartOrResumeRun,
'title-route':uiGoToTitleRoute,
route:uiGoToRoute,
'route-back':uiLeaveRoute,
'route-peek-close':function (app) {
app.lastFocusKey = 'route-node-' + app.routePeekKey;
app.routePeekKey = null;
},
'toggle-sound':uiHandleToggleSound,
'reset-progress':uiHandleResetProgress,
'open-menu':uiOpenMenu,
'menu-close':uiCloseMenu,
};
function uiIsRoutePeekId(actionId) {
return actionId.indexOf('route-peek-') === 0 && actionId !== 'route-peek-close';
}
function uiIsNavActionId(actionId) {
return Boolean(UI_NAV_HANDLERS[actionId]) || uiIsRoutePeekId(actionId);
}
function uiApplyNavAction(app,actionId) {
if (uiIsRoutePeekId(actionId)) {
uiHandleRoutePeek(app,actionId);
return;
}
const handler = UI_NAV_HANDLERS[actionId];
if (handler) handler(app);
}

export { uiIsNavActionId, uiApplyNavAction };
