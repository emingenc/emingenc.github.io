import { uiEl } from './dom.js';
import { uiBreachInert } from './render-submit-panel.js';

const UI_RESET_CONFIRM_TEXT = 'Reset all progress? This clears your XP, levels, breached locks and position.';
const UI_RESET_CONFIRM_ID = 'menu-confirm-text';
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
function uiLabsButton(app) {
if (app.screen !== 'grid') return null;
return uiMenuButton('menu-labs','CONTEXT LAB');
}
function uiForgeButton(app) {
if (app.screen !== 'grid') return null;
return uiMenuButton('menu-forge','HARNESS FORGE');
}
function uiStreamButton(app) {
if (app.screen !== 'grid') return null;
return uiMenuButton('menu-stream','CONTEXT STREAM');
}
function uiMenuFace(app) {
const stops = [
uiMenuButton('menu-close','RESUME'),
uiMenuButton('toggle-sound',app.soundOn ? 'SOUND: ON' :'SOUND: OFF'),
uiLabsButton(app),
uiForgeButton(app),
uiStreamButton(app),
uiDisconnectButton(app),
uiMenuButton('reset-progress','RESET PROGRESS'),
].filter(Boolean);
return { title:'MENU',label:'Menu',question:null,stops };
}
function uiConfirmButton(action,label,kind) {
const attrs = { type:'button','data-action':action,'data-focus-key':action,'aria-describedby':UI_RESET_CONFIRM_ID };
return { key:action,node:uiEl('button',{ className:'btn ' + kind + ' menu-item',text:label,attrs }) };
}
function uiResetFace() {
return {
title:'RESET PROGRESS',label:'Reset progress',
question:uiEl('p',{ className:'menu-confirm-text',text:UI_RESET_CONFIRM_TEXT,attrs:{ id:UI_RESET_CONFIRM_ID } }),
stops:[uiConfirmButton('reset-confirm','RESET','btn-warn'),uiConfirmButton('reset-cancel','CANCEL','btn-ghost')],
};
}
function uiKeepFocusInMenu(app,overlay,stops) {
overlay.addEventListener('keydown',uiRoveKeyDown(app,stops));
overlay.addEventListener('mousedown',function (event) {
if (!stops.some((stop) => stop.node === event.target)) event.preventDefault();
});
}
function uiMenuPanel(app) {
const face = app.confirmReset ? uiResetFace() :uiMenuFace(app);
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

export { uiMenuIfOpen, uiRoveKeyDown };
