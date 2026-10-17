import { inSafehouse } from '../quest/journey.js';
import { STAGE } from '../quest/quests.js';

const UNREF = Object.freeze({
quest:'unreferenced',tagId:'null',reach:6,
tile:Object.freeze({ col:9,row:16 }),
room:Object.freeze({ minCol:7,maxCol:9,minRow:14,maxRow:16 }),
path:Object.freeze([{ col:7,row:15 },{ col:7,row:16 },{ col:8,row:16 },{ col:9,row:16 }].map(Object.freeze)),
});
const TEXTS = Object.freeze({
flicker:'A tile flickers. Nothing points to it. LOOKUP could.',
intro:'NULL: Nothing points to me. The GC sweeps.',
tagged:'NULL has a reference now. The GC skips it.',
swept:'The GC swept NULL. Leave and come back.',
home:'GC: No reference, no life. A tag is a reference.',
});

function inRoom(cell) {
const room = UNREF.room;
return cell.col >= room.minCol && cell.col <= room.maxCol && cell.row >= room.minRow && cell.row <= room.maxRow;
}
function newSweep() {
return { n:0,tagged:false,swept:false };
}
function gcSweep(state,step) {
if (step.kind === 'tag') return state.swept ? state :{ ...state,tagged:true };
if (step.kind !== 'step' || state.tagged || state.swept) return state;
const count = state.n + 1;
return { ...state,n:count,swept:count >= UNREF.path.length };
}
function sweepAt(state) {
return state.n > 0 ? UNREF.path[Math.min(state.n,UNREF.path.length) - 1] :null;
}
function nullSpot(facts) {
const near = Math.max(Math.abs(UNREF.tile.col - facts.hero.col),Math.abs(UNREF.tile.row - facts.hero.row)) <= UNREF.reach;
const open = facts.owns && facts.stage === STAGE.active && !facts.tagged && !facts.swept && !facts.home;
return open && near ? { id:UNREF.tagId,col:UNREF.tile.col,row:UNREF.tile.row } :null;
}
function roomLine(facts) {
if (facts.home) return null;
if (!facts.owns) return facts.told ? null :'flicker';
return facts.tagged ? null :'intro';
}
function homeDue(facts) {
return facts.stage === STAGE.active && facts.tagged && !facts.home && inSafehouse(facts.hero);
}

export { TEXTS,UNREF,gcSweep,homeDue,inRoom,newSweep,nullSpot,roomLine,sweepAt };
