import { TONE,cell,doneCounter,fresh,idle,moved,opens,slipped,solved } from './common.js';

const RUNS = Object.freeze([true,false,true,false,true,false,false,true,false,false,false,false]);
const SIZE = 3;
const PAR = 3;
const TITLE = 'SILL · 12 TEST RUNS';
const LAST_START = RUNS.length - SIZE;
const failing = (start) => RUNS.slice(start,start + SIZE).filter(Boolean).length;
const lastFailing = (start) => start + RUNS.slice(start,start + SIZE).lastIndexOf(true);
const inWindow = (state,run) => run >= state.start && run < state.start + SIZE;
const miss = (state,text) => slipped({ ...state,moves:state.moves + 1 },'jump',text);
const span = (from,to) => (from === to ? 'run ' + from :'runs ' + from + '-' + to);

function start() {
return fresh({ start:0 });
}
function tap(state,index) {
if (!opens(state,index,RUNS.length)) return idle(state);
if (index <= state.start) return miss(state,'that window is behind you');
if (index > LAST_START) return miss(state,'no room for a window of ' + SIZE + ' there');
const next = lastFailing(state.start) + 1;
if (index > next) return miss(state,'you skipped ' + span(next + 1,index) + ': that window may be clean');
const patch = { moves:state.moves + 1,start:index };
if (failing(index) > 0) return moved(state,patch);
return solved(state,patch,'Runs ' + (index + 1) + '-' + (index + SIZE) + ' ran clean.');
}
function runTone(state,run) {
if (run >= state.start + SIZE) return TONE.dim;
if (state.finished && inWindow(state,run)) return TONE.good;
if (inWindow(state,run)) return RUNS[run] ? TONE.failIn :TONE.passIn;
return RUNS[run] ? TONE.fail :TONE.pass;
}
function view(state) {
const cells = RUNS.map((fails,run) => cell((run + 1) + (run >= state.start + SIZE ? ' ?' :fails ? ' FAIL' :' pass'),runTone(state,run)));
const window = 'runs ' + (state.start + 1) + '-' + (state.start + SIZE) + ': ' + failing(state.start) + ' failing';
const status = state.finished ? doneCounter('moves',state.moves,PAR) :'moves ' + state.moves + ' (par ' + PAR + ') . ' + window;
return { title:TITLE,caption:'Find a 3-run window with no FAIL. Tap where it should start.',cells,counter:state.note || status };
}

export { RUNS,SIZE,PAR,start,tap,view };
