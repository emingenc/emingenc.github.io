import { uiEl } from './dom.js';

const UI_RIG_SCREEN_ID = 'rig';
const UI_RIG_BACK_KEY = 'rig-back';
const UI_RIG_LOADING_TEXT = 'Machine loading.';

const UI_RIG_HOOK_FALLBACKS = {
keyAction:null,keyUp:false,applyAction:false,sync:undefined,pointerDown:false,pointerUp:false,pointerCancel:false,release:undefined,
};
const UI_RIG_MODULES = { ledger:() => import('./screen-ledger.js') };
const UI_RIG_HOSTS = {
rig:(app,rig) => uiOpenRig(app,rig.id),
lab:async (app) => (await import('./lab-loader.js')).uiOpenLabs(app),
forge:async (app) => (await import('./forge-loader.js')).uiOpenForge(app),
stream:async (app) => (await import('./stream-loader.js')).uiOpenStream(app),
};

let uiRigDelegate = null;
const uiRigLoading = new Map();

function uiRigCall(hook,fallback,args) {
if (!uiRigDelegate || !uiRigDelegate[hook]) return fallback;
return uiRigDelegate[hook](...args);
}
function uiRigRender(app) {
if (uiRigDelegate) return uiRigDelegate.render(app);
return uiEl('section',{ className:'rig-screen' });
}
function uiRigFocusKey(app) {
return uiRigDelegate ? uiRigDelegate.focusKey(app) :UI_RIG_BACK_KEY;
}
function uiRigAnnounce(app) {
return uiRigDelegate ? uiRigDelegate.announce(app) :UI_RIG_LOADING_TEXT;
}
function uiRigStubScreen() {
const stub = { id:UI_RIG_SCREEN_ID,render:uiRigRender,focusKey:uiRigFocusKey,announce:uiRigAnnounce };
Object.keys(UI_RIG_HOOK_FALLBACKS).forEach(function (hook) {
stub[hook] = function (...args) { return uiRigCall(hook,UI_RIG_HOOK_FALLBACKS[hook],args); };
});
return stub;
}
function uiLoadRigModule(rigId) {
if (!Object.hasOwn(UI_RIG_MODULES,rigId)) throw new Error('unknown rig screen: ' + rigId);
if (!uiRigLoading.has(rigId)) uiRigLoading.set(rigId,UI_RIG_MODULES[rigId]());
return uiRigLoading.get(rigId);
}
async function uiOpenRig(app,rigId) {
let mod;
try {
mod = await uiLoadRigModule(rigId);
} catch (error) {
uiRigLoading.delete(rigId);
throw error;
}
if (app.screen !== 'grid' || app.game.breach || app.menuOpen) return;
uiRigDelegate = mod.uiRigScreen();
mod.uiRigOpen(app,rigId);
}
function uiOpenRigHost(app,rig) {
if (!Object.hasOwn(UI_RIG_HOSTS,rig.host)) return Promise.reject(new Error('unknown rig host: ' + rig.host));
return UI_RIG_HOSTS[rig.host](app,rig);
}

export { uiRigStubScreen, uiOpenRig, uiOpenRigHost };
