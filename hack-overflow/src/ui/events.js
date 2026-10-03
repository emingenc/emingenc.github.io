import { uiQs, UI_ROOT_ID } from './dom.js';
import { uiCreateApp, uiRenderApp } from './app.js';
import { uiApplyAction } from './actions.js';
import { uiScreenFor, uiSyncScreens } from './screens.js';
import { uiWireFeedback } from './feedback.js';
import { uiGameDebug, uiGameSnapshot, uiSolveSteps } from './game-state.js';
import { uiInitAudio } from './audio.js';
import { warmJudgeWorker } from './judge-client.js';

async function uiHandleAction(app,actionId) {
await uiApplyAction(app,actionId);
uiRenderApp(app);
}
function uiActionElement(target) {
return target && target.closest ? target.closest('[data-action]') :null;
}
function uiHandleClick(app,event) {
const el = uiActionElement(event.target);
if (!el || el.disabled) return;
uiHandleAction(app,el.getAttribute('data-action'));
}
function uiGlobalKeyAction(event,app) {
if (event.key === 'm' || event.key === 'M') return 'toggle-sound';
if (app.story) return event.key === 'Escape' ? 'story-skip' :null;
return app.menuOpen && event.key === 'Escape' ? 'menu-close' :null;
}
function uiHandleKeyResult(app,result) {
if (result.type === 'action') return uiHandleAction(app,result.id);
if (result.type === 'toggle-menu') return uiHandleAction(app,app.menuOpen ? 'menu-close' :'open-menu');
if (result.type === 'render') uiRenderApp(app);
return null;
}
function uiSwallowStoryRepeat(app,event) {
if (!app.story || !event.repeat) return false;
event.preventDefault();
return true;
}
function uiHandleKeydown(app,event) {
if (event.ctrlKey || event.metaKey || event.altKey) return;
if (uiSwallowStoryRepeat(app,event)) return;
const globalId = uiGlobalKeyAction(event,app);
if (globalId) {
event.preventDefault();
uiHandleAction(app,globalId);
return;
}
if (app.menuOpen || app.story) return;
const screen = uiScreenFor(app);
const result = screen.keyAction ? screen.keyAction(event,app) :null;
if (result) uiHandleKeyResult(app,result);
}
function uiHandleKeyup(app,event) {
const screen = uiScreenFor(app);
if (screen.keyUp) screen.keyUp(event,app);
}
const UI_POINTER_HOOKS = { pointerdown:'pointerDown',pointerup:'pointerUp',pointercancel:'pointerCancel' };
function uiHandlePointer(app,event) {
const hook = uiScreenFor(app)[UI_POINTER_HOOKS[event.type]];
if (hook) hook(event,app);
}
function uiReleaseInput(app) {
const screen = uiScreenFor(app);
if (screen.release) screen.release(app);
}
function uiHandleVisibility(app) {
if (document.hidden) uiReleaseInput(app);
uiSyncScreens(app,uiQs(UI_ROOT_ID));
}
function uiWireEvents(app) {
document.addEventListener('click',function (event) { uiHandleClick(app,event); });
document.addEventListener('keydown',function (event) { uiHandleKeydown(app,event); });
document.addEventListener('keyup',function (event) { uiHandleKeyup(app,event); });
Object.keys(UI_POINTER_HOOKS).forEach(function (type) {
document.addEventListener(type,function (event) { uiHandlePointer(app,event); });
});
window.addEventListener('blur',function () { uiReleaseInput(app); });
document.addEventListener('visibilitychange',function () { uiHandleVisibility(app); });
}
function uiExposeDebug(app) {
window.HO_GAME = Object.assign(uiGameDebug(),{
app,
state:function () { return uiGameSnapshot(app); },
solveSteps:function () { return uiSolveSteps(app); },
});
}
function uiBoot() {
uiInitAudio();
warmJudgeWorker();
uiWireFeedback();
const app = uiCreateApp();
uiExposeDebug(app);
uiWireEvents(app);
uiRenderApp(app);
}

export { uiBoot };
