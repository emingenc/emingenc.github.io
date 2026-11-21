import { cellToward } from '../move.js';
import { AMBUSH,ambushPending } from './ambush.js';
import { VOLLEY,volleyPending } from './volley.js';

const STOP_SHORT = 2;
const EVENT_ROWS = [
{ id:'ambush',label:'AMBUSH',cell:AMBUSH.trigger,pending:ambushPending },
{ id:'volley',label:'VOLLEY',cell:VOLLEY.trigger,pending:volleyPending },
];

function pendingEvents(ext,won) {
return EVENT_ROWS.filter((row) => row.pending(ext,won)).map((row) => ({ id:row.id,label:row.label,cell:{ ...row.cell } }));
}
function eventAhead(walk) {
const ahead = walk.dirs.slice(0,STOP_SHORT);
if (ahead.length < STOP_SHORT) return null;
const there = ahead.reduce((cell,dir) => cellToward(cell,dir),walk.from);
return walk.events.find((event) => !walk.accepted.has(event.id) && event.cell.col === there.col && event.cell.row === there.row) || null;
}

export { STOP_SHORT,pendingEvents,eventAhead };
