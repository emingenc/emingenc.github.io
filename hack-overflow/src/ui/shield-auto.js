import { uiRenderApp, uiRenderKeepingFocus } from './app.js';
import { runToDecision, uiAutoRunControls } from './auto-run.js';
import { uiShieldAutoStep, uiShieldCoachText, uiShieldForced, uiShieldSpoken, uiShieldTime } from './shield-flow.js';


const START_MS = 250;

function uiShieldPaint(app, arena) {
  if (arena.view === 'card') uiRenderApp(app);
  else uiRenderKeepingFocus(app);
}
function uiShieldCalled(app, arena, reason) {
  arena.stalled = reason === 'stalled';
  if (app.rig.arena !== arena || arena.view !== 'play') return;
  arena.coach = uiShieldCoachText(arena);
  app.pendingAnnounce = uiShieldSpoken(arena);
  uiShieldPaint(app, arena);
}
function uiShieldManualChanged(app, arena, manual) {
  arena.manual = manual;
  arena.usedManual = arena.usedManual || manual;
  app.autoManual = manual;
  if (app.rig.arena === arena) uiShieldPaint(app, arena);
}
function uiShieldAutoPort(app, arena) {
  return {
    step: () => {
      const moved = uiShieldAutoStep(app, uiShieldTime());
      if (moved) uiShieldPaint(app, arena);
      return moved;
    },
    isForced: () => app.rig.arena === arena && uiShieldForced(app),
    onDecision: (reason) => uiShieldCalled(app, arena, reason),
    isManual: () => arena.manual,
    onManualChange: (manual) => uiShieldManualChanged(app, arena, manual),
  };
}
function uiShieldAutoOf(app) {
  const arena = app.rig.arena;
  if (!arena.auto) {
    const run = runToDecision(uiShieldAutoPort(app, arena));
    arena.auto = { run, controls: uiAutoRunControls(run) };
  }
  return arena.auto;
}
function uiShieldKickNow(app, arena) {
  arena.kickTimer = 0;
  if (app.rig.arena !== arena || arena.manual || arena.stalled || !uiShieldForced(app)) return;
  const { run } = uiShieldAutoOf(app);
  const state = run.snapshot().state;
  if (state === 'idle' || state === 'decision') run.go();
}
function uiShieldAutoKick(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || arena.view !== 'play' || arena.manual || arena.kickTimer) return;
  arena.kickTimer = window.setTimeout(() => uiShieldKickNow(app, arena), START_MS);
}
function uiShieldAutoStop(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena) return;
  if (arena.kickTimer) window.clearTimeout(arena.kickTimer);
  arena.kickTimer = 0;
  if (arena.auto) arena.auto.run.destroy();
  arena.auto = null;
}
function uiShieldAutoPause(app) {
  const arena = app.rig && app.rig.arena;
  if (arena && arena.auto) arena.auto.run.pause();
}
function uiShieldAutoKey(app, event) {
  const arena = app.rig.arena;
  return Boolean(arena.auto) && arena.auto.run.handleKey(event);
}

export { uiShieldAutoOf, uiShieldAutoKick, uiShieldAutoStop, uiShieldAutoPause, uiShieldAutoKey };
