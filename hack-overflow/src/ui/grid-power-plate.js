import { BREACH_HOLD_MS,volleyText } from '../game/power/volley.js';
import { uiShowToast } from './grid-toast.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-power-plate.css';
const BREACH_SELECTOR = '[data-focus-key="power-chip-breach"]';
const GHOST_MS = 500;
const uiPress = { timer:null,node:null,fired:false,ghostUntil:0 };

function uiBreachNode(target) {
return target && target.closest ? target.closest(BREACH_SELECTOR) :null;
}
function uiPressReset() {
if (uiPress.timer !== null) window.clearTimeout(uiPress.timer);
if (uiPress.node && uiPress.node.classList) uiPress.node.classList.remove('is-holding');
Object.assign(uiPress,{ timer:null,node:null,fired:false });
}
function uiPressDone(commit) {
uiPress.timer = null;
uiPress.fired = true;
commit();
}
function uiPressDown(event,commit) {
uiPressReset();
const node = uiBreachNode(event.target);
if (!node || event.button > 0) return;
Object.assign(uiPress,{ node,fired:false });
if (node.classList) node.classList.add('is-holding');
uiPress.timer = window.setTimeout(function () { uiPressDone(commit); },BREACH_HOLD_MS);
}
function uiPressUp(event,say) {
if (!uiPress.node) return;
const lifted = !uiPress.fired;
uiPressReset();
uiPress.ghostUntil = performance.now() + GHOST_MS;
if (event.type === 'pointerup' && lifted) say();
}
const uiTargets = new WeakMap();
function uiLiveTarget() {
const target = uiTargets.get(document);
return target && target.app.game.gen === target.gen ? target :null;
}
function uiAddListeners() {
document.addEventListener('pointerdown',function (event) {
const target = uiLiveTarget();
if (target) uiPressDown(event,target.commit);
});
['pointerup','pointercancel'].forEach(function (type) {
document.addEventListener(type,function (event) {
const target = uiLiveTarget();
if (target) uiPressUp(event,function () { uiShowToast(target.app,{ text:volleyText().hold,kind:'info',replace:true }); });
});
});
window.addEventListener('blur',function () { uiPressReset(); });
}
function uiWireBreach(app,commit) {
Object.assign(uiPress,{ timer:null,node:null,fired:false,ghostUntil:0 });
const wired = uiTargets.has(document);
uiTargets.set(document,{ app,commit,gen:app.game.gen });
if (!wired) uiAddListeners();
}
function uiBreachClick(commit) {
if (performance.now() < uiPress.ghostUntil || uiPress.node) return;
commit();
}
function uiModePlate() {
uiLinkStyle(STYLE_HREF);
return { id:'plate',name:'PLATE',aim:false,chips:() => [] };
}

export { uiBreachClick,uiModePlate,uiWireBreach };
