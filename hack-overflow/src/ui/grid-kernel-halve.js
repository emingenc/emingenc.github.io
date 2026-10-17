import { HALVE } from '../game/finale/halve.js';
import { askLine } from '../game/finale/kernel.js';
import { uiRenderKeepingFocus } from './app.js';

const SEPARATOR = ' . ';
const BIG_STEP = 8;
const CURSOR_MOVES = [
{ id:'halve-m8',delta:-BIG_STEP,label:'-8',aria:'Visor down 8 entries' },
{ id:'halve-m1',delta:-1,label:'-1',aria:'Visor down 1 entry' },
];
const AFTER_FIRE = [
{ id:'halve-p1',delta:1,label:'+1',aria:'Visor up 1 entry' },
{ id:'halve-p8',delta:BIG_STEP,label:'+8',aria:'Visor up 8 entries' },
];

function uiLowerMiddle(halve) {
return (halve.lo + halve.hi) >> 1;
}
function uiHalveCursor(kernel) {
const halve = kernel.phase.halve;
const at = kernel.cursor;
return Number.isInteger(at) && at >= halve.lo && at <= halve.hi ? at :uiLowerMiddle(halve);
}
function uiHalveMove(app,delta) {
const kernel = app.game.kernel;
const halve = kernel.phase.halve;
const cursor = Math.min(halve.hi,Math.max(halve.lo,uiHalveCursor(kernel) + delta));
app.game.kernel = { ...kernel,cursor };
uiRenderKeepingFocus(app);
}
function uiHalveReset(app) {
app.game.kernel = { ...app.game.kernel,cursor:null };
}
function uiHalveTele(halve) {
const shot = halve.shots + 1;
const count = shot <= HALVE.budget ? 'SHOT ' + shot + ' of ' + HALVE.budget :'SHOT ' + shot + SEPARATOR + 'PAR ' + HALVE.budget;
const skips = halve.skips > 0 ? SEPARATOR + 'SKIPS ' + halve.skips :'';
return 'MID ' + uiLowerMiddle(halve) + SEPARATOR + count + skips;
}
function uiMoveChip(app,move) {
return { id:move.id,label:move.label,aria:move.aria,run:() => uiHalveMove(app,move.delta) };
}
function uiFireChip(app,fire) {
const cursor = uiHalveCursor(app.game.kernel);
return { id:'halve-fire',label:'FIRE ' + cursor,aria:'Fire at entry ' + cursor,run:() => fire(uiHalveCursor(app.game.kernel)) };
}
function uiHalveView(app,fire) {
const phase = app.game.kernel.phase;
const chips = [...CURSOR_MOVES.map((move) => uiMoveChip(app,move)),uiFireChip(app,fire),...AFTER_FIRE.map((move) => uiMoveChip(app,move))];
return { ask:askLine(phase),tele:uiHalveTele(phase.halve),note:'',fiction:'',chips };
}

export { uiHalveCursor,uiHalveMove,uiHalveReset,uiHalveView };
