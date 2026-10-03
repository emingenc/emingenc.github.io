import { uiEl } from './dom.js';

const UI_FORGE_SCREEN_ID = 'forge';
const UI_FORGE_BACK_KEY = 'forge-back';
const UI_FORGE_LOADING_TEXT = 'Harness forge loading. Simulated agent, no real AI.';

let uiForgeDelegate = null;
let uiForgeLoading = null;

function uiForgeRender(app) {
if (uiForgeDelegate) return uiForgeDelegate.render(app);
return uiEl('section',{ className:'forge-screen' });
}
function uiForgeFocusKey(app) {
return uiForgeDelegate ? uiForgeDelegate.focusKey(app) :UI_FORGE_BACK_KEY;
}
function uiForgeAnnounce(app) {
return uiForgeDelegate ? uiForgeDelegate.announce(app) :UI_FORGE_LOADING_TEXT;
}
function uiForgeKeyAction(event,app) {
return uiForgeDelegate && uiForgeDelegate.keyAction ? uiForgeDelegate.keyAction(event,app) :null;
}
function uiForgeApplyAction(app,actionId) {
return uiForgeDelegate && uiForgeDelegate.applyAction ? uiForgeDelegate.applyAction(app,actionId) :false;
}
function uiForgeSync(app,active,root) {
if (uiForgeDelegate && uiForgeDelegate.sync) uiForgeDelegate.sync(app,active,root);
}
function uiForgePointerDown(event,app) {
return uiForgeDelegate && uiForgeDelegate.pointerDown ? uiForgeDelegate.pointerDown(event,app) :false;
}
function uiForgePointerUp(event,app) {
return uiForgeDelegate && uiForgeDelegate.pointerUp ? uiForgeDelegate.pointerUp(event,app) :false;
}
function uiForgeRelease(app) {
if (uiForgeDelegate && uiForgeDelegate.release) uiForgeDelegate.release(app);
}
function uiForgeStubScreen() {
return {
id:UI_FORGE_SCREEN_ID,render:uiForgeRender,focusKey:uiForgeFocusKey,announce:uiForgeAnnounce,
keyAction:uiForgeKeyAction,applyAction:uiForgeApplyAction,sync:uiForgeSync,
pointerDown:uiForgePointerDown,pointerUp:uiForgePointerUp,release:uiForgeRelease,
};
}
function uiLoadForgeModule() {
if (!uiForgeLoading) uiForgeLoading = import('./screen-forge.js');
return uiForgeLoading;
}
async function uiOpenForge(app) {
let mod;
try {
mod = await uiLoadForgeModule();
} catch (error) {
uiForgeLoading = null;
throw error;
}
if (app.screen !== 'grid' || app.game.breach || app.menuOpen) return;
uiForgeDelegate = mod.uiForgeScreen();
mod.uiForgeOpen(app);
}

export { uiForgeStubScreen, uiOpenForge };
