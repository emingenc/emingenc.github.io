import { uiBeamDockButton } from './beam-controls.js';
import { uiEl } from './dom.js';


const KEEP_LEFT_ACTION = 'beam-keep-left';
const KEEP_RIGHT_ACTION = 'beam-keep-right';
const NO_CELLS = '—';

function rangeWords(lo,hi) {
return lo <= hi ? lo + '..' + hi :NO_CELLS;
}
function uiBeamKeepSpecs(state) {
const { cell } = state.pending;
const left = rangeWords(state.lo,cell);
const right = rangeWords(cell + 1,state.hi);
return [
{ action:KEEP_LEFT_ACTION,side:'beam-btn-keep',text:'KEEP LEFT',sub:left,aria:'Keep left: cells ' + left + ' stay live' },
{ action:KEEP_RIGHT_ACTION,side:'beam-btn-keep',text:'KEEP RIGHT',sub:right,aria:'Keep right: cells ' + right + ' stay live' },
];
}
function uiBeamKeepDock(state) {
const buttons = uiBeamKeepSpecs(state).map(uiBeamDockButton);
return uiEl('div',{ className:'beam-dock',attrs:{ role:'group','aria-label':'Beam controls: keep a half' },children:buttons });
}

export { KEEP_LEFT_ACTION,KEEP_RIGHT_ACTION,uiBeamKeepDock };
