import { hasBeat,questState } from '../ext/ops.js';
import { BEATS,flagOf } from '../finale/contract.js';
import { STAGE } from '../quest/quests.js';

const QUEST = 'lost-bytes';
const AFTER = 'first-commit';
const CELLS = Object.freeze([{ col:17,row:17 },{ col:21,row:21 },{ col:31,row:18 }].map((cell) => Object.freeze(cell)));
const SHIMMER_REACH = 2;
const WHO = 'BIT';
const SHEET_ID = 'lost-bytes-offer';
const OFFER_LINES = Object.freeze(['PATCH dropped three bytes around here.','I cannot see them. Walk close and look.']);
const LOOK = Object.freeze({ id:'look',label:'LOOK',focus:true });
const LATER = Object.freeze({ id:'later',label:'NOT NOW',default:true });
const MAP_SHEET_ID = 'lost-bytes-map';
const MAP_LINES = Object.freeze(['Two more bytes. A map shows both cells at once.']);
const DRAW = Object.freeze({ id:'map',label:'DRAW MAP',focus:true });
const WALK = Object.freeze({ id:'walk',label:'KEEP WALKING',default:true });

function sameCell(cell,other) {
return cell.col === other.col && cell.row === other.row;
}
function near(cell,other) {
return Math.max(Math.abs(cell.col - other.col),Math.abs(cell.row - other.row)) <= SHIMMER_REACH;
}
function freshBytes() {
return { taken:[],steps:0,sent:0,mapped:false };
}
function bytesTaken(run) {
return run.taken;
}
function stepPlan(run,cell) {
const steps = run.steps + 1;
const index = CELLS.findIndex((spot) => sameCell(spot,cell));
if (index < 0 || run.taken.includes(index)) return { kind:'step',run:{ ...run,steps } };
const taken = [...run.taken,index];
return { kind:'pick',run:{ ...run,taken,steps,sent:steps },slip:steps - run.sent,count:taken.length,last:taken.length === CELLS.length };
}
function remapDue(run,cell) {
return !run.mapped && run.taken.includes(0) && sameCell(cell,CELLS[0]);
}
function bytesPlan(ext,run,cell) {
const stage = questState(ext,QUEST);
if (stage === STAGE.active) {
const plan = stepPlan(run,cell);
return plan.kind === 'step' && remapDue(run,cell) ? { ...plan,kind:'remap' } :plan;
}
const offered = stage < STAGE.active && questState(ext,AFTER) === STAGE.done && sameCell(cell,CELLS[0]);
return { kind:offered ? 'offer' :'none' };
}
function bytesLook(run) {
const taken = run.taken.includes(0) ? run.taken :[...run.taken,0];
return { run:{ ...run,taken },slip:0,count:taken.length };
}
function bytesDraw(run) {
return { ...run,mapped:true };
}
function bytesMarks(ext,run,pos) {
const stage = questState(ext,QUEST);
if (stage === STAGE.active) {
return CELLS.filter((cell,index) => !run.taken.includes(index) && (run.mapped || near(cell,pos))).map((cell) => ({ kind:'shimmer',col:cell.col,row:cell.row }));
}
const offered = stage < STAGE.active && questState(ext,AFTER) === STAGE.done;
return offered ? [{ kind:'glint',col:CELLS[0].col,row:CELLS[0].row }] :[];
}
function bytesSheet() {
return { id:SHEET_ID,lines:OFFER_LINES.map((text) => ({ who:WHO,text })),choices:[LOOK,LATER].map((choice) => ({ ...choice })) };
}
function mapSheet() {
return { id:MAP_SHEET_ID,lines:MAP_LINES.map((text) => ({ who:WHO,text })),choices:[DRAW,WALK].map((choice) => ({ ...choice })) };
}
function ghosted(opts) {
if (typeof opts.flagged === 'boolean') return opts.flagged;
return Boolean(opts.ext) && (flagOf(opts.ext) !== null || hasBeat(opts.ext,BEATS.ordeal));
}
function bytesDoneLines(steps,opts = {}) {
const tail = ghosted(opts) ? 'BIT: PATCH name tag, found. I will keep it.' :'PATCH: My name tag. Thanks, BIT.';
if (opts.mapped) return ['BIT: The map needed no sweep of the floor.','BIT: ' + steps + ' steps with the map. Blind, it was every cell.',tail];
return ['BIT: ' + steps + ' steps. I looked at every cell.','BIT: With a map I would know in one step.',tail];
}
const BYTES = Object.freeze({ quest:QUEST,cells:CELLS,byteLine:(count) => 'BIT: Byte ' + count + ' of 3.' });

export { BYTES,freshBytes,bytesTaken,bytesPlan,bytesLook,bytesDraw,bytesMarks,bytesSheet,mapSheet,bytesDoneLines };
