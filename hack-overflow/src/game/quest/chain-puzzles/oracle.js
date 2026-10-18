import { TONE,cell,doneCounter,idle,moved,opens,slipped,solved } from './common.js';

const FIRST_BAD = 41;
const LAST = 63;
const PAR = 6;
const COLUMNS = 7;
const TITLE = 'ORACLE-7 · COMMITS 0..' + LAST;
const CAPTION = 'Commit 0 is green, 63 is red. Tap one to test it.';

function start(bad = FIRST_BAD) {
return { bad,lo:1,hi:LAST,seen:{ [LAST]:true },probes:0,slips:0,note:null,finished:false };
}
function isRed(state,commit) {
return commit >= state.bad;
}
function tap(state,index) {
if (!opens(state,index,LAST)) return idle(state);
const commit = index + 1;
if (commit < state.lo || commit >= state.hi) return slipped(state,'test','commit ' + commit + ' is already known ' + (commit < state.lo ? 'green' :'red'));
const probes = state.probes + 1;
const red = isRed(state,commit);
const range = red ? { hi:commit } :{ lo:commit + 1 };
const patch = { ...range,seen:{ ...state.seen,[commit]:red },probes };
const lo = range.lo ?? state.lo;
if (lo === (range.hi ?? state.hi)) return solved(state,patch,'First bad commit: #' + lo + '.');
return moved(state,patch);
}
function commitTone(state,commit) {
if (state.finished && commit === state.lo) return TONE.lit;
if (commit in state.seen) return state.seen[commit] ? TONE.fail :TONE.pass;
return commit >= state.lo && commit <= state.hi ? TONE.plain :TONE.dim;
}
function view(state) {
const cells = Array.from({ length:LAST },(unused,index) => cell(String(index + 1),commitTone(state,index + 1)));
if (state.finished) return { title:TITLE,caption:'First bad commit: #' + state.lo + '.',cells,columns:COLUMNS,counter:doneCounter('tests',state.probes,PAR) };
const status = 'tests ' + state.probes + ' (par ' + PAR + ') · live ' + state.lo + '..' + state.hi;
return { title:TITLE,caption:CAPTION,cells,columns:COLUMNS,counter:state.note || status };
}

export { FIRST_BAD,LAST,PAR,start,tap,view };
