import { RIG_CATALOG } from '../game/rig-catalog.js';
import { rigMet } from '../game/rig-reward.js';
import { uiEl } from './dom.js';
import { uiBreachInert } from './render-submit-panel.js';

const UI_MENU_RIG_PREFIX = 'menu-rig-';
const UI_ROVE_ARROWS = { ArrowUp:-1,ArrowDown:1 };
function uiRoveDelta(event) {
if (event.key === 'Tab') return event.shiftKey ? -1 :1;
return Object.hasOwn(UI_ROVE_ARROWS,event.key) ? UI_ROVE_ARROWS[event.key] :0;
}
function uiRoveFocus(app,stops,delta) {
const from = Math.max(stops.findIndex((stop) => stop.node === document.activeElement),0);
const next = stops[(from + delta + stops.length) % stops.length];
next.node.focus();
app.lastFocusKey = next.key;
}
function uiRoveKeyDown(app,stops) {
return function (event) {
const delta = uiRoveDelta(event);
if (delta === 0) return;
uiRoveFocus(app,stops,delta);
event.preventDefault();
event.stopPropagation();
};
}
function uiMenuButton(action,label,disabled) {
const attrs = { type:'button','data-action':action,'data-focus-key':action };
if (disabled) attrs.disabled = 'disabled';
return { key:action,node:uiEl('button',{ className:'btn btn-ghost menu-item',text:label,attrs }) };
}
function uiDisconnectButton(app) {
if (app.screen !== 'breach') return null;
return uiMenuButton('menu-disconnect','DISCONNECT',uiBreachInert(app));
}
function uiRigReplayable(app,rig) {
return Object.hasOwn(app.game.world.rigs,rig.id) && rigMet(app.game.save,rig.id);
}
function uiReplayButtons(app) {
if (app.screen !== 'grid') return [];
return Object.values(RIG_CATALOG).filter((rig) => uiRigReplayable(app,rig))
.map((rig) => uiMenuButton(UI_MENU_RIG_PREFIX + rig.id,'REPLAY: ' + rig.title));
}
function uiMenuFace(app) {
const stops = [
uiMenuButton('menu-close','RESUME'),
uiMenuButton('toggle-sound',app.soundOn ? 'SOUND: ON' :'SOUND: OFF'),
uiMenuButton('menu-controls','CONTROLS'),
...uiReplayButtons(app),
uiDisconnectButton(app),
uiMenuButton('reset-progress','RESET PROGRESS'),
].filter(Boolean);
return { title:'MENU',label:'Menu',question:null,stops };
}
function uiKeepFocusInMenu(app,overlay,stops) {
overlay.addEventListener('keydown',uiRoveKeyDown(app,stops));
overlay.addEventListener('mousedown',function (event) {
if (!stops.some((stop) => stop.node === event.target)) event.preventDefault();
});
}
function uiMenuFaceFor(app) {
return app.menuFace ? app.menuFace(app) :uiMenuFace(app);
}
function uiMenuPanel(app) {
const face = uiMenuFaceFor(app);
const heading = uiEl('h2',{ className:'menu-title',text:face.title });
const panel = uiEl('div',{ className:'menu-panel',children:[heading,face.question,...face.stops.map((stop) => stop.node)] });
const overlay = uiEl('div',{
className:'menu-overlay',
attrs:{ role:'dialog','aria-modal':'true','aria-label':face.label },
children:[panel],
});
uiKeepFocusInMenu(app,overlay,face.stops.filter((stop) => !stop.node.disabled));
return overlay;
}
function uiMenuIfOpen(app) {
return app.menuOpen ? uiMenuPanel(app) :null;
}

export { UI_MENU_RIG_PREFIX, uiMenuButton, uiMenuIfOpen, uiRigReplayable, uiRoveKeyDown };
