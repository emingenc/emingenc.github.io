import { NET_TEXTS, fillText } from '../game/rooms/data/net-texts.js';
import { bruteReads, netPar } from '../game/rooms/net.js';
import { uiArenaCard, uiArenaPaidLine } from './arena-shell.js';
import { uiEl } from './dom.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const REPLAY = { action: 'net-replay', label: 'REPLAY' };
const BACK = { action: 'rig-back', label: 'BACK TO GRID' };
const NEXT_ACTIONS = { w2: { action: 'net-wave2', label: 'WAVE 2' } };

function uiNetStar(index, stars) {
  const on = index < stars;
  return uiEl('span', { className: 'net-star' + (on ? ' is-on' : ''), text: on ? STAR_ON : STAR_OFF });
}
function uiNetStars(stars) {
  const cells = Array.from({ length: MAX_STARS }, (unused, index) => uiNetStar(index, stars));
  return uiEl('p', { className: 'net-stars', children: cells, attrs: { role: 'img', 'aria-label': stars + ' of ' + MAX_STARS + ' stars' } });
}
function uiNetScore(state) {
  return uiEl('p', { className: 'net-final-score', text: 'SCORE ' + state.score });
}
function uiNetLine(className, text) {
  return uiEl('p', { className: 'arena-card-line ' + className, text });
}
function uiNetValues(state) {
  return {
    steps: state.steps,
    n: state.stream.items.length,
    par: netPar(state.stream, state.wave),
    reads: bruteReads(state.stream, state.wave),
  };
}
function uiNetHow(values) {
  const summary = uiEl('summary', { className: 'net-how-summary', text: NET_TEXTS.card.how });
  const rule = uiNetLine('net-rule', NET_TEXTS.card.stars);
  const why = uiNetLine('net-why', fillText(NET_TEXTS.card.why, values));
  return uiEl('details', { className: 'net-how', children: [summary, rule, why] });
}
function uiNetWinBody(state, result) {
  const values = uiNetValues(state);
  const head = [uiNetStars(result.stars), uiNetScore(state), uiNetLine('net-used', fillText(NET_TEXTS.card.used, values))];
  return [...head, uiArenaPaidLine(result.rank, 'net-paid'), uiNetHow(values)].filter(Boolean);
}
function uiNetWinActions(result) {
  const next = NEXT_ACTIONS[result.nextMode];
  return [REPLAY, ...(next ? [next] : []), BACK];
}
function uiNetCard(app, result) {
  const state = app.rig.arena.state;
  if (!result.won) {
    const lines = [result.why].filter(Boolean);
    return uiArenaCard(app, { title: NET_TEXTS.card.failTitle, tone: 'fail', lines, body: [uiNetScore(state)], actions: [REPLAY, BACK] });
  }
  return uiArenaCard(app, { title: NET_TEXTS.card.title, body: uiNetWinBody(state, result), actions: uiNetWinActions(result) });
}

export { uiNetCard };
