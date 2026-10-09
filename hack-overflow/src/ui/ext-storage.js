import { parseExt } from '../game/save-ext.js';
import { uiHasGame } from './game-storage.js';

const UI_EXT_KEY = 'ho-grid-ext-v1';
function uiReadExtRaw() {
try {
return window.localStorage.getItem(UI_EXT_KEY);
} catch (error) {
return null;
}
}
function uiLoadExt() {
return parseExt(uiReadExtRaw());
}
function uiStoreExt(ext) {
try {
window.localStorage.setItem(UI_EXT_KEY,JSON.stringify(ext));
} catch (error) {
return;
}
}
function uiClearExt() {
try {
window.localStorage.removeItem(UI_EXT_KEY);
} catch (error) {
return;
}
}
function uiCommitExt(app,ext) {
app.game.ext = { ...ext,anchor:ext.anchor || uiHasGame() };
uiStoreExt(app.game.ext);
}

export { UI_EXT_KEY, uiLoadExt, uiStoreExt, uiClearExt, uiCommitExt };
