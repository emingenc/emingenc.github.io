const TONE = Object.freeze({
plain:'plain',lit:'lit',good:'good',bad:'bad',dim:'dim',pass:'pass',fail:'fail',passIn:'pass-in',failIn:'fail-in',
});

function cell(label,tone) {
return { label,tone };
}
function fresh(own) {
return { ...own,moves:0,slips:0,note:null,finished:false };
}
function opens(state,index,count) {
return !state.finished && Number.isInteger(index) && index >= 0 && index < count;
}
function idle(state) {
return { state,line:null,done:false,slip:false };
}
function moved(state,patch,line = null) {
return { state:{ ...state,...patch,note:null },line,done:false,slip:false };
}
function solved(state,patch,line) {
return { state:{ ...state,...patch,note:null,finished:true },line,done:true,slip:false };
}
function slipped(state,label,text) {
const slips = state.slips + 1;
return { state:{ ...state,slips,note:label + ' #' + slips + ': ' + text },line:null,done:false,slip:true };
}
function doneCounter(what,moves,par) {
return moves <= par ? 'done in ' + moves + ' ' + what + ' (par ' + par + ')' :'done in ' + moves + ' ' + what + ': over par ' + par;
}

export { TONE,cell,fresh,opens,idle,moved,solved,slipped,doneCounter };
