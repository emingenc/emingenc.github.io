import { questState } from '../ext/ops.js';
import { cellToward } from '../move.js';
import { VOLLEY } from '../power/volley.js';
import { STAGE } from '../quest/quests.js';

const QUEST_ID = 'undo';
const WHO = 'OLD BRACE';
const WRONG_GAP_MS = 3000;
const SPILL_CELLS = [{ col:13,row:15 },{ col:14,row:15 },{ col:14,row:14 },{ col:13,row:14 }];
const SPILLS = Object.freeze(SPILL_CELLS.map((cell,at) => Object.freeze({ n:at + 1,...cell })));
const SHEET_LINES = Object.freeze(['I spilled four crates. 1, 2, 3, 4.','Undo them. Walk the pile back.']);
const TEXT = Object.freeze({
spill:(num) => 'Spill ' + num + ' undone.',
wrong:'BRACE: Last in, first out. Newest first.',
done:'BRACE: Four undone. Last in, first out.',
});

function spillAt(cell) {
return SPILLS.find((spill) => spill.col === cell.col && spill.row === cell.row);
}
function nextSpill(taken) {
return Math.max(SPILLS.length - taken,0);
}
function spillStep(taken,cell) {
const spill = spillAt(cell);
if (!spill) return { kind:'none',n:0 };
const next = nextSpill(taken);
if (spill.n === next) return { kind:'progress',n:spill.n };
return { kind:spill.n < next ? 'slip' :'none',n:spill.n };
}
function atBrace(pos,facing) {
const faced = cellToward(pos,facing);
const beside = pos.col === VOLLEY.braceFrom.col && pos.row === VOLLEY.braceFrom.row;
return beside && faced.col === VOLLEY.brace.col && faced.row === VOLLEY.brace.row;
}
function offerDue(ext) {
return questState(ext,QUEST_ID) === STAGE.unseen;
}
function spillMarks(taken) {
return SPILLS.map((spill) => ({ kind:'number',col:spill.col,row:spill.row,n:spill.n,done:spill.n > nextSpill(taken) }));
}
function wrongDue(lastAt,now) {
return lastAt === null || now - lastAt >= WRONG_GAP_MS;
}
function undoSheet() {
return {
id:'undo-offer',
lines:SHEET_LINES.map((text) => ({ who:WHO,text })),
choices:[{ id:'undo',label:'UNDO' },{ id:'later',label:'NOT NOW',default:true }],
};
}

export { QUEST_ID,SPILLS,TEXT,WRONG_GAP_MS,atBrace,nextSpill,offerDue,spillAt,spillMarks,spillStep,undoSheet,wrongDue };
