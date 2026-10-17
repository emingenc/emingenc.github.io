import { gridFitFor } from '../game/viewport.js';
import { uiApplyInputMode,uiWireInputMode } from './grid-input-mode.js';

const UI_GRID_SELECTOR = '.grid-screen';
const UI_TOP_BARS = ['.grid-hud','.grid-objective-block'];
const UI_DOCK_PARTS = ['.grid-power'];
let uiBarsWatcher = null;
let uiWatchedScreen = null;
const UI_NO_BARS = { top:0,bottom:0 };
let uiBars = UI_NO_BARS;
function uiGridFitMode() {
if (typeof window === 'undefined') return 'stack';
return gridFitFor({ width:window.innerWidth,height:window.innerHeight }).mode;
}
function uiTopInset(screen) {
const top = screen.getBoundingClientRect().top;
const bottoms = UI_TOP_BARS.map(function (selector) {
const bar = screen.querySelector(selector);
return bar ? bar.getBoundingClientRect().bottom - top :0;
});
return Math.ceil(Math.max(...bottoms));
}
function uiBottomInset(screen) {
const bottom = screen.getBoundingClientRect().bottom;
const heights = UI_DOCK_PARTS.map(function (selector) {
const part = screen.querySelector(selector);
return part ? bottom - part.getBoundingClientRect().top :0;
});
return Math.ceil(Math.max(...heights));
}
function uiMeasureTop(screen) {
uiBars = { top:uiTopInset(screen),bottom:uiBottomInset(screen) };
screen.style.setProperty('--fit-top',uiBars.top + 'px');
screen.style.setProperty('--fit-bottom',uiBars.bottom + 'px');
}
function uiBarsInset(tile) {
return { top:uiBars.top / tile,bottom:uiBars.bottom / tile };
}
function uiGridScreenNode() {
if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return null;
const node = document.querySelector(UI_GRID_SELECTOR);
return node && typeof node.getAttribute === 'function' ? node :null;
}
function uiRemeasure() {
const screen = uiGridScreenNode();
if (screen && screen.getAttribute('data-fit') === 'fill') uiMeasureTop(screen);
}
function uiWatchBars(screen) {
if (typeof ResizeObserver === 'undefined') return;
if (!uiBarsWatcher) uiBarsWatcher = new ResizeObserver(uiRemeasure);
uiBarsWatcher.disconnect();
UI_TOP_BARS.concat(UI_DOCK_PARTS).forEach(function (selector) {
const bar = screen.querySelector(selector);
if (bar) uiBarsWatcher.observe(bar);
});
}
function uiForgetScreen() {
if (uiBarsWatcher) uiBarsWatcher.disconnect();
uiWatchedScreen = null;
uiBars = UI_NO_BARS;
}
function uiFitGrid() {
const screen = uiGridScreenNode();
if (!screen) {
uiForgetScreen();
return;
}
uiWireInputMode();
uiApplyInputMode(screen);
const mode = uiGridFitMode();
if (screen.getAttribute('data-fit') !== mode) screen.setAttribute('data-fit',mode);
if (mode !== 'fill') {
uiForgetScreen();
if (typeof screen.style.removeProperty === 'function') {
screen.style.removeProperty('--fit-top');
screen.style.removeProperty('--fit-bottom');
}
return;
}
uiMeasureTop(screen);
if (screen !== uiWatchedScreen) uiWatchBars(screen);
uiWatchedScreen = screen;
}

export { uiGridFitMode, uiFitGrid, uiBarsInset };
