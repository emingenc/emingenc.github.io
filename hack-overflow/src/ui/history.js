
const UI_HISTORY_STATE = { ho:'grid' };
const UI_GESTURE_EVENTS = ['pointerdown','pointerup','keydown','click'];
const UI_BACK_BY_SCREEN = {
rig:'rig-back',lab:'lab-back',forge:'forge-back',stream:'stream-back',map:'map-close',breach:'breach-disconnect',grid:'open-menu',
};
const uiPushedWindows = new WeakSet();
const UI_RESTORE_MS = 1000;
const uiRestoreEnds = new WeakMap();

function uiHistoryApi() {
if (typeof window === 'undefined' || !window.history) return null;
return typeof window.history.pushState === 'function' ? window.history : null;
}
function uiBackOnMenu(app) {
return app.confirmReset ? 'reset-cancel' :'menu-close';
}
function uiBackOnScreen(app) {
if (app.screen === 'grid' && app.game && app.game.travelOpen) return 'travel-close';
return Object.hasOwn(UI_BACK_BY_SCREEN,app.screen) ? UI_BACK_BY_SCREEN[app.screen] :null;
}
function uiBackActionFor(app) {
if (app.story) return 'story-skip';
if (app.menuOpen) return uiBackOnMenu(app);
return uiBackOnScreen(app);
}
function uiHasGesture() {
const activation = window.navigator ? window.navigator.userActivation :null;
return !activation || Boolean(activation.hasBeenActive);
}
function uiOnOurEntry(history) {
return Boolean(history.state) && history.state.ho === UI_HISTORY_STATE.ho;
}
function uiHistoryPush() {
const history = uiHistoryApi();
if (!history || uiPushedWindows.has(window) || !uiHasGesture()) return;
uiPushedWindows.add(window);
if (uiOnOurEntry(history)) return;
history.pushState(UI_HISTORY_STATE,'');
}
function uiIsRestore(popEvent) {
const ours = Boolean(popEvent && popEvent.state && popEvent.state.ho === UI_HISTORY_STATE.ho);
return ours && Date.now() < (uiRestoreEnds.get(window) || 0);
}
function uiRestoreEntry(history) {
if (typeof history.go !== 'function') return;
uiRestoreEnds.set(window,Date.now() + UI_RESTORE_MS);
history.go(1);
}
function uiHandlePopstate(app,popEvent,dispatch) {
if (uiIsRestore(popEvent)) { uiRestoreEnds.delete(window); return; }
const actionId = uiBackActionFor(app);
const history = uiHistoryApi();
if (history) uiRestoreEntry(history);
if (actionId) dispatch(actionId);
}
function uiWireHistory(app,dispatch) {
if (typeof window === 'undefined') return;
window.addEventListener('popstate',function (event) { uiHandlePopstate(app,event,dispatch); });
UI_GESTURE_EVENTS.forEach(function (type) { window.addEventListener(type,function () { uiHistoryPush(); },true); });
}

export { uiBackActionFor, uiHistoryPush, uiWireHistory };
