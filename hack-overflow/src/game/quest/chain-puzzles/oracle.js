import { TONE,cell,doneCounter,idle,moved,slipped,solved } from './common.js';

const FIRST_BAD = 41;
const LAST = 63;
const PAR = 6;
const GOOD_CELL = 0;
const BAD_CELL = 1;
const TITLE = 'ORACLE-7 · COMMITS 0..' + LAST;
const middle = (state) => (state.lo + state.hi) >> 1;

function start(bad = FIRST_BAD) {
return { bad,lo:1,hi:LAST,probes:0,slips:0,note:null,finished:false };
}
function isRed(state,commit) {
return commit >= state.bad;
}
function tap(state,index) {
if (state.finished || (index !== GOOD_CELL && index !== BAD_CELL)) return idle(state);
const probe = middle(state);
const red = isRed(state,probe);
const probes = state.probes + 1;
if (red !== (index === BAD_CELL)) return slipped({ ...state,probes },'probe','commit ' + probe + ' is ' + (red ? 'red: BAD' :'green: GOOD'));
const range = red ? { hi:probe } :{ lo:probe + 1 };
const next = { ...state,...range };
if (next.lo === next.hi) return solved(state,{ ...range,probes },'First bad commit: #' + next.lo + '.');
return moved(state,{ ...range,probes });
}
function view(state) {
const cells = [cell('GOOD',TONE.plain),cell('BAD',TONE.plain)];
if (state.finished) return { title:TITLE,caption:'First bad commit: #' + state.lo + '.',cells,counter:doneCounter('probes',state.probes,PAR) };
const probe = middle(state);
const status = 'probes ' + state.probes + ' (par ' + PAR + ') · live ' + state.lo + '..' + state.hi;
return { title:TITLE,caption:'Testing commit ' + probe + ': tests are ' + (isRed(state,probe) ? 'RED.' :'GREEN.'),cells,counter:state.note || status };
}

export { FIRST_BAD,LAST,PAR,start,tap,view };
