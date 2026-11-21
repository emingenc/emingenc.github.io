import { TURRET_TEXTS, fillText } from '../game/rooms/data/turret-texts.js';
import { keyFor, turretTarget } from '../game/rooms/turret.js';


const REHEARSAL_ID = 'rehearsal';
const WATCH_STEP_MS = 2500;
const NO_SLOT = 0;
const FIRST_BAY = 0;

function uiRehearsalWatching(state) {
  return state.spec.id === REHEARSAL_ID && state.resolved < state.spec.watch;
}
function uiRehearsalFresh() {
  return { clock: 0 };
}
function uiRehearsalDue(arena, dt, landed) {
  if (!landed || !uiRehearsalWatching(arena.state)) return false;
  arena.rehearsal.clock += dt;
  if (arena.rehearsal.clock < WATCH_STEP_MS) return false;
  arena.rehearsal.clock = 0;
  return true;
}
function uiRehearsalMove(state) {
  return 'probe:' + FIRST_BAY + ':' + keyFor(state, FIRST_BAY);
}
function uiRehearsalMarked(state) {
  return uiRehearsalWatching(state) && state.bay[FIRST_BAY] ? keyFor(state, FIRST_BAY) : NO_SLOT;
}
function uiRehearsalLine(state) {
  const lead = state.bay[FIRST_BAY];
  const key = keyFor(state, lead);
  const values = { v: lead.v, t: turretTarget(state), key };
  if (!uiRehearsalWatching(state)) return fillText(TURRET_TEXTS.rehearsal.probe, values);
  return fillText(state.board[key] > 0 ? TURRET_TEXTS.rehearsal.watchPair : TURRET_TEXTS.rehearsal.watchStore, values);
}
function uiRehearsalRule(state) {
  const { watch, n } = state.spec;
  if (uiRehearsalWatching(state)) return fillText(TURRET_TEXTS.rehearsal.ruleWatch, { i: state.resolved + 1, w: watch });
  return fillText(TURRET_TEXTS.rehearsal.ruleProbe, { i: state.resolved - watch + 1, p: n - watch });
}

export { uiRehearsalWatching, uiRehearsalFresh, uiRehearsalDue, uiRehearsalMove, uiRehearsalMarked, uiRehearsalLine, uiRehearsalRule };
