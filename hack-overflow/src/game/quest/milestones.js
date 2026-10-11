import { WORLD_CORES } from '../world-data.js';

const SECTORS = Object.values(WORLD_CORES);
const ROOM_SECTOR = { turret:'hash',pincer:'two-pointers',shield:'stack',halving:'binary-search',net:'window' };
const LOCKS_PER_STAGE = 4;
const MAX_STAGE = SECTORS.length;
const THRESHOLD = 'threshold';
const ORDEAL = 'ordeal';
const BEAT_STAGE = { m1:1,m2:2,ordeal:3,m4:4,m5:5 };
const BEAT_ORDER = [THRESHOLD,...Object.keys(BEAT_STAGE)];

function allSolved(ids,solved) {
return Array.isArray(ids) && ids.length > 0 && ids.every((id) => solved.has(id));
}
function sectorDone(sectorId,facts) {
const roomWon = facts.roomsWon.some((room) => ROOM_SECTOR[room] === sectorId);
const locks = Object.hasOwn(facts.lockIdsBySector,sectorId) ? facts.lockIdsBySector[sectorId] :[];
return roomWon || facts.cores.includes(sectorId) || allSolved(locks,new Set(facts.solved));
}
function milestoneReached(facts) {
const byLocks = Math.floor(new Set(facts.solved).size / LOCKS_PER_STAGE);
const bySectors = SECTORS.filter((sector) => sectorDone(sector,facts)).length;
return Math.min(MAX_STAGE,Math.max(byLocks,bySectors));
}
function started(facts) {
return facts.roomsWon.length > 0 || facts.solved.length > 0;
}
function beatReached(id,facts) {
return id === THRESHOLD ? started(facts) :milestoneReached(facts) >= BEAT_STAGE[id];
}
function nextBeats(facts,seenBeatIds,atSafehouse) {
if (!atSafehouse) return [];
const seen = new Set(seenBeatIds);
const due = [];
for (const id of BEAT_ORDER) {
if (seen.has(id)) continue;
if (id === ORDEAL || !beatReached(id,facts)) break;
due.push(id);
if (id !== THRESHOLD) break;
}
return due;
}
function ordealDue(facts,seenBeatIds) {
return beatReached(ORDEAL,facts) && !seenBeatIds.includes(ORDEAL);
}

export { SECTORS,ROOM_SECTOR,BEAT_ORDER,LOCKS_PER_STAGE,sectorDone,milestoneReached,nextBeats,ordealDue };
