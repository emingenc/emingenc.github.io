import { TONE,cell,doneCounter,fresh,idle,moved,opens,slipped,solved } from './common.js';

const LOG = Object.freeze([1,4,7,9,11,13,17,20,24]);
const TARGET = 17;
const PAR = 4;
const L_CELL = 0;
const R_CELL = 1;
const TITLE = 'TWINS · TARGET ' + TARGET;
const sumOf = (state) => LOG[state.l] + LOG[state.r];

function start() {
return fresh({ l:0,r:LOG.length - 1 });
}
function tap(state,index) {
if (!opens(state,index,R_CELL + 1)) return idle(state);
const over = sumOf(state) > TARGET;
if (index === L_CELL && over) return slipped(state,'move','moving L grows the sum, and it is too big');
if (index === R_CELL && !over) return slipped(state,'move','moving R shrinks the sum, and it is too small');
const patch = index === L_CELL ? { l:state.l + 1,moves:state.moves + 1 } :{ r:state.r - 1,moves:state.moves + 1 };
const next = { ...state,...patch };
if (sumOf(next) === TARGET) return solved(state,patch,LOG[next.l] + ' + ' + LOG[next.r] + ' = ' + TARGET + '. Found the pair.');
return moved(state,patch);
}
function view(state) {
const row = LOG.map((id,at) => (at === state.l || at === state.r ? '[' + id + ']' :String(id))).join(' ');
const sum = LOG[state.l] + ' + ' + LOG[state.r] + ' = ' + sumOf(state);
const status = state.finished ? doneCounter('moves',state.moves,PAR) :sum + ', target ' + TARGET + ' (par ' + PAR + ')';
const tone = state.finished ? TONE.good :TONE.lit;
return {
title:TITLE,caption:row,cells:[cell('L ' + LOG[state.l],tone),cell('R ' + LOG[state.r],tone)],counter:state.note || status,
};
}

export { LOG,TARGET,PAR,start,tap,view };
