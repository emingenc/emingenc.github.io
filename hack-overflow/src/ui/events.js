import { uiIsAuditActionId, uiLineRemovePosition } from './line-actions.js';
import { uiApplyAuditAction } from './dispatch-audit.js';
import { uiIsNavActionId, uiApplyNavAction } from './dispatch-nav.js';
import { uiCreateApp, uiRenderApp } from './app.js';
import { uiKeyAction } from './keys.js';
import { uiInitAudio } from './audio.js';
import { warmJudgeWorker } from './judge-client.js';

function uiIsGameActionId(actionId) {
return uiIsAuditActionId(actionId) || uiLineRemovePosition(actionId) !== null;
}
// Async because a RUN/SUBMIT action hands off to the judge worker
// (dispatch-audit.js); every other action still resolves in the same
// microtask, so this stays effectively synchronous for them.
async function uiHandleAction(app,actionId) {
if (uiIsGameActionId(actionId)) {
await uiApplyAuditAction(app,actionId);
} else if (uiIsNavActionId(actionId)) {
uiApplyNavAction(app,actionId);
}
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
function uiHandleTrayMove(app) {
app.lastFocusKey = 'chip-' + app.trayFocusIndex;
uiRenderApp(app);
}
function uiHandleToggleMenu(app) {
app.menuOpen = !app.menuOpen;
app.lastFocusKey = app.menuOpen ? 'menu-close' :'open-menu';
uiRenderApp(app);
}
function uiHandleKeydown(app,event) {
const result = uiKeyAction(event,app);
if (!result) return;
if (result.type === 'render') return uiHandleTrayMove(app);
if (result.type === 'toggle-menu') return uiHandleToggleMenu(app);
return uiHandleAction(app,result.id);
}
function uiWireEvents(app) {
document.addEventListener('click',function (event) { uiHandleClick(app,event); });
document.addEventListener('keydown',function (event) { uiHandleKeydown(app,event); });
}
function uiBoot() {
uiInitAudio();
// Starts the judge worker's one-time creation cost (spawning it and
// loading its module graph) during boot, not on the player's first
// RUN/SUBMIT click.
warmJudgeWorker();
const app = uiCreateApp();
uiWireEvents(app);
uiRenderApp(app);
}

export { uiBoot };
