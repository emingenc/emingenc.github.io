const BASE_XP = { Easy:40,Medium:60,Hard:100 };
const STAR_PERCENT = { 0:50,1:75,2:100,3:150 };
const PERCENT = 100;
const CACHE_XP = 20;
const CORE_XP = 40;
const LEVEL_XP = { 1:0,2:50,3:120,4:220,5:390,6:560,7:760,8:990,9:1250,10:1550 };
const MAX_LEVEL = Object.keys(LEVEL_XP).length;
const RANKS = { 1:'SCRIPT KIDDIE',2:'PACKET PUSHER',3:'PORT SCANNER',4:'SHELL JOCKEY',5:'EXPLOIT DEV',
6:'CIPHER BREAKER',7:'GHOST',8:'ZERO-DAY',9:'SYSOP',10:'ROOT' };
const GATE_LEVELS = { 'two-pointers':3,stack:3,'binary-search':5,window:5 };
const TRACE_BY_LEVEL = { 1:3,2:3,3:3,4:4,5:4,6:4,7:5,8:5,9:6,10:6 };
const EXPLOIT_LEVELS = { scan:2,decrypt:6,scanMk2:8 };
const SCAN_STRIKE_COUNT = 3;
const EXPLOIT_UNLOCKS = {
scan:{ label:'SCAN',detail:'strike up to ' + SCAN_STRIKE_COUNT + ' chips the answer does not need' },
decrypt:{ label:'DECRYPT',detail:'reveal the lock\'s name' },
scanMk2:{ label:'SCAN MK2',detail:'SCAN strikes every chip the answer does not need' },
};
const RANK_PERKS = { 10:'gold avatar trim' };
function xpForBreach(difficulty,stars) {
return BASE_XP[difficulty] * STAR_PERCENT[stars] / PERCENT;
}
function replayGain(difficulty,change) {
const earned = xpForBreach(difficulty,change.stars);
if (typeof change.best !== 'number') return earned;
return Math.max(0,earned - xpForBreach(difficulty,change.best));
}
function levelFor(xp) {
let level = 1;
while (level < MAX_LEVEL && xp >= LEVEL_XP[level + 1]) level += 1;
return level;
}
function levelBand(xp) {
const level = levelFor(xp);
const floor = LEVEL_XP[level];
const next = level < MAX_LEVEL ? LEVEL_XP[level + 1] :null;
return { level,floor,next,into:xp - floor,span:next === null ? 0 :next - floor };
}
function rankFor(level) {
return RANKS[level];
}
function traceCapacity(level) {
return TRACE_BY_LEVEL[level];
}
function exploitsAt(level) {
return Object.keys(EXPLOIT_LEVELS).filter((name) => EXPLOIT_LEVELS[name] <= level);
}
function gateLevel(family) {
return Object.hasOwn(GATE_LEVELS,family) ? GATE_LEVELS[family] :null;
}
function gateUnlocks(level) {
const families = Object.keys(GATE_LEVELS).filter((family) => GATE_LEVELS[family] === level);
return families.length > 0 ? [{ level,kind:'gates',label:'GATES',detail:'sector gates open',families }] :[];
}
function traceUnlocks(level) {
const capacity = TRACE_BY_LEVEL[level];
if (!(capacity > TRACE_BY_LEVEL[level - 1])) return [];
return [{ level,kind:'trace',label:'TRACE ' + capacity,detail:'one more failed BREACH before TRACED',capacity }];
}
function exploitUnlocks(level) {
return Object.keys(EXPLOIT_LEVELS).filter((exploit) => EXPLOIT_LEVELS[exploit] === level)
.map((exploit) => ({ level,kind:'exploit',...EXPLOIT_UNLOCKS[exploit],exploit }));
}
function rankUnlocks(level) {
if (!RANK_PERKS[level]) return [];
return [{ level,kind:'rank',label:RANKS[level],detail:RANK_PERKS[level],rank:RANKS[level] }];
}
const UNLOCKS_AT_LEVEL = [gateUnlocks,traceUnlocks,exploitUnlocks,rankUnlocks];
function unlocksBetween(before,after) {
const unlocks = [];
for (let level = before + 1; level <= after; level += 1) {
for (const unlocksAt of UNLOCKS_AT_LEVEL) unlocks.push(...unlocksAt(level));
}
return unlocks;
}
function progressOf(world,save) {
const level = levelFor(save.xp);
const breached = new Set(Object.keys(save.locks));
const best = {};
for (const key of breached) best[key] = save.locks[key].best;
return {
xp:save.xp,level,rank:rankFor(level),capacity:traceCapacity(level),exploits:exploitsAt(level),
breached,best,caches:new Set(save.caches),cores:new Set(save.cores),
left:world.placed.filter((key) => !breached.has(key)).length,ended:save.ended === true,
};
}
function sectorLocksLeft(world,progress,family) {
const sector = world.sectors[family];
return sector ? sector.keys.filter((key) => !progress.breached.has(key)).length :0;
}
function coreState(world,progress,family) {
if (progress.cores.has(family)) return 'claimed';
const sector = world.sectors[family];
return sector && sector.keys.length > 0 && sectorLocksLeft(world,progress,family) === 0 ? 'ready' :'sealed';
}

export {
CACHE_XP,
CORE_XP,
LEVEL_XP,
MAX_LEVEL,
TRACE_BY_LEVEL,
EXPLOIT_LEVELS,
SCAN_STRIKE_COUNT,
xpForBreach,
replayGain,
levelFor,
levelBand,
rankFor,
traceCapacity,
exploitsAt,
gateLevel,
unlocksBetween,
progressOf,
sectorLocksLeft,
coreState,
};
