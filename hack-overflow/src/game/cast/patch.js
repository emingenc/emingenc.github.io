import { hasBeat,questState } from '../ext/ops.js';
import { STAGE } from '../quest/quests.js';
import { BEATS,flagOf } from '../finale/contract.js';
import { REFUSAL_BEAT,isVeteran } from './refusal.js';

const BOLT_BEAT = 'bolt';
const EAST_BEAT = 'east-wing';
const QUEST_ID = 'first-commit';
const PATCH_CELL = Object.freeze({ col:29,row:20 });
const WARP_CELL = Object.freeze({ col:30,row:20 });
const BENCH_CELLS = Object.freeze([{ col:29,row:19 },{ col:30,row:19 }]);
const CRATE_CELLS = Object.freeze([{ col:28,row:21 },{ col:30,row:21 },{ col:31,row:21 }]);
const FOLLOW_REACH = 2;
const TRAIL_MS = 130;
const YOU = 'ENGINEER';
const PATCH = 'PATCH';
const BUSY_TOAST = 'Keys clacking. Busy.';
const OFFLINE_TOAST = 'PATCH: $ commit -m "LG';
const TALK_LINES = Object.freeze([
{ who:YOU,text:'I ship code. Fast. Reading is for reviewers.' },
{ who:PATCH,text:'So did I. One click approved a whole batch. Green checks. I never opened the diff.' },
{ who:PATCH,text:'Default cursor? Let me fix that.' },
]);
const BOLT_TOAST = 'BOLT: hold A, release to fire';
const TELL_TOAST = 'ROOT: write *. reviewer: P_TCH';
const CRATES_TOAST = 'PATCH: Three crates. Measure twice.';
const DONE_TOAST = 'PATCH: Good. Now the turret door.';
const EAST_TOAST = 'PATCH: East wing opens as you level.';
const CRATE_TOASTS = Object.freeze({ kill:{ text:'CRATE BROKEN',kind:'reward' },dent:{ text:'Crate cracked.',kind:'info' } });

function taken(ext) {
return (hasBeat(ext,BEATS.home) || (hasBeat(ext,BEATS.ordeal) && flagOf(ext) !== null)) && !hasBeat(ext,BEATS.roadback);
}
function patchRole(ext,facts) {
if (!hasBeat(ext,REFUSAL_BEAT)) return isVeteran(facts) ? 'none' :'busy';
if (taken(ext)) return 'offline';
return hasBeat(ext,BOLT_BEAT) ? 'follow' :'talk';
}
function hasBolt(ext) {
return hasBeat(ext,BOLT_BEAT);
}
function boltOwed(ext,facts) {
return isVeteran(facts) && !hasBolt(ext);
}
function commitActive(ext) {
return questState(ext,QUEST_ID) === STAGE.active;
}
function eastWingDue(ext) {
return questState(ext,QUEST_ID) === STAGE.done && !hasBeat(ext,EAST_BEAT);
}
function solidProps(role,crateIds) {
const bench = role === 'none' ? [] :BENCH_CELLS.map((cell,index) => ({ id:'bench-' + index,...cell }));
const patch = role === 'busy' || role === 'talk' ? [{ id:'patch',...PATCH_CELL }] :[];
const crates = CRATE_CELLS.map((cell,index) => ({ id:'crate-' + (index + 1),...cell })).filter((crate) => crateIds.includes(crate.id));
return [...bench,...patch,...crates];
}
function crateActors(broken) {
return CRATE_CELLS.map((cell,index) => ({ id:'crate-' + (index + 1),kind:'crate',col:cell.col,row:cell.row,hp:1,awake:true }))
.filter((crate) => !broken.includes(crate.id));
}
function propAt(props,cell) {
return props.find((prop) => prop.col === cell.col && prop.row === cell.row) || null;
}
function crateText(crateId) {
return 'crate ' + crateId.slice('crate-'.length) + '/' + CRATE_CELLS.length + ': DEPRECATED';
}
function trailAt(cell) {
return { col:cell.col,row:cell.row,from:{ col:cell.col,row:cell.row },at:-Infinity };
}
function trailStep(trail,left,now) {
return { col:left.col,row:left.row,from:{ col:trail.col,row:trail.row },at:now };
}
function trailPose(trail,clock) {
const along = clock.still ? 1 :Math.min(1,Math.max(0,(clock.now - trail.at) / TRAIL_MS));
return { col:trail.from.col + (trail.col - trail.from.col) * along,row:trail.from.row + (trail.row - trail.from.row) * along };
}
function trailLost(trail,hero) {
return Math.max(Math.abs(trail.col - hero.col),Math.abs(trail.row - hero.row)) > FOLLOW_REACH;
}

export {
BOLT_BEAT,EAST_BEAT,QUEST_ID,PATCH_CELL,WARP_CELL,BENCH_CELLS,CRATE_CELLS,FOLLOW_REACH,
BUSY_TOAST,OFFLINE_TOAST,TALK_LINES,BOLT_TOAST,TELL_TOAST,CRATES_TOAST,DONE_TOAST,EAST_TOAST,CRATE_TOASTS,
patchRole,hasBolt,boltOwed,commitActive,eastWingDue,solidProps,crateActors,propAt,crateText,trailAt,trailStep,trailPose,trailLost,
};
