import { lockName } from '../game/messages.js';
import { uiEl } from './dom.js';
import { ui } from './app.js';
import { uiLockBody } from './render-lock.js';
import { UI_LOCK_HEADING_KEY, uiFamilyName, uiFirstTryPill, uiHudSoundButton, uiHudMenuButton } from './render-lock-left.js';
import { uiKeyAction } from './keys.js';
import { uiBreachLock } from './breach-lock.js';
import { uiBreachTrace } from './breach-trace.js';
import { uiBreachExploits, uiExploitKeyAction, uiApplyExploitAction } from './breach-exploits.js';
import { uiDisconnect, uiClearBreachTimers } from './breach-flow.js';
import { uiBreachInert } from './render-submit-panel.js';

function uiGridButton(app) {
const attrs = { type:'button','data-action':'breach-disconnect','data-focus-key':'breach-disconnect','aria-label':'Disconnect: back to the Grid' };
if (uiBreachInert(app)) attrs.disabled = 'disabled';
return uiEl('button',{ className:'btn btn-ghost breach-back',text:'◄ GRID',attrs });
}
function uiBreachHud(app,view) {
return uiEl('div',{
className:'hud breach-hud',
children:[
uiGridButton(app),
uiEl('span',{ className:'hud-family hud-title',text:uiFamilyName(view.lock.family) }),
uiFirstTryPill(view.lock,app),
uiHudSoundButton(app),
uiHudMenuButton(),
],
});
}
function uiBreachStatus(app) {
const children = [uiBreachLock(app),uiBreachTrace(app),uiBreachExploits(app)];
return uiEl('div',{ className:'breach-status',children:children.filter(Boolean) });
}
function uiRenderBreach(app) {
const view = ui.audit.view(app.run);
return uiEl('section',{
className:'screen lock-screen breach-screen',
attrs:{ 'data-screen':'breach' },
children:[uiBreachHud(app,view),uiBreachStatus(app),uiLockBody(app,app.run,view)],
});
}
function uiBreachKeyAction(event,app) {
if (uiBreachInert(app)) return null;
const result = uiExploitKeyAction(event,app) || uiKeyAction(event,app);
if (result && result.type === 'render') app.lastFocusKey = 'chip-' + app.trayFocusIndex;
return result;
}
function uiApplyBreachAction(app,actionId) {
if (actionId !== 'breach-disconnect') return uiApplyExploitAction(app,actionId);
if (!uiBreachInert(app)) uiDisconnect(app);
return true;
}
function uiSyncBreach(app,active) {
if (!active) uiClearBreachTimers(app);
}
function uiBreachAnnounce(app) {
const trace = app.game.breach.trace;
return 'Jacked in: ' + lockName(app.game.breach.key) + '. TRACE ' + trace.filled + ' of ' + trace.capacity + '.';
}
function uiBreachScreen() {
return {
id:'breach',
render:uiRenderBreach,
focusKey:function () { return UI_LOCK_HEADING_KEY; },
announce:uiBreachAnnounce,
keyAction:uiBreachKeyAction,
applyAction:uiApplyBreachAction,
sync:uiSyncBreach,
};
}

export { uiBreachScreen };
