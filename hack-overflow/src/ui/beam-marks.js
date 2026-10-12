import { middleHint,worstSide } from '../game/rooms/beam.js';


function uiBeamVar(node,name,value) {
if (node.style && typeof node.style.setProperty === 'function') node.style.setProperty(name,String(value));
}
function uiBeamDecoy(state,cell) {
const inside = cell >= state.lo && cell <= state.hi;
return inside && worstSide(state,cell) >= state.hi - state.lo + 1;
}

function uiBeamMarkClasses(state,cell) {
const names = [];
if (cell === state.selected) names.push('is-selected');
if (cell === middleHint(state)) names.push('is-mid');
if (uiBeamDecoy(state,cell)) names.push('is-decoy');
return names;
}

export { uiBeamVar,uiBeamDecoy,uiBeamMarkClasses };
