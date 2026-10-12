import { TONE,cell,doneCounter,fresh,idle,moved,opens,slipped,solved } from './common.js';

const RUNS = Object.freeze([true,false,true,false,false,false,true,true,false,true,false,false]);
const SIZE = 3;
const PAR = 4;
const TITLE = 'SILL · 12 TEST RUNS';
const failing = (start) => RUNS.slice(start,start + SIZE).filter(Boolean).length;
const inWindow = (state,run) => run >= state.start && run < state.start + SIZE;

function start() {
return fresh({ start:0 });
}
function tap(state,index) {
if (!opens(state,index,RUNS.length)) return idle(state);
const patch = { moves:state.moves + 1 };
if (inWindow(state,index)) {
const count = failing(state.start);
if (count > 0) return slipped(state,'claim','this window has ' + count + ' failing. Slide on');
return solved(state,patch,'Runs ' + (state.start + 1) + '-' + (state.start + SIZE) + ' ran clean.');
}
if (index !== state.start + SIZE) return slipped(state,'slide','tap the run just after the window');
return moved(state,{ ...patch,start:state.start + 1 });
}
function runTone(state,run) {
if (state.finished && inWindow(state,run)) return TONE.good;
if (inWindow(state,run)) return RUNS[run] ? TONE.failIn :TONE.passIn;
return RUNS[run] ? TONE.fail :TONE.pass;
}
function view(state) {
const cells = RUNS.map((fails,run) => cell(fails ? 'FAIL' :'pass',runTone(state,run)));
const window = 'runs ' + (state.start + 1) + '-' + (state.start + SIZE) + ': ' + failing(state.start) + ' failing';
const status = state.finished ? doneCounter('moves',state.moves,PAR) :window + ' (par ' + PAR + ')';
return { title:TITLE,caption:'Find 3 runs with no FAIL. Slide, then claim.',cells,counter:state.note || status };
}

export { RUNS,SIZE,PAR,start,tap,view };
