import { uiRenderApp, uiRenderKeepingFocus } from './app.js';
import { runToDecision, uiAutoRunControls } from './auto-run.js';
import { uiNetAutoForced, uiNetAutoStep, uiNetSpoken } from './net-flow.js';


const START_DELAY_MS = 700;
const NUDGE_DELAY_MS = 0;
const uiAutoPref = { manual: false };

function uiNetAutoLive(app, arena) {
  return Boolean(app.rig) && app.rig.arena === arena && app.screen === 'rig';
}
function uiNetAutoPaint(app, arena) {
  if (arena.view === 'play') return uiRenderKeepingFocus(app);
  arena.autoNode = null;
  uiRenderApp(app);
}
function uiNetAutoMove(app, arena) {
  if (!uiNetAutoLive(app, arena) || !uiNetAutoStep(app)) return false;
  arena.autoMoved = true;
  uiNetAutoPaint(app, arena);
  return true;
}
function uiNetAutoStopped(app, arena) {
  if (!uiNetAutoLive(app, arena)) return;
  if (arena.view !== 'play') return uiNetAutoStop(arena);
  if (!arena.autoMoved) return;
  arena.autoMoved = false;
  app.pendingAnnounce = uiNetSpoken(arena) + ' ' + arena.coach;
  if (!arena.autoQuiet) uiRenderKeepingFocus(app);
}

function uiNetAutoStop(arena) {
  if (!arena || !arena.auto) return;
  window.clearTimeout(arena.autoStart);
  arena.auto.destroy();
  arena.auto = null;
  arena.autoNode = null;
}
function uiNetAutoAttach(app) {
  const arena = app.rig.arena;
  arena.auto = runToDecision({
    step: () => uiNetAutoMove(app, arena),
    isForced: () => uiNetAutoLive(app, arena) && arena.view === 'play' && uiNetAutoForced(app),
    onDecision: () => uiNetAutoStopped(app, arena),
    isManual: () => uiAutoPref.manual,
    onManualChange: (manual) => { uiAutoPref.manual = manual; },
  });
  arena.autoNode = uiAutoRunControls(arena.auto).node;
  arena.autoStart = window.setTimeout(() => arena.auto && arena.auto.go(), START_DELAY_MS);
}
function uiNetAutoMoved(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || !arena.auto) return;
  if (arena.view !== 'play') return uiNetAutoStop(arena);
  if (arena.auto.snapshot().state === 'paused') return null;
  arena.autoQuiet = true;
  arena.autoMoved = false;
  arena.auto.go();
  arena.autoQuiet = false;
  return null;
}
function uiNetAutoNudge(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || !arena.auto || arena.autoNudged) return;
  const view = arena.auto.snapshot();
  if (view.state !== 'decision' || view.manual || !uiNetAutoForced(app)) return;
  arena.autoNudged = true;
  window.setTimeout(() => {
    arena.autoNudged = false;
    if (uiNetAutoLive(app, arena) && arena.auto) arena.auto.go();
  }, NUDGE_DELAY_MS);
}
function uiNetAutoKey(app, event) {
  const arena = app.rig && app.rig.arena;
  return Boolean(arena && arena.auto && arena.auto.handleKey(event));
}

export { uiNetAutoAttach, uiNetAutoStop, uiNetAutoMoved, uiNetAutoNudge, uiNetAutoKey };
