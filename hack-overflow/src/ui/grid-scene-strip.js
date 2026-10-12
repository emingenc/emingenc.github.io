import { uiRenderKeepingFocus } from './app.js';
import { uiGridHook } from './bus.js';
import { uiDropKernel } from './grid-kernel-chips.js';


const LET_GO_ID = 'letgo';

function uiParked(app) {
return Boolean(app.story) || app.screen !== 'grid' || Boolean(app.game.travelOpen);
}

function uiLiveState(app,stateOf) {
const state = app.game ? stateOf(app.game) :null;
return app.screen === 'grid' && state && app.game.ext && app.game.progress ? state :null;
}

function uiSceneState(game) {
return { gen:game.gen,busy:false,declined:false,run:null,ui:null,cancel:null };
}

function uiLetGo(state) {
if (state && state.cancel) state.cancel();
}

function uiAwaitChip(app,state,view) {
const gen = app.game.gen;
return new Promise(function (resolve) {
const run = (pick) => () => { if (app.game.gen === gen && !uiParked(app)) resolve(pick); };
state.cancel = () => resolve(LET_GO_ID);
state.ui.view = () => ({ ...view,chips:view.chips.map((chip) => ({ ...chip,run:run(chip.id) })) });
uiRenderKeepingFocus(app);
});
}

function uiReleaseStrip(app,state,ui) {
state.run = null;
state.cancel = null;
state.ui = null;
ui.view = null;
uiDropKernel(app);
uiRenderKeepingFocus(app);
}

const hooked = new Set();

function uiHookBench(scene,onBump,onMove) {
if (hooked.has(scene)) return;
hooked.add(scene);
uiGridHook('bump',onBump);
['step','enter-cell'].forEach((name) => uiGridHook(name,onMove));
}

async function uiExclusive(state,work) {
if (state.busy) return;
state.busy = true;
try {
await work();
} finally {
state.busy = false;
}
}

function uiTellInBackground(state,task) {
state.busy = true;
task().catch(console.error).finally(() => { state.busy = false; });
}

function uiBenchBumped(payload) {
const prop = payload.event && payload.event.prop;
return prop && prop.startsWith('bench-') ? payload.app :null;
}

export { LET_GO_ID,uiParked,uiLiveState,uiSceneState,uiLetGo,uiAwaitChip,uiReleaseStrip,uiHookBench,uiExclusive,uiTellInBackground,uiBenchBumped };
