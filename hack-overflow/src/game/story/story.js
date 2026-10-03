import {
INTRO,GATE_BEATS,KERNEL_DOOR,FINAL,FINAL_LINE,LAB_BEATS,GENERIC_LAB,QUIPS,ENCRYPTED_HOOKS,ENCRYPTED_FALLBACK,
} from './beats.js';


const TYPE_MS_PER_CHAR = 22;
const CLEAN_STARS = 3;
const LAB_PHASES = { intro:1,outro:1 };
function lineOf([who,text]) {
return { who,text };
}
function beatOf(id,lines) {
return { id,lines:lines.map(lineOf) };
}
function isSeen(seen,id) {
return seen.includes(id);
}
function beatsDue(state) {
const { seen,level,locksLeft,ended } = state;
if (ended) return [];
const gates = GATE_BEATS.filter((gate) => level >= gate.level);
const due = [INTRO,...gates,...(locksLeft === 0 ? [KERNEL_DOOR] :[])];
return due.filter((beat) => !isSeen(seen,beat.id)).map((beat) => beatOf(beat.id,beat.lines));
}
function labBeat(labId,phase) {
if (!Object.hasOwn(LAB_PHASES,phase)) throw new Error('unknown lab phase: ' + phase);
const own = Object.hasOwn(LAB_BEATS,labId) ? LAB_BEATS[labId] :GENERIC_LAB;
return beatOf('lab-' + labId + '-' + phase,own[phase]);
}
function finalBeat() {
return beatOf(FINAL.id,FINAL.lines);
}
function unseenBeats(seen,beats) {
return beats.filter((beat) => !isSeen(seen,beat.id));
}
function pick(list,seed) {
const turn = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) :0;
return list[turn % list.length];
}
function mistakeQuip(seed) {
return pick(QUIPS.mistake,seed);
}
function successQuip(stars,seed) {
return pick(stars >= CLEAN_STARS ? QUIPS.respect :QUIPS.success,seed);
}
function encryptedHook(family) {
return Object.hasOwn(ENCRYPTED_HOOKS,family) ? ENCRYPTED_HOOKS[family] :ENCRYPTED_FALLBACK;
}
function typedChars(line) {
if (line.reduced) return line.length;
return Math.min(line.length,Math.max(0,Math.floor(line.elapsedMs / TYPE_MS_PER_CHAR)));
}
function startFlow(beats) {
return beats.length > 0 ? { queue:beats,beat:0,line:0 } :null;
}
function lineAt(flow) {
const beat = flow.queue[flow.beat];
return { ...beat.lines[flow.line],beatId:beat.id,last:flow.line === beat.lines.length - 1 };
}
function advanceFlow(flow) {
if (!lineAt(flow).last) return { ...flow,line:flow.line + 1 };
return flow.beat + 1 < flow.queue.length ? { ...flow,beat:flow.beat + 1,line:0 } :null;
}
function pendingIds(flow) {
return flow.queue.slice(flow.beat).map((beat) => beat.id);
}

export {
TYPE_MS_PER_CHAR,FINAL_LINE,beatsDue,labBeat,finalBeat,unseenBeats,mistakeQuip,successQuip,encryptedHook,typedChars,
startFlow,lineAt,advanceFlow,pendingIds,
};
