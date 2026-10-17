import { applyPincer, createPincer, pincerMoves } from './pincer.js';
import { pillarsOf, specOf } from './pincer-base.js';
import { lineFrom, orFire, solvePincer, wanted } from './pincer-solver.js';


const MOVE_CAP = 100;

function sortedLine(stream) {
  const sorted = applyPincer(createPincer(stream), 'sort');
  return ['sort', ...lineFrom(sorted)];
}
function shorterMove(state) {
  const pillars = pillarsOf(state);
  return pillars[state.l] <= pillars[state.r] ? 'l' : 'r';
}
function sweepMove(state, wall) {
  const moves = pincerMoves(state);
  if (moves.includes('bank')) return 'bank';
  return moves.includes(wall(state)) ? wall(state) : 'fire';
}
function tallerMove(state) {
  const pillars = pillarsOf(state);
  return pillars[state.r] > pillars[state.l] ? 'r' : 'l';
}
function playWith(stream, bot) {
  let state = createPincer(stream);
  const moves = [];
  while (state.status === 'running' && moves.length < MOVE_CAP) {
    const move = bot(state);
    moves.push(move);
    state = applyPincer(state, move);
  }
  return moves;
}
function solveWave(stream) {
  const spec = specOf(stream);
  if (spec.dam) return playWith(stream, shorterSweepBot);
  if (!spec.sort) return solvePincer(stream);
  return sortedLine(stream);
}
function shorterSweepBot(state) {
  return sweepMove(state, shorterMove);
}
function blindPinchBot(state) {
  return orFire(state, wanted(state));
}
function tallerWallBot(state) {
  return sweepMove(state, tallerMove);
}
function noBankBot(state) {
  const moves = pincerMoves(state);
  return moves.includes(shorterMove(state)) ? shorterMove(state) : 'fire';
}
function earlyFireBot(state) {
  return pincerMoves(state).includes('bank') ? 'bank' : 'fire';
}

export { solveWave, blindPinchBot, shorterSweepBot, tallerWallBot, noBankBot, earlyFireBot };
