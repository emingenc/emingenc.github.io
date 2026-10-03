import { uiEl, uiPointerIsCoarse } from './dom.js';

const UI_DPAD_DIRS = { 'dpad-up':'up','dpad-down':'down','dpad-left':'left','dpad-right':'right' };
const UI_DPAD_BUTTONS = [
{ id:'dpad-up',cls:'grid-dpad-up',glyph:'▲',label:'Walk up' },
{ id:'dpad-left',cls:'grid-dpad-left',glyph:'◀',label:'Walk left' },
{ id:'grid-interact',cls:'grid-dpad-act',glyph:'◆',label:'Interact' },
{ id:'dpad-right',cls:'grid-dpad-right',glyph:'▶',label:'Walk right' },
{ id:'dpad-down',cls:'grid-dpad-down',glyph:'▼',label:'Walk down' },
];
function uiDpadButton(spec) {
return uiEl('button',{
className:'grid-dpad-btn ' + spec.cls,text:spec.glyph,
attrs:{ type:'button','data-action':spec.id,'data-focus-key':spec.id,'aria-label':spec.label },
});
}
function uiGridDpad() {
if (!uiPointerIsCoarse()) return null;
return uiEl('div',{ className:'grid-dpad',attrs:{ role:'group','aria-label':'Movement' },children:UI_DPAD_BUTTONS.map(uiDpadButton) });
}
function uiDpadDirOf(actionId) {
return Object.hasOwn(UI_DPAD_DIRS,actionId) ? UI_DPAD_DIRS[actionId] :null;
}
function uiDpadDirFor(target) {
const el = target && target.closest ? target.closest('[data-action]') :null;
return el ? uiDpadDirOf(el.getAttribute('data-action')) :null;
}

export { uiGridDpad, uiDpadDirOf, uiDpadDirFor };
