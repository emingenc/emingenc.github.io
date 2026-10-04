import { uiEl } from './dom.js';

const UI_STREAM_SCREEN_ID = 'stream';
const UI_STREAM_BACK_KEY = 'stream-back';
const UI_STREAM_LOADING_TEXT = 'The Intake loading. Real-time arcade game, simulated model, replayed offline.';

const UI_STREAM_HOOK_FALLBACKS = {
keyAction:null,keyUp:false,applyAction:false,sync:undefined,pointerDown:false,pointerUp:false,pointerCancel:false,release:undefined,
};

let uiStreamDelegate = null;
let uiStreamLoading = null;

function uiStreamCall(hook,fallback,args) {
if (!uiStreamDelegate || !uiStreamDelegate[hook]) return fallback;
return uiStreamDelegate[hook](...args);
}
function uiStreamRender(app) {
if (uiStreamDelegate) return uiStreamDelegate.render(app);
return uiEl('section',{ className:'stream-screen' });
}
function uiStreamFocusKey(app) {
return uiStreamDelegate ? uiStreamDelegate.focusKey(app) :UI_STREAM_BACK_KEY;
}
function uiStreamAnnounce(app) {
return uiStreamDelegate ? uiStreamDelegate.announce(app) :UI_STREAM_LOADING_TEXT;
}
function uiStreamStubScreen() {
const stub = { id:UI_STREAM_SCREEN_ID,render:uiStreamRender,focusKey:uiStreamFocusKey,announce:uiStreamAnnounce };
Object.keys(UI_STREAM_HOOK_FALLBACKS).forEach(function (hook) {
stub[hook] = function (...args) { return uiStreamCall(hook,UI_STREAM_HOOK_FALLBACKS[hook],args); };
});
return stub;
}
function uiLoadStreamModule() {
if (!uiStreamLoading) uiStreamLoading = import('./screen-stream.js');
return uiStreamLoading;
}
async function uiOpenStream(app) {
let mod;
try {
mod = await uiLoadStreamModule();
} catch (error) {
uiStreamLoading = null;
throw error;
}
if (app.screen !== 'grid' || app.game.breach || app.menuOpen) return;
uiStreamDelegate = mod.uiStreamScreen();
mod.uiStreamOpen(app);
}

export { uiStreamStubScreen, uiOpenStream };
