import { waveClockOn } from '../game/rooms/turret.js';
import { uiRenderApp, uiRenderKeepingFocus } from './app.js';
import { uiTurretTick } from './turret-flow.js';
import { uiTurretPaint } from './turret-scene.js';


const MAX_DT_MS = 100;
const FALLBACK_FRAME_MS = 16;
const NO_HANDLE = null;

function uiTurretDefaultNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
function uiTurretDefaultRaf(callback) {
  if (typeof window.requestAnimationFrame === 'function') return window.requestAnimationFrame(callback);
  return window.setTimeout(function () { callback(uiTurretDefaultNow()); }, FALLBACK_FRAME_MS);
}
function uiTurretDefaultCancel(handle) {
  if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(handle);
  else window.clearTimeout(handle);
}
const UI_TURRET_DEFAULT_CLOCK = { raf: uiTurretDefaultRaf, cancel: uiTurretDefaultCancel, now: uiTurretDefaultNow };
const uiTurretLoop = { handle: NO_HANDLE, last: 0, app: null, clock: UI_TURRET_DEFAULT_CLOCK };

function uiTurretSetClock(clock) {
  uiTurretLoop.clock = clock || UI_TURRET_DEFAULT_CLOCK;
}
function uiTurretNow() {
  return uiTurretLoop.clock.now();
}
function uiTurretLive(app) {
  const arena = app.rig && app.rig.arena;
  return Boolean(arena && arena.view === 'play' && !app.menuOpen);
}
function uiTurretRemount(app) {
  const arena = app.rig.arena;
  if (arena.banner || arena.view !== 'play') uiRenderApp(app);
  else uiRenderKeepingFocus(app);
}
function uiTurretStep(app, dt, now) {
  const arena = app.rig.arena;
  const held = arena.playMs;
  const changed = uiTurretTick(app, dt, now);
  if (!waveClockOn(arena.state)) arena.playMs = held;
  return changed;
}
function uiTurretBook() {
  uiTurretLoop.handle = uiTurretLoop.clock.raf(uiTurretFrame);
}
function uiTurretFrame(stamp) {
  const loop = uiTurretLoop;
  loop.handle = NO_HANDLE;
  const app = loop.app;
  if (!app || !uiTurretLive(app)) return;
  const now = Number.isFinite(stamp) ? stamp : loop.clock.now();
  const dt = Math.min(MAX_DT_MS, Math.max(0, now - loop.last));
  loop.last = now;
  if (uiTurretStep(app, dt, now)) uiTurretRemount(app);
  else uiTurretPaint(app, now);
  if (loop.app === app && uiTurretLive(app) && loop.handle === NO_HANDLE) uiTurretBook();
}
function uiTurretStop() {
  const loop = uiTurretLoop;
  if (loop.handle !== NO_HANDLE) loop.clock.cancel(loop.handle);
  loop.handle = NO_HANDLE;
  loop.app = null;
}
function uiTurretStart(app) {
  const loop = uiTurretLoop;
  const running = loop.app === app && loop.handle !== NO_HANDLE;
  if (!running) {
    uiTurretStop();
    loop.app = app;
    loop.last = loop.clock.now();
  }
  uiTurretPaint(app, loop.last);
  if (!running) uiTurretBook();
}

export { uiTurretSetClock, uiTurretNow, uiTurretFrame, uiTurretStart, uiTurretStop };
