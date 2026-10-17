
const SIZE = 128;
const HALF = 2;
const SKIP_SLACK = 2;
const LAST_REF = 86;
const FIRST_GREY = 63;
const SECOND_GREY = 79;
const GREY_ENTRIES = [FIRST_GREY,SECOND_GREY];
const HALVE = Object.freeze({ size:SIZE,lastRef:LAST_REF,grey:Object.freeze(GREY_ENTRIES),budget:Math.ceil(Math.log2(SIZE)) + SKIP_SLACK });
const bruteChecks = SIZE;
const READINGS = Object.freeze({ ref:'REF',gone:'GONE',grey:'?' });
const MISTAKE_KINDS = new Set(['bad-split']);
const SOLVE_FACTOR = 2;

function createHalve(puzzle = HALVE) {
return { lo:0,hi:puzzle.size - 1,shots:0,skips:0,wrong:0,status:'running',last:null };
}
function halveCells(state) {
return { lo:state.lo,hi:state.hi };
}
function isGrey(entry,puzzle = HALVE) {
return puzzle.grey.includes(entry);
}
function halveReading(entry,puzzle = HALVE) {
if (isGrey(entry,puzzle)) return READINGS.grey;
return entry <= puzzle.lastRef ? READINGS.ref :READINGS.gone;
}
function lowerMiddle(state) {
return Math.floor((state.lo + state.hi) / HALF);
}
function readable(state,entry,puzzle) {
return entry >= state.lo && entry <= state.hi && !isGrey(entry,puzzle);
}
function halveMiddle(state,puzzle = HALVE) {
const middle = lowerMiddle(state);
const near = Array.from({ length:state.hi - state.lo + 1 },(unused,gap) => [middle - gap,middle + gap]).flat();
return near.find((entry) => readable(state,entry,puzzle)) ?? middle;
}
function leftAfter(state,shot) {
return Math.max(shot - state.lo + 1,state.hi - shot);
}
function accepted(state,shot,puzzle) {
const nudge = state.last === lowerMiddle(state) && Math.abs(shot - state.last) === 1;
return shot === lowerMiddle(state) || shot === halveMiddle(state,puzzle) || nudge;
}
function outcome(state,kind,note) {
return { state,kind,hurt:false,note };
}
function rangeText(state) {
return state.lo + '..' + state.hi;
}
function skipNote(state,shot,puzzle) {
const lost = 'Entry ' + shot + ' is grey: unreadable. Shot lost.';
if (shot !== lowerMiddle(state)) return lost;
const near = [shot - 1,shot + 1].filter((entry) => readable(state,entry,puzzle));
return lost + ' Nudge to ' + (near.length > 0 ? near.join(' or ') :'another entry') + '.';
}
function badSplit(state,shot) {
const note = 'Shot entry ' + shot + ' of ' + rangeText(state) + ' -> ' + leftAfter(state,shot) + ' left. Middle leaves ' + leftAfter(state,lowerMiddle(state)) + '.';
return { ...outcome({ ...state,shots:state.shots + 1,wrong:state.wrong + 1 },'bad-split',note),hurt:true };
}
function land(state,shot,puzzle) {
const ref = halveReading(shot,puzzle) === READINGS.ref;
const next = { ...state,lo:ref ? shot + 1 :state.lo,hi:ref ? state.hi :shot,shots:state.shots + 1,last:null };
if (next.lo !== next.hi) return outcome(next,ref ? 'ref' :'gone','Entry ' + shot + ' reads ' + halveReading(shot,puzzle) + '. LIVE ' + rangeText(next) + '.');
return outcome({ ...next,status:'won' },'win','Entry ' + next.lo + ' is the first GONE. Found in ' + next.shots + ' shots.');
}
function applyHalve(state,shot,puzzle = HALVE) {
if (state.status !== 'running') return outcome(state,'idle','');
if (!Number.isInteger(shot) || shot < state.lo || shot > state.hi) return outcome(state,'outside','Entry ' + shot + ' is not live. LIVE ' + rangeText(state) + '.');
if (isGrey(shot,puzzle)) return outcome({ ...state,shots:state.shots + 1,skips:state.skips + 1,last:shot },'skip',skipNote(state,shot,puzzle));
return accepted(state,shot,puzzle) ? land(state,shot,puzzle) :badSplit(state,shot);
}
function solveHalve(puzzle = HALVE) {
const shots = [];
let state = createHalve(puzzle);
while (state.status === 'running' && shots.length < puzzle.size * SOLVE_FACTOR) {
const shot = state.last === null ? lowerMiddle(state) :halveMiddle(state,puzzle);
shots.push(shot);
state = applyHalve(state,shot,puzzle).state;
}
return { shots,skips:state.skips,par:puzzle.budget };
}
function halveMistake(kind) {
return MISTAKE_KINDS.has(kind);
}
function readout(state) {
return { range:'LIVE ' + rangeText(state),left:state.hi - state.lo + 1,shots:state.shots,skips:state.skips };
}

export { HALVE,bruteChecks,createHalve,halveCells,isGrey,halveReading,halveMiddle,applyHalve,solveHalve,halveMistake,readout };
