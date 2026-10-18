import { autoReady,nextAuto } from '../game/finale/kernel-auto.js';
import { uiRenderKeepingFocus } from './app.js';
import { runToDecision,uiAutoRunControls } from './auto-run.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/auto-run.css';
const GRID_SCREEN = 'grid';
const NO_GOOD = 0;
const HALVE_PHASE = 3;
const HALVE_STEP_MS = 650;

function uiAutoNoop() {}
function uiAutoUnder(app) {
return Boolean(app.story) || app.screen !== GRID_SCREEN;
}
function uiAutoPhase(app) {
return app.game.kernel.phase;
}
function uiAutoForced(app) {
const kernel = app.game.kernel;
const move = nextAuto(kernel.phase);
return Boolean(move && move.forced && autoReady(kernel.phase,kernel.good ?? NO_GOOD) && !uiAutoUnder(app));
}
function uiAutoStep(app,deps) {
const before = uiAutoPhase(app);
deps.op(nextAuto(before).play);
return uiAutoPhase(app) !== before;
}
function uiAutoPort(app,deps) {
return {
step:() => uiAutoStep(app,deps),
isForced:() => uiAutoForced(app),
onDecision:uiAutoNoop,
isManual:() => Boolean(app.game.kernel.manual),
onManualChange:(manual) => { app.game.kernel = { ...app.game.kernel,manual }; },
onChange:() => uiRenderKeepingFocus(app),
intervalMs:deps.number === HALVE_PHASE ? HALVE_STEP_MS :undefined,
};
}
function uiAutoIdle(run) {
const { state } = run.snapshot();
return state !== 'running' && state !== 'paused';
}
function uiKernelAuto(app,deps) {
uiLinkStyle(STYLE_HREF);
const run = runToDecision(uiAutoPort(app,deps));
const start = function () {
const kernel = app.game.kernel;
if (autoReady(kernel.phase,kernel.good ?? NO_GOOD)) run.go();
};
const hint = function () {
const view = run.snapshot();
if (view.state !== 'decision' || view.manual) return '';
const move = nextAuto(uiAutoPhase(app));
return move && !move.forced ? move.hint :'';
};
return {
run,node:uiAutoRunControls(run).node,start,stop:() => run.destroy(),hint,handleKey:run.handleKey,
afterPress:() => { if (uiAutoIdle(run)) start(); },
};
}

export { uiKernelAuto };
