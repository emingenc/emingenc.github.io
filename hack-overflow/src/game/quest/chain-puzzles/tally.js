import { TONE,cell,doneCounter,fresh,idle,moved,opens,slipped,solved } from './common.js';

const RECEIPT = 4471;
const BOXES = 10;
const BOX = RECEIPT % BOXES;
const ASK = BOXES;
const PAR = 2;
const TITLE = 'TALLY · RECEIPT #' + RECEIPT;
const held = (box) => RECEIPT - BOX + box;

function start() {
return fresh({ asked:false,opened:[] });
}
function tap(state,index) {
if (!opens(state,index,ASK + 1)) return idle(state);
if (index === ASK) {
if (state.asked) return slipped(state,'ask','the index is already lit');
return moved(state,{ asked:true,moves:state.moves + 1 },'INDEX: ' + RECEIPT + ' mod ' + BOXES + ' = box ' + BOX);
}
if (state.opened.includes(index)) return slipped(state,'rescan','you checked box ' + index + ' twice');
const patch = { opened:[...state.opened,index],moves:state.moves + 1 };
if (index === BOX) return solved(state,patch,'Box ' + BOX + ' holds #' + RECEIPT + '.');
return slipped({ ...state,...patch },'rescan','box ' + index + ' holds #' + held(index) + ', not ' + RECEIPT);
}
function boxTone(state,box) {
if (state.finished && box === BOX) return TONE.good;
if (state.opened.includes(box)) return TONE.bad;
return state.asked && box === BOX ? TONE.lit :TONE.plain;
}
function view(state) {
const cells = Array.from({ length:BOXES },(unused,box) => cell(state.opened.includes(box) ? '#' + held(box) :String(box),boxTone(state,box)));
cells.push(cell('ASK INDEX',state.asked || state.finished ? TONE.dim :TONE.plain));
let caption = 'Ten boxes, one receipt. Ask the index.';
if (state.asked) caption = RECEIPT + ' mod ' + BOXES + ' = box ' + BOX + '. Open it.';
const status = state.finished ? doneCounter('lookups',state.moves,PAR) :'lookups ' + state.moves + ' (par ' + PAR + ')';
return { title:TITLE,caption,cells,counter:state.note || status };
}

export { RECEIPT,BOXES,BOX,PAR,start,tap,view };
