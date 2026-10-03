import { MAX_STARS_PER_LOCK } from '../logic/stars.js';
import { DIRS } from './move.js';
import { EXPLOITS } from './exploits.js';
import { cellKey, reachable } from './path.js';
import { CACHE_XP, CORE_XP, levelFor, progressOf, replayGain, traceCapacity, xpForBreach } from './progress.js';


const SAVE_VERSION = 1;
const START_FACING = 'down';
const STAT_NAMES = ['probes','breaches','fails','traced'];
const HISTORY_KINDS = new Set(['run','submit']);
function isRecord(value) {
return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function wholeNumber(value,fallback) {
return Number.isFinite(value) ? Math.max(0,Math.floor(value)) :fallback;
}
function statsFrom(raw) {
const stats = isRecord(raw) ? raw :{};
return Object.fromEntries(STAT_NAMES.map((name) => [name,wholeNumber(stats[name],0)]));
}
function createSave(world) {
return {
version:SAVE_VERSION,xp:0,locks:{},pending:{},entries:{},caches:[],cores:[],seenOpen:[],
pos:{ col:world.spawn.col,row:world.spawn.row },facing:START_FACING,stats:statsFrom(null),ended:false,
};
}
function problemRecord(world,raw,repair) {
const kept = {};
for (const [key,value] of Object.entries(isRecord(raw) ? raw :{})) {
const repaired = Object.hasOwn(world.problems,key) ? repair(value) :null;
if (repaired !== null) kept[key] = repaired;
}
return kept;
}
function repairLock(value) {
if (!isRecord(value)) return null;
const lock = { best:Math.min(MAX_STARS_PER_LOCK,wholeNumber(value.best,0)),clears:Math.max(1,wholeNumber(value.clears,1)) };
return value.carried === true ? { ...lock,carried:true } :lock;
}
function repairEntry(value) {
return wholeNumber(value,null);
}
function isHistoryEntry(entry) {
return isRecord(entry) && typeof entry.text === 'string' && typeof entry.outcomes === 'string' && HISTORY_KINDS.has(entry.kind);
}
function repairHistory(list) {
return Array.isArray(list) ? list.filter(isHistoryEntry).map(({ text,outcomes,kind }) => ({ text,outcomes,kind })) :[];
}
function repairUsed(value) {
const raw = isRecord(value) ? value :{};
return Object.fromEntries(Object.keys(EXPLOITS).filter((name) => raw[name] === true).map((name) => [name,true]));
}
function repairPending(value,capacity) {
if (!isRecord(value)) return null;
return {
submitted:repairHistory(value.submitted),judged:repairHistory(value.judged),visibleFails:wholeNumber(value.visibleFails,0),
revealed:value.revealed === true,trace:Math.min(capacity - 1,wholeNumber(value.trace,0)),used:repairUsed(value.used),
};
}
function knownIds(raw,known) {
return Array.isArray(raw) ? [...new Set(raw.filter((id) => known.has(id)))] :[];
}
function earnedXp(world,save) {
const locks = Object.entries(save.locks).reduce((sum,[key,lock]) => sum + xpForBreach(world.problems[key].difficulty,lock.best),0);
return locks + save.caches.length * CACHE_XP + save.cores.length * CORE_XP;
}
function repairPosition(world,save,raw) {
const cell = isRecord(raw) && Number.isInteger(raw.col) && Number.isInteger(raw.row) ? { col:raw.col,row:raw.row } :null;
const reached = cell !== null && reachable(world,progressOf(world,save),world.spawn).has(cellKey(cell));
return reached ? cell :{ col:world.spawn.col,row:world.spawn.row };
}
function readRaw(raw) {
if (typeof raw !== 'string') return raw;
try {
return JSON.parse(raw);
} catch {
return null;
}
}
function repairedClaims(world,data) {
return {
locks:problemRecord(world,data.locks,repairLock),
entries:problemRecord(world,data.entries,repairEntry),
caches:knownIds(data.caches,new Set(world.caches)),
cores:knownIds(data.cores,new Set(Object.keys(world.cores))),
seenOpen:knownIds(data.seenOpen,new Set(Object.keys(world.things))),
};
}
function parseSave(raw,world) {
const data = readRaw(raw);
if (!isRecord(data) || data.version !== SAVE_VERSION) return createSave(world);
const save = { ...createSave(world),...repairedClaims(world,data),stats:statsFrom(data.stats),ended:data.ended === true };
save.facing = Object.hasOwn(DIRS,data.facing) ? data.facing :START_FACING;
save.xp = Math.max(wholeNumber(data.xp,0),earnedXp(world,save));
const capacity = traceCapacity(levelFor(save.xp));
save.pending = problemRecord(world,data.pending,(value) => repairPending(value,capacity));
save.pos = repairPosition(world,save,data.pos);
return save;
}
function bumped(counts,key) {
return { ...counts,[key]:(counts[key] || 0) + 1 };
}
function recordBreach(save,result) {
const lock = Object.hasOwn(save.locks,result.key) ? save.locks[result.key] :null;
const bestBefore = lock ? lock.best :null;
const gained = replayGain(result.difficulty,{ best:bestBefore,stars:result.stars });
const record = { best:Math.max(bestBefore ?? 0,result.stars),clears:(lock ? lock.clears :0) + 1 };
const next = { ...save,xp:save.xp + gained,locks:{ ...save.locks,[result.key]:record },stats:bumped(save.stats,'breaches') };
return { save:next,gained,xpBefore:save.xp,levelBefore:levelFor(save.xp),levelAfter:levelFor(next.xp),replay:lock !== null,bestBefore };
}
function withPending(save,key,pending) {
const others = Object.entries(save.pending).filter(([other]) => other !== key);
return { ...save,pending:Object.fromEntries(pending === null ? others :[...others,[key,pending]]) };
}
function bumpEntry(save,key) {
return { ...save,entries:bumped(save.entries,key) };
}
function claimOnce(save,claim) {
if (save[claim.field].includes(claim.id)) return { save,gained:0 };
return { save:{ ...save,xp:save.xp + claim.xp,[claim.field]:[...save[claim.field],claim.id] },gained:claim.xp };
}
function claimCache(save,id) {
return claimOnce(save,{ field:'caches',id,xp:CACHE_XP });
}
function claimCore(save,family) {
return claimOnce(save,{ field:'cores',id:family,xp:CORE_XP });
}
function withPosition(save,avatar) {
return { ...save,pos:{ col:avatar.pos.col,row:avatar.pos.row },facing:avatar.facing };
}
function markSeen(save,ids) {
return { ...save,seenOpen:[...new Set([...save.seenOpen,...ids])] };
}
function bumpStat(save,name) {
return { ...save,stats:bumped(save.stats,name) };
}
function markEnded(save) {
return { ...save,ended:true };
}

export {
SAVE_VERSION,
isRecord,
createSave,
parseSave,
recordBreach,
withPending,
bumpEntry,
claimCache,
claimCore,
withPosition,
markSeen,
bumpStat,
markEnded,
};
