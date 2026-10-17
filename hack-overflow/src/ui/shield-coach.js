import { END_GLYPH } from '../game/rooms/data/shield-wave1.js';
import { NEXT_TALLER_ID, THIRD_WAVE } from '../game/quest/third-wave.js';
import { SHIELD_TEXTS } from '../game/rooms/data/shield-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { answerFor, glyphOf, isOpener, shieldHint } from '../game/rooms/shield.js';


const RIGHT_KINDS = new Set(['push', 'pop', 'breach', 'clear']);
const HINT_YIELDS = new Set(['breach', 'clear']);

function uiShieldTop(state) {
  const top = state.stack[state.stack.length - 1];
  if (top === undefined) return '';
  return state.spec.towers ? state.wave[state.vi][top] : top;
}
function uiShieldValues(state) {
  return {
    g: glyphOf(state), top: uiShieldTop(state), depth: state.stack.length, o: state.vi + 1, n: state.wave.length, combo: state.combo,
  };
}
const COACH = SHIELD_TEXTS.coach;
function mixedNow(state, arena) {
  return state.spec.plainVolleys > 0 && state.vi === state.spec.plainVolleys && (!arena.manual || state.gi === 0);
}
const BRACKET_LINES = [
  { id: 'mixed', when: mixedNow, text: COACH.mixed },
  { id: 'end', when: (state) => glyphOf(state) === END_GLYPH, text: COACH.end, auto: COACH.endAuto },
  { id: 'open', when: (state) => isOpener(glyphOf(state)), text: COACH.open, auto: COACH.openAuto },
  { id: 'close', when: (state) => answerFor(state) === 'pop', text: COACH.close },
  { id: 'breach', when: (state) => answerFor(state) === 'breach' && state.stack.length > 0, text: COACH.breach },
  { id: 'stray', when: (state) => answerFor(state) === 'breach', text: COACH.stray },
];
const FOG_LINE = { id: 'fog', when: (state) => state.vi === 0 && state.gi === 0, text: COACH.fog };
function isTie(state) {
  return state.stack.length > 0 && uiShieldTop(state) === glyphOf(state);
}
function towersNow(state, arena) {
  if (arena.manual) return state.vi === 0 && state.gi <= (arena.ask === true ? 1 : 0);
  return arena.ask !== true || arena.seen.ask === true;
}
const TOWER_LINES = [
  { id: 'ask', when: (state, arena) => arena.ask === true && state.vi === 0 && state.gi === 0, text: THIRD_WAVE[NEXT_TALLER_ID].ask },
  { id: 'towerEnd', when: (state) => Boolean(state.last && state.last.blocked && state.last.leftovers > 0), text: COACH.towerEnd },
  { id: 'towers', when: towersNow, text: COACH.towers, auto: COACH.towersAuto },
  { id: 'taller', when: (state) => answerFor(state) === 'pop', text: COACH.taller },
  { id: 'tie', when: isTie, text: COACH.tie },
];
function teachLines(state) {
  if (state.spec.towers) return TOWER_LINES;
  return state.spec.fog ? [FOG_LINE, ...BRACKET_LINES] : BRACKET_LINES;
}
function uiShieldTeach(arena) {
  const state = arena.state;
  const line = teachLines(state).find((item) => !arena.seen[item.id] && item.when(state, arena));
  if (!line) return '';
  arena.seen[line.id] = true;
  const values = uiShieldValues(state);
  const left = state.last ? state.last.leftovers : 0;
  return fillText(!arena.manual && line.auto ? line.auto : line.text, Object.assign(values, { k: left }));
}
function towerOutcome(last) {
  if (last.blocked) return COACH.towerClear;
  return last.kind === 'pop' ? COACH.popTower : COACH.push;
}
function uiShieldOutcomeLine(state) {
  const last = state.last;
  if (!last || !RIGHT_KINDS.has(last.kind)) return '';
  const values = Object.assign(uiShieldValues(state), { g: last.glyph, depth: last.depth, combo: last.combo ?? state.combo, top: last.top ?? uiShieldTop(state), k: last.leftovers });
  if (last.kind === 'breach') return COACH.deflect;
  return fillText(state.spec.towers ? towerOutcome(last) : COACH[last.kind], values);
}
function plainLine(state) {
  if (!state.spec.towers) return COACH.plain;
  return state.stack.length > 0 ? COACH.plainTower : COACH.plainTowerEmpty;
}
function uiShieldCoachText(arena) {
  const state = arena.state;
  if (state.status !== 'running') return '';
  const teach = uiShieldTeach(arena);
  if (teach) return teach;
  const note = arena.manual ? '' : uiShieldNote(arena);
  if (shieldHint(state) && !HINT_YIELDS.has(state.last?.kind) && !note) return COACH.hint;
  return note || uiShieldSaid(arena);
}
function uiShieldSaid(arena) {
  const outcome = arena.manual ? uiShieldOutcomeLine(arena.state) : '';
  return outcome || fillText(plainLine(arena.state), uiShieldValues(arena.state));
}
function uiShieldNote(arena) {
  const note = arena.deflected === true ? COACH.deflect : '';
  arena.deflected = false;
  return note;
}
function uiShieldSpoken(arena) {
  const state = arena.state;
  if (state.status !== 'running') return '';
  return fillText(COACH.announce, uiShieldValues(state));
}

export { uiShieldTop, uiShieldCoachText, uiShieldSpoken };
