import { uiWalkPress, uiWalkRelease, uiWalkHolds, uiWalkInteract } from './grid-walk.js';
import { uiFireKey, uiFireKeyUp } from './grid-fire.js';

const UI_FIRE_KEYS = new Set(['f','F']);
const UI_WALK_KEYS = {
ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',
w:'up',W:'up',s:'down',S:'down',a:'left',A:'left',d:'right',D:'right',
};
const UI_INTERACT_KEYS = { Enter:1,' ':1 };
const UI_HANDLED = { type:'handled' };
function uiInteractFocus() {
const active = document.activeElement;
return !active || active === document.body || active.getAttribute('data-focus-key') === 'grid-stage';
}
function uiWalkKey(event,app) {
if (app.game.travelOpen) return UI_HANDLED;
const dir = UI_WALK_KEYS[event.key];
if (!event.repeat || !uiWalkHolds(app,dir)) uiWalkPress(app,dir);
return UI_HANDLED;
}
function uiInteractKey(app) {
if (!uiInteractFocus()) return null;
if (app.game.travelOpen) return UI_HANDLED;
uiWalkInteract(app);
return UI_HANDLED;
}
function uiPanelKeyResult(event,app) {
if (event.key === 't' || event.key === 'T') return { type:'action',id:'travel-toggle' };
if (event.key === 'o' || event.key === 'O') return event.repeat ? UI_HANDLED :{ type:'action',id:'map-open' };
if (event.key !== 'Escape') return null;
return app.game.travelOpen ? { type:'action',id:'travel-toggle' } :{ type:'toggle-menu' };
}
function uiGridKeyResult(event,app) {
if (Object.hasOwn(UI_WALK_KEYS,event.key)) return uiWalkKey(event,app);
if (UI_INTERACT_KEYS[event.key]) return uiInteractKey(app);
if (UI_FIRE_KEYS.has(event.key)) return uiFireKey(app,event) ? UI_HANDLED :null;
return uiPanelKeyResult(event,app);
}
function uiGridKeyAction(event,app) {
const result = uiGridKeyResult(event,app);
if (result) event.preventDefault();
return result;
}
function uiGridKeyUp(event,app) {
if (UI_FIRE_KEYS.has(event.key)) return uiFireKeyUp(app);
if (!Object.hasOwn(UI_WALK_KEYS,event.key)) return false;
uiWalkRelease(app,UI_WALK_KEYS[event.key]);
return true;
}

export { uiGridKeyAction, uiGridKeyUp };
