import { BEAM_WAVES,BUDGET_SLACK,COMBO_CAP,SCORE } from './data/beam-wave.js';


function waveOf(wave) {
const spec = BEAM_WAVES[wave];
if (!spec) throw new RangeError('unknown beam wave: ' + wave);
return spec;
}
function beamPar(wave) {
return Math.ceil(Math.log2(waveOf(wave).n));
}
function beamBudget(wave) {
return beamPar(wave) + BUDGET_SLACK;
}
function liveCells(state) {
return Array.from({ length:state.hi - state.lo + 1 },(_,index) => state.lo + index);
}
function isLive(state,cell) {
return Number.isInteger(cell) && cell >= state.lo && cell <= state.hi;
}
function middleOf(state) {
return Math.floor((state.lo + state.hi) / 2);
}
function sidesOf(state,cell) {
return { down:cell - state.lo + BEAM_WAVES[state.wave].shotStays,up:state.hi - cell };
}
function worstSide(state,cell) {
const sides = sidesOf(state,cell);
return Math.max(sides.down,sides.up);
}
function bestSplit(state) {
return Math.min(...liveCells(state).map((cell) => worstSide(state,cell)));
}
function reject(turn,toast) {
turn.state.last = { move:turn.move,ok:false,kind:'reject',toast };
return turn.state;
}
function payShot(state,shot,play) {
if (shot.slip) {
state.slips += 1;
state.combo = 0;
return 0;
}
state.combo += 1;
state.maxCombo = Math.max(state.maxCombo,state.combo);
const points = Math.round(SCORE.shot * Math.min(state.combo,COMBO_CAP) * play.pace);
state.score += points;
return points;
}
function loseHearts(state,count) {
state.hearts -= count;
state.hits += count;
}
function endOf(state) {
if (state.lo === state.hi) {
state.status = 'won';
state.score += SCORE.heart * state.hearts;
return 'lock';
}
const reason = state.hearts <= 0 ? 'hearts' :state.probes >= beamBudget(state.wave) ? 'shots' :'';
if (reason) state.status = 'lost';
return reason;
}

export { waveOf,beamPar,beamBudget,liveCells,isLive,middleOf,sidesOf,worstSide,bestSplit,reject,payShot,loseHearts,endOf };
