const UI_GRID_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','Enter',' ','f','F']);
const UI_INPUT_ATTR = 'data-input';
const UI_KEYS_VALUE = 'keys';
const UI_POINTER_VALUE = 'pointer';
let uiKeysInUse = false;
let uiModeWired = false;
let uiOnModeChange = null;
function uiKeysSeen() {
return uiKeysInUse;
}
function uiApplyInputMode(screen) {
screen.setAttribute(UI_INPUT_ATTR,uiKeysInUse ? UI_KEYS_VALUE :UI_POINTER_VALUE);
}
function uiMountedScreen() {
if (typeof document.querySelector !== 'function') return null;
const screen = document.querySelector('.grid-screen');
return screen && typeof screen.setAttribute === 'function' ? screen :null;
}
function uiSetKeysInUse(inUse) {
if (uiKeysInUse === inUse) return;
uiKeysInUse = inUse;
const screen = uiMountedScreen();
if (screen) uiApplyInputMode(screen);
if (uiOnModeChange) uiOnModeChange();
}
function uiWatchInputMode(run) {
uiOnModeChange = run;
}
function uiOnKeyDown(event) {
if (event.ctrlKey || event.metaKey || event.altKey) return;
if (UI_GRID_KEYS.has(event.key)) uiSetKeysInUse(true);
}
function uiOnPointerDown(event) {
if (event.pointerType === 'touch') uiSetKeysInUse(false);
}
function uiWireInputMode() {
if (uiModeWired || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
uiModeWired = true;
document.addEventListener('keydown',uiOnKeyDown,true);
document.addEventListener('pointerdown',uiOnPointerDown,true);
}

export { uiKeysSeen, uiApplyInputMode, uiWireInputMode, uiWatchInputMode };
