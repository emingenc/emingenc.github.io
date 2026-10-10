import { cellKey, findPath, reachable } from './path.js';
import { DIRS, cellToward } from './move.js';
import { rigOf } from './rig-catalog.js';
import { barrierOpen, coreState, LEVEL_XP, unlocksBetween } from './progress.js';
import { lockName, placePhrase, sectorName } from './messages.js';

const REPLAY_TEXT = 'Replay a breached lock for a better star.';
function cellOf(thing) {
return { col:thing.col,row:thing.row };
}
function isNextToReachable(reachableSet,cell) {
return Object.keys(DIRS).some((dir) => reachableSet.has(cellKey(cellToward(cell,dir))));
}
function nearestReachable(ctx,candidates) {
if (candidates.length === 0) return null;
const reachableSet = reachable(ctx.world,ctx.progress,ctx.from);
let best = null;
for (const candidate of candidates) {
if (!isNextToReachable(reachableSet,candidate.cell)) continue;
const dirs = findPath(ctx.world,ctx.progress,{ from:ctx.from,to:candidate.cell });
if (dirs === null) continue;
if (!best || dirs.length < best.steps) best = { ...candidate,steps:dirs.length };
}
return best;
}
function readyCoreCandidates(world,progress) {
return Object.values(world.cores).filter((core) => coreState(world,progress,core.family) === 'ready')
.map((core) => ({ family:core.family,cell:cellOf(core) }));
}
function isGuided(rig) {
const entry = rigOf(rig.rig);
return entry !== null && (entry.guided ?? entry.id === 'ledger');
}
function unmetRigCandidates(world,progress) {
if (progress.breached.size === 0) return [];
return Object.values(world.rigs).filter((rig) => isGuided(rig) && !progress.met?.has(rig.rig)).map((rig) => ({ rig,cell:cellOf(rig) }));
}
function unbreachedLockCandidates(world,progress) {
return world.placed.filter((key) => !progress.breached.has(key)).map((key) => ({ key,cell:cellOf(world.terminals[key]) }));
}
function nextGate(world,progress) {
const gates = Object.values(world.gates).filter((gate) => gate.level > progress.level);
if (gates.length === 0) return null;
const level = Math.min(...gates.map((gate) => gate.level));
const atLevel = gates.filter((gate) => gate.level === level);
return { level,families:atLevel.map((gate) => gate.family),xpToGo:LEVEL_XP[level] - progress.xp,targetId:atLevel[0].id };
}
function closedBarrierRig(world,progress) {
const closed = Object.values(world.barriers ?? {}).find((barrier) => !barrierOpen(world,progress,barrier) && world.rigs[barrier.opens]);
return closed ? world.rigs[closed.opens] :null;
}
function barrierObjective(rig) {
return { text:'Switch off the ' + rigOf(rig.rig).title,targetId:rig.id };
}
function kernelObjective(world) {
return { text:'Open the KERNEL in the SAFEHOUSE.',targetId:world.kernel ? world.kernel.id :null };
}
function coreObjective(world,core) {
return { text:'Claim the ' + sectorName(world,core.family) + ' CORE.',targetId:world.cores[core.family].id };
}
function rigObjective(world,found) {
return { text:'Find ' + found.rig.name + ' in ' + placePhrase(world,found.rig.family) + '.',targetId:found.rig.id };
}
function lockObjective(world,lock) {
const terminal = world.terminals[lock.key];
return { text:'Breach ' + lockName(lock.key) + ' in ' + sectorName(world,terminal.family) + '.',targetId:terminal.id };
}
function gateObjective(world,gate) {
const names = gate.families.map((family) => sectorName(world,family)).join(' and ');
return { text:'Reach LV ' + gate.level + ' to open ' + names + ' (' + gate.xpToGo + ' XP to go).',targetId:gate.targetId };
}
function objectiveFor(world,progress,from) {
if (progress.ended) return { text:'ROOT ACCESS complete. ' + REPLAY_TEXT,targetId:null };
if (progress.left === 0) return kernelObjective(world);
const core = nearestReachable({ world,progress,from },readyCoreCandidates(world,progress));
if (core) return coreObjective(world,core);
const barrierRig = closedBarrierRig(world,progress);
const rig = barrierRig ? null :nearestReachable({ world,progress,from },unmetRigCandidates(world,progress));
if (rig) return rigObjective(world,rig);
const lock = nearestReachable({ world,progress,from },unbreachedLockCandidates(world,progress));
if (lock) return lockObjective(world,lock);
if (barrierRig) return barrierObjective(barrierRig);
const gate = nextGate(world,progress);
if (gate) return gateObjective(world,gate);
return { text:REPLAY_TEXT,targetId:null };
}
function goalLine(world,progress) {
const total = world.placed.length;
return 'ROOT ACCESS · ' + (total - progress.left) + '/' + total + ' locks';
}
function nextUnlock(progress) {
const level = progress.level + 1;
if (!Object.hasOwn(LEVEL_XP,level)) return null;
return { level,xpToGo:LEVEL_XP[level] - progress.xp,unlocks:unlocksBetween(progress.level,level) };
}

export { objectiveFor, goalLine, nextUnlock, closedBarrierRig };
