import { liveCells,middleHint,middleOf } from '../game/rooms/beam.js';
import { uiBeamDecoy,uiBeamMarkClasses,uiBeamVar } from './beam-marks.js';
import { uiEl } from './dom.js';


const CELL_ACTION = 'beam-cell-';
const FIRE_ACTION = 'beam-fire';
const DOWN_ACTION = 'beam-down';
const UP_ACTION = 'beam-up';
const BOLT_ACTION = 'beam-bolt';
const ROW_CELLS = 6;
const ROW_BEFORE = 2;
const PERCENT = 100;
const NO_CELL = '—';
const MINUS = '−';



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


function uiBeamSelectedIndex(state,live) {
const at = live.indexOf(state.selected);
return at < 0 ? live.indexOf(middleOf(state)) :at;
}
function uiBeamRowCells(state) {
const live = liveCells(state);
if (live.length <= ROW_CELLS) return live;
const start = Math.min(live.length - ROW_CELLS,Math.max(0,uiBeamSelectedIndex(state,live) - ROW_BEFORE));
return live.slice(start,start + ROW_CELLS);
}
function uiBeamCellWords(state,cell) {
const parts = ['Cell ' + cell];
if (cell === state.selected) parts.push('selected');
if (cell === middleHint(state)) parts.push('the middle');
if (uiBeamDecoy(state,cell)) parts.push('a decoy: the range cannot shrink');
return parts.join(', ');
}
function uiBeamCellClasses(state,cell) {
const names = ['btn','arena-btn','beam-cell',...uiBeamMarkClasses(state,cell)];
return names.join(' ');
}
function uiBeamCell(state,cell) {
const action = CELL_ACTION + cell;
return uiEl('button',{
className:uiBeamCellClasses(state,cell),text:String(cell),
attrs:{
type:'button','data-action':action,'data-focus-key':action,'data-beam-cell':String(cell),'aria-label':uiBeamCellWords(state,cell),
'aria-pressed':String(cell === state.selected),
},
});
}
function uiBeamCellRow(state) {
const cells = uiBeamRowCells(state).map((cell) => uiBeamCell(state,cell));
return uiEl('div',{ className:'beam-cells',attrs:{ role:'group','aria-label':'Live cells' },children:cells });
}


function uiBeamSliderSlot() {
return uiEl('div',{ className:'beam-slider-slot',attrs:{ 'aria-hidden':'true' } });
}
function uiBeamSlider(state) {
const live = liveCells(state);
if (live.length <= ROW_CELLS) return uiBeamSliderSlot();
const thumb = uiEl('span',{ className:'beam-thumb' + (state.selected === null ? ' is-idle' :''),attrs:{ 'aria-hidden':'true' } });
uiBeamVar(thumb,'--at',(uiBeamSelectedIndex(state,live) / (live.length - 1)) * PERCENT);
const track = uiEl('span',{ className:'beam-track',attrs:{ 'aria-hidden':'true' },children:[thumb] });
return uiEl('div',{
className:'beam-slider',children:[track],
attrs:{
role:'slider',tabindex:'0','data-beam-slider':'live','aria-label':'Pick a live cell','aria-valuemin':String(state.lo),'aria-valuemax':String(state.hi),
'aria-valuenow':String(state.selected === null ? middleOf(state) :state.selected),
},
});
}


function uiBeamDockButton(spec) {
const word = uiEl('span',{ className:'beam-btn-word',text:spec.text });
const sub = spec.sub === undefined ? null :uiEl('span',{ className:'beam-btn-sub',text:spec.sub });
const attrs = { type:'button','data-action':spec.action,'data-focus-key':spec.action,'aria-label':spec.aria };
if (spec.disabled) attrs['aria-disabled'] = 'true';
return uiEl('button',{ className:'btn arena-btn arena-verb beam-btn ' + spec.side,attrs,children:[word,sub] });
}
function uiBeamFireSpec(state) {
const sub = state.selected === null ? NO_CELL :String(state.selected);
const aria = state.selected === null ? 'Fire: select a live cell first' :'Fire at cell ' + state.selected + ': one shot';
return { action:FIRE_ACTION,side:'beam-btn-fire',text:'FIRE',sub,aria,disabled:state.selected === null };
}
function uiBeamBoltSpec(state) {
const target = Boolean(state.shard) || state.mites.length > 0;
const aim = target ? 'shoots the ' + (state.shard ? 'shard' :'mite') : 'shoots a mite or a shard. Nothing to shoot now';
const aria = 'Bolt: ' + aim + '. Ammo ' + state.ammo;
return { action:BOLT_ACTION,side:'beam-btn-bolt',text:'BOLT',sub:String(state.ammo),aria,disabled:!target };
}
function uiBeamDock(state) {
const down = { action:DOWN_ACTION,side:'beam-btn-down',text:MINUS + '1',aria:'Select the next lower live cell' };
const up = { action:UP_ACTION,side:'beam-btn-up',text:'+1',aria:'Select the next higher live cell' };
const specs = [down,uiBeamFireSpec(state),up,state.bolt ? uiBeamBoltSpec(state) :null].filter(Boolean);
return uiEl('div',{ className:'beam-dock',attrs:{ role:'group','aria-label':'Beam controls' },children:specs.map(uiBeamDockButton) });
}

export { CELL_ACTION,FIRE_ACTION,DOWN_ACTION,UP_ACTION,BOLT_ACTION,ROW_CELLS,uiBeamMinimap,uiBeamCellRow,uiBeamSlider,uiBeamDock,uiBeamRowCells };
