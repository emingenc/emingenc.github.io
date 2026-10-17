import { middleHint,scopeCells } from '../game/rooms/beam.js';
import { uiBeamDecoy,uiBeamMarkClasses } from './beam-marks.js';
import { uiBeamW3ValueText,uiBeamW3ValueWords } from './beam-w3-values.js';
import { uiEl } from './dom.js';


const CELL_ACTION = 'beam-cell-';
const FIRE_ACTION = 'beam-fire';
const PREV_ACTION = 'beam-prev';
const NEXT_ACTION = 'beam-next';
const BOLT_ACTION = 'beam-bolt';


function uiBeamTick(state,cell) {
const names = ['beam-tick',cell >= state.lo && cell <= state.hi ? 'is-live' :'is-dead'];
if (cell === state.selected) names.push('is-selected');
return uiEl('span',{ className:names.join(' ') });
}
function uiBeamMinimap(state) {
const ticks = Array.from({ length:state.n },(unused,cell) => uiBeamTick(state,cell));
const words = 'Minimap of ' + state.n + ' cells. Live: ' + state.lo + ' to ' + state.hi + '.';
return uiEl('div',{ className:'beam-map',attrs:{ role:'img','aria-label':words },children:ticks });
}


function uiBeamCellWords(state,cell) {
const parts = [(state.rotated ? 'Probe cell ' :'Fire at cell ') + cell];
if (state.rotated) parts.push(uiBeamW3ValueWords(state,cell));
if (cell === state.selected) parts.push('selected');
if (cell === middleHint(state)) parts.push('the middle');
if (uiBeamDecoy(state,cell)) parts.push('a decoy: the range cannot shrink');
return parts.join(', ');
}
function uiBeamCellClasses(state,cell) {
const names = ['btn','arena-btn','beam-cell',...(state.rotated ? ['beam-cell-w3'] :[]),...uiBeamMarkClasses(state,cell)];
return names.join(' ');
}
function uiBeamCellLook(state,cell) {
if (!state.rotated) return { text:String(cell) };
const lines = [['beam-cell-ix','[' + cell + ']'],['beam-cell-val',uiBeamW3ValueText(state,cell)]];
return { children:lines.map(([className,text]) => uiEl('span',{ className,text })) };
}
function uiBeamCell(state,cell) {
const action = CELL_ACTION + cell;
return uiEl('button',{
className:uiBeamCellClasses(state,cell),...uiBeamCellLook(state,cell),
attrs:{
type:'button','data-action':action,'data-focus-key':action,'data-beam-cell':String(cell),'aria-label':uiBeamCellWords(state,cell),
'aria-pressed':String(cell === state.selected),
},
});
}
function uiBeamCellRow(state) {
const cells = scopeCells(state).map((cell) => uiBeamCell(state,cell));
return uiEl('div',{ className:'beam-cells',attrs:{ role:'group','aria-label':'Pick a cell to fire at' },children:cells });
}


function uiBeamDockButton(spec) {
const word = uiEl('span',{ className:'beam-btn-word',text:spec.text });
const sub = spec.sub === undefined ? null :uiEl('span',{ className:'beam-btn-sub',text:spec.sub });
const attrs = { type:'button','data-action':spec.action,'data-focus-key':spec.action,'aria-label':spec.aria };
return uiEl('button',{ className:'btn arena-btn arena-verb beam-btn ' + spec.side,attrs,children:[word,sub] });
}
function uiBeamBoltShows(state) {
return state.bolt && !state.rotated && (Boolean(state.shard) || state.mites.length > 0);
}
function uiBeamBoltSpec(state) {
const aria = 'Bolt: shoots the ' + (state.shard ? 'shard' :'mite') + '. Ammo ' + state.ammo;
return { action:BOLT_ACTION,side:'beam-btn-bolt',text:'BOLT',sub:String(state.ammo),aria };
}
function uiBeamDock(state) {
if (!uiBeamBoltShows(state)) return uiEl('div',{ className:'beam-dock-slot',attrs:{ 'aria-hidden':'true' } });
return uiEl('div',{ className:'beam-dock',attrs:{ role:'group','aria-label':'Beam controls' },children:[uiBeamDockButton(uiBeamBoltSpec(state))] });
}

export { CELL_ACTION,FIRE_ACTION,PREV_ACTION,NEXT_ACTION,BOLT_ACTION,uiBeamMinimap,uiBeamCellRow,uiBeamDock,uiBeamDockButton };
