import { beamPar } from './beam.js';
import { netPar } from './net.js';
import { pincerPar } from './pincer.js';
import { parOf } from './turret.js';


const MAX_STARS = 3;
const LOSS_LINE = 'STAR 1 needs the wave cleared.';

function times(count, one, many) {
  return count + ' ' + (count === 1 ? one : many);
}
function parLine(star, unit, par, steps) {
  return 'STAR ' + star + ' needs ' + par + ' ' + unit + ' or fewer. You took ' + steps + '.';
}
function wrongLine(state, noun) {
  return 'STAR 2 needs no wrong ' + noun + 's. You made ' + state.wrong + '.';
}
function turretGap(state, stars) {
  return stars < 2 ? wrongLine(state, 'lookup') : parLine(3, 'steps', parOf(state), state.steps);
}
function pincerGap(state, stars) {
  return stars < 2 ? wrongLine(state, 'move') : parLine(3, 'steps', pincerPar(state.stream), state.steps);
}
function shieldTowersGap(state, stars) {
  const need = stars === 1 ? 'at most one wrong plate' : 'no wrong plate';
  return 'STAR ' + (stars + 1) + ' needs ' + need + '. You made ' + state.wrong + '.';
}
function shieldGap(state, stars) {
  if (state.spec.towers) return shieldTowersGap(state, stars);
  if (stars < 2) return 'STAR 2 needs no false or missed REJECT. You made ' + (state.missedBreach + state.falseBreach) + '.';
  return 'STAR 3 needs one action per glyph. You slipped ' + times(state.slips, 'time', 'times') + '.';
}
function beamGap(state, stars) {
  if (stars < 2) return 'STAR 2 needs no heart lost. You lost ' + (state.bolt ? state.hits : state.decoys) + '.';
  const par = beamPar(state.wave);
  const misses = [];
  if (state.probes > par) misses.push('You took ' + state.probes + '.');
  if (state.slips > 0) misses.push('You slipped ' + times(state.slips, 'time', 'times') + '.');
  return 'STAR 3 needs ' + par + ' shots or fewer and no slip. ' + misses.join(' ');
}
function netGap(state, stars) {
  if (stars < 2) {
    const tears = state.tears || 0;
    const wasted = Math.max(0, state.wrong - tears);
    const said = [];
    if (tears > 0) said.push('tore ' + times(tears, 'time', 'times'));
    if (wasted > 0) said.push('wasted ' + times(wasted, 'move', 'moves'));
    const par = netPar(state.stream, state.rules);
    return 'STAR 2 needs no tear and no wasted move. You ' + said.join(' and ') + ' (' + state.steps + ' moves; perfect is ' + par + ').';
  }
  return parLine(3, 'moves', netPar(state.stream, state.rules), state.steps);
}
const GAPS = { turret: turretGap, pincer: pincerGap, shield: shieldGap, beam: beamGap, net: netGap };

function starGapLine(room, state, stars) {
  if (!(stars >= 1 && stars < MAX_STARS)) return null;
  return GAPS[room](state, stars);
}

export { starGapLine, LOSS_LINE };
