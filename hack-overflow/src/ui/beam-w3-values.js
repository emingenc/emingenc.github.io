import { rotatedEnds } from '../game/rooms/beam-rotated.js';


const UNKNOWN = '?';

function probedCells(state) {
const waiting = state.pending ? [state.pending.cell] :[];
return state.log.map((entry) => entry.cell).concat(waiting);
}
function uiBeamW3Known(state,cell) {
return cell === state.lo || cell === state.hi || probedCells(state).includes(cell);
}
function uiBeamW3ValueText(state,cell) {
return uiBeamW3Known(state,cell) ? String(state.stream.values[cell]) :UNKNOWN;
}
function uiBeamW3ValueWords(state,cell) {
const text = uiBeamW3ValueText(state,cell);
return 'value ' + (text === UNKNOWN ? 'unknown' :text);
}
function uiBeamW3Reads(state) {
const ends = rotatedEnds(state);
return { lo:String(ends.lo),mid:state.pending ? String(state.pending.value) :UNKNOWN,hi:String(ends.hi) };
}

export { UNKNOWN,uiBeamW3Known,uiBeamW3ValueText,uiBeamW3ValueWords,uiBeamW3Reads };
