import { questState } from '../ext/ops.js';
import { STAGE } from '../quest/quests.js';

const QUEST = 'lost-bytes';
const AFTER = 'first-commit';
const CELLS = Object.freeze([{ col:17,row:17 },{ col:21,row:21 },{ col:31,row:18 }].map((cell) => Object.freeze(cell)));
const SHIMMER_REACH = 2;
const WHO = 'BIT';
const SHEET_ID = 'lost-bytes-offer';
const OFFER_LINES = Object.freeze(['PATCH dropped three bytes around here.','I cannot see them. Walk close and look.']);
const LOOK = Object.freeze({ id:'look',label:'LOOK' });
const LATER = Object.freeze({ id:'later',label:'NOT NOW',default:true });

function sameCell(cell,other) {
return cell.col === other.col && cell.row === other.row;
}
function near(cell,other) {
return Math.max(Math.abs(cell.col - other.col),Math.abs(cell.row - other.row)) <= SHIMMER_REACH;
}
function freshBytes() {
return { taken:[],steps:0,sent:0 };
}
function bytesTaken(run) {
return run.taken;
}
function stepPlan(run,cell) {
const steps = run.steps + 1;
const index = CELLS.findIndex((spot) => sameCell(spot,cell));
if (index < 0 || run.taken.includes(index)) return { kind:'step',run:{ ...run,steps } };
const taken = [...run.taken,index];
return { kind:'pick',run:{ taken,steps,sent:steps },slip:steps - run.sent,count:taken.length,last:taken.length === CELLS.length };
}
function bytesPlan(ext,run,cell) {
const stage = questState(ext,QUEST);
if (stage === STAGE.active) return stepPlan(run,cell);
const offered = stage < STAGE.active && questState(ext,AFTER) === STAGE.done && sameCell(cell,CELLS[0]);
return { kind:offered ? 'offer' :'none' };
}
function bytesLook(run) {
const taken = run.taken.includes(0) ? run.taken :[...run.taken,0];
return { run:{ ...run,taken },slip:0,count:taken.length };
}
function bytesMarks(ext,run,pos) {
const stage = questState(ext,QUEST);
if (stage === STAGE.active) {
return CELLS.filter((cell,index) => !run.taken.includes(index) && near(cell,pos)).map((cell) => ({ kind:'shimmer',col:cell.col,row:cell.row }));
}
const offered = stage < STAGE.active && questState(ext,AFTER) === STAGE.done;
return offered ? [{ kind:'glint',col:CELLS[0].col,row:CELLS[0].row }] :[];
}
function bytesSheet() {
return { id:SHEET_ID,lines:OFFER_LINES.map((text) => ({ who:WHO,text })),choices:[LOOK,LATER].map((choice) => ({ ...choice })) };
}
function bytesDoneLines(steps) {
return ['BIT: ' + steps + ' steps. I looked at every cell.','BIT: With a map I would know in one step.','PATCH: My name tag. Thanks, BIT.'];
}
const BYTES = Object.freeze({ quest:QUEST,cells:CELLS,byteLine:(count) => 'BIT: Byte ' + count + ' of 3.' });

export { BYTES,freshBytes,bytesTaken,bytesPlan,bytesLook,bytesMarks,bytesSheet,bytesDoneLines };
