import { uiEl } from './dom.js';

const UI_LAB_SCREEN_ID = 'lab';
const UI_LAB_BACK_KEY = 'lab-back';
const UI_LAB_LOADING_TEXT = 'MEMORY BANK loading.';

let uiLabDelegate = null;
let uiLabLoading = null;

function uiLabRender(app) {
if (uiLabDelegate) return uiLabDelegate.render(app);
return uiEl('section',{ className:'lab-screen' });
}
function uiLabFocusKey(app) {
return uiLabDelegate ? uiLabDelegate.focusKey(app) :UI_LAB_BACK_KEY;
}
function uiLabAnnounce(app) {
return uiLabDelegate ? uiLabDelegate.announce(app) :UI_LAB_LOADING_TEXT;
}
function uiLabKeyAction(event,app) {
return uiLabDelegate && uiLabDelegate.keyAction ? uiLabDelegate.keyAction(event,app) :null;
}
function uiLabApplyAction(app,actionId) {
return uiLabDelegate && uiLabDelegate.applyAction ? uiLabDelegate.applyAction(app,actionId) :false;
}
function uiLabSync(app,active,root) {
if (uiLabDelegate && uiLabDelegate.sync) uiLabDelegate.sync(app,active,root);
}
function uiLabStubScreen() {
return {
id:UI_LAB_SCREEN_ID,render:uiLabRender,focusKey:uiLabFocusKey,announce:uiLabAnnounce,
keyAction:uiLabKeyAction,applyAction:uiLabApplyAction,sync:uiLabSync,
};
}
function uiLoadLabModule() {
if (!uiLabLoading) uiLabLoading = import('./screen-lab.js');
return uiLabLoading;
}
async function uiOpenLabs(app) {
let mod;
try {
mod = await uiLoadLabModule();
} catch (error) {
uiLabLoading = null;
throw error;
}
if (app.screen !== 'grid' || app.game.breach || app.menuOpen) return;
uiLabDelegate = mod.uiLabScreen();
mod.uiLabOpen(app);
}

export { uiLabStubScreen, uiOpenLabs };
