import { uiEl } from './dom.js';

const UI_RIG_SCREEN_ID = 'rig';
const UI_RIG_STUBS = {
rig:{ section:'rig-screen',backKey:'rig-back',loading:'Machine loading.' },
lab:{ section:'lab-screen',backKey:'lab-back',loading:'MEMORY BANK loading.' },
forge:{ section:'forge-screen',backKey:'forge-back',loading:'The Checkpoint loading. The forge, replayed offline.' },
stream:{ section:'stream-screen',backKey:'stream-back',loading:'The Intake loading. Real-time arcade game, simulated model, replayed offline.' },
};

const UI_RIG_HOOK_FALLBACKS = {
keyAction:null,keyUp:false,applyAction:false,sync:undefined,pointerDown:false,pointerUp:false,pointerCancel:false,release:undefined,
};
const RIG_SHELL_SHEET = 'styles/rooms/rig-shell.css';
const ARENA_SHEET = 'styles/rooms/arena.css';
const UI_ROOMS = {
ledger:{ load:() => import('./screen-ledger.js'),sheets:[RIG_SHELL_SHEET,'styles/rooms/ledger.css'] },
turret:{ load:() => import('./screen-turret.js'),sheets:[RIG_SHELL_SHEET,ARENA_SHEET,'styles/rooms/turret.css'] },
shield:{ load:() => import('./screen-shield.js'),sheets:[RIG_SHELL_SHEET,ARENA_SHEET,'styles/rooms/shield.css'] },
pincer:{ load:() => import('./screen-pincer.js'),sheets:[RIG_SHELL_SHEET,ARENA_SHEET,'styles/rooms/pincer.css'] },
beam:{ load:() => import('./screen-beam.js'),sheets:[RIG_SHELL_SHEET,ARENA_SHEET,'styles/rooms/beam.css'] },
net:{ load:() => import('./screen-net.js'),sheets:[RIG_SHELL_SHEET,ARENA_SHEET,'styles/rooms/net.css'] },
};
const UI_RIG_HOSTS = {
rig:(app,rig) => uiOpenRig(app,rig.id),
lab:async (app) => (await import('./lab-loader.js')).uiOpenLabs(app),
forge:async (app) => (await import('./forge-loader.js')).uiOpenForge(app),
stream:async (app) => (await import('./stream-loader.js')).uiOpenStream(app),
};

const uiRigDelegates = new Map();
const uiRigLoading = new Map();

function uiSetRigDelegate(screenId,screen) {
uiRigDelegates.set(screenId,screen);
}
function uiRigCall(screenId,hook,args) {
const delegate = uiRigDelegates.get(screenId);
if (!delegate || !delegate[hook]) return UI_RIG_HOOK_FALLBACKS[hook];
return delegate[hook](...args);
}
function uiRigStubScreen(screenId = UI_RIG_SCREEN_ID) {
const { section,backKey,loading } = UI_RIG_STUBS[screenId];
const real = () => uiRigDelegates.get(screenId);
const stub = {
id:screenId,
render:(app) => (real() ? real().render(app) :uiEl('section',{ className:section })),
focusKey:(app) => (real() ? real().focusKey(app) :backKey),
announce:(app) => (real() ? real().announce(app) :loading),
};
Object.keys(UI_RIG_HOOK_FALLBACKS).forEach(function (hook) {
stub[hook] = function (...args) { return uiRigCall(screenId,hook,args); };
});
return stub;
}
function uiRigStubScreens() {
return Object.keys(UI_RIG_STUBS).map((screenId) => uiRigStubScreen(screenId));
}
function uiLoadRigModule(rigId) {
if (!Object.hasOwn(UI_ROOMS,rigId)) throw new Error('unknown rig screen: ' + rigId);
if (!uiRigLoading.has(rigId)) uiRigLoading.set(rigId,UI_ROOMS[rigId].load());
return uiRigLoading.get(rigId);
}
function uiRigWalkedAway(app) {
return app.screen !== 'grid' || app.game.breach || app.menuOpen;
}
async function uiOpenRigScreen(app,{ id,screen,ready,open }) {
if (uiRigWalkedAway(app)) return;
uiSetRigDelegate(id,screen());
await ready?.();
if (uiRigWalkedAway(app)) return;
open(app);
}
async function uiOpenRig(app,rigId) {
let mod;
try {
mod = await uiLoadRigModule(rigId);
} catch (error) {
uiRigLoading.delete(rigId);
throw error;
}
await uiOpenRigScreen(app,{ id:UI_RIG_SCREEN_ID,screen:mod.uiRigScreen,ready:mod.uiRigReady,open:(target) => mod.uiRigOpen(target,rigId) });
}
function uiOpenRigHost(app,rig) {
if (!Object.hasOwn(UI_RIG_HOSTS,rig.host)) return Promise.reject(new Error('unknown rig host: ' + rig.host));
return UI_RIG_HOSTS[rig.host](app,rig);
}

export { UI_ROOMS,uiRigStubScreen,uiRigStubScreens,uiSetRigDelegate,uiOpenRig,uiOpenRigScreen,uiOpenRigHost };
