import { counterOf } from './forge-sim.js';
import { HARNESS_FORGE } from './data/harness-forge.js';

const PHASE_WON = 'won';
const PHASE_LOST = 'lost';
const STARS_NONE = 0;
const STARS_SURVIVED = 1;
const STARS_STEADY = 2;
const STARS_CLEAN = 3;
const STEADY_SHARE = 0.6;
const WAVE_NUMBER_BASE = 1;
const NO_COUNT = 0;
const SINGLE = 1;
const MAX_LEAK_LINES = 4;
const MIN_INDEX = 0;
export const XP_BY_STARS = {0:0,1:10,2:18,3:28};
export const STARS_RULE = '1 star: ship the run. 2 stars: keep at least 60% integrity. 3 stars: let nothing through.';
const MISSING = {
guard:'nothing was guarding tool calls',
retry:'a failed step got no second try',
limit:'nothing was capping loops and spend',
log:'nobody could see the hidden hazard',
test:'nothing was running tests'
};

function labelOfThreat(id) {
const threat = HARNESS_FORGE.threats[id];
return threat ? threat.label :id;
}
function labelOfPiece(id) {
const piece = HARNESS_FORGE.pieces[id];
return piece ? piece.label :id;
}
function labelOfCheckpoint(index) {
const labels = HARNESS_FORGE.checkpoints;
const clamped = Math.min(Math.max(index,MIN_INDEX),labels.length - SINGLE);
return labels[clamped];
}
function leakEntry(leak) {
const counter = counterOf(leak.type);
return {
label:labelOfThreat(leak.type),
wave:leak.wave,
checkpointLabel:labelOfCheckpoint(leak.checkpoint),
counterLabel:counter ? labelOfPiece(counter) :'',
counter:counter
};
}
function publicLeak(entry) {
return {label:entry.label,wave:entry.wave,checkpointLabel:entry.checkpointLabel,counterLabel:entry.counterLabel};
}
function uniqueLabels(entries) {
return entries.map((entry) => entry.label).filter((label,i,all) => all.indexOf(label) === i);
}
function waveNumber(entry) {
return entry.wave + WAVE_NUMBER_BASE;
}
function groupKey(entry) {
return entry.label + '|' + entry.wave + '|' + entry.checkpointLabel;
}
function groupLeaks(entries) {
const groups = [];
entries.forEach((entry) => {
const found = groups.find((group) => groupKey(group.entry) === groupKey(entry));
if (found) found.count += SINGLE;
else groups.push({entry:entry,count:SINGLE});
});
return groups;
}
function groupLine(group) {
const entry = group.entry;
const times = group.count > SINGLE ? ' x' + group.count :'';
const why = MISSING[entry.counter] ? ': ' + MISSING[entry.counter] :'';
const counter = entry.counterLabel ? '. Counter: ' + entry.counterLabel :'';
return entry.label + times + ' got through in wave ' + waveNumber(entry) + ' at ' + entry.checkpointLabel + why + counter + '.';
}
function leakLines(entries) {
if (entries.length === NO_COUNT) return ['Nothing got through.'];
const groups = groupLeaks(entries);
const lines = groups.slice(NO_COUNT,MAX_LEAK_LINES).map(groupLine);
const hidden = groups.length - MAX_LEAK_LINES;
if (hidden > NO_COUNT) lines.push('Plus ' + hidden + ' more failure(s) got through.');
return lines;
}
function steadyFloor(state) {
return Math.ceil(STEADY_SHARE * state.maxIntegrity);
}
export function starsFor(state) {
if (state.phase !== PHASE_WON) return STARS_NONE;
if (state.leaks.length === NO_COUNT) return STARS_CLEAN;
if (state.integrity >= steadyFloor(state)) return STARS_STEADY;
return STARS_SURVIVED;
}
export function xpGain(bestBefore,stars) {
const before = XP_BY_STARS[bestBefore] || NO_COUNT;
const now = XP_BY_STARS[stars] || NO_COUNT;
return Math.max(NO_COUNT,now - before);
}
function leaksOfWave(state,index) {
return state.leaks.filter((leak) => leak.wave === index);
}
export function waveReport(state,index) {
const wave = state.waves.find((entry) => entry.index === index);
const leaked = wave ? wave.leaked :leaksOfWave(state,index).map((leak) => leak.type);
const killed = wave ? wave.killed :NO_COUNT;
return {
killed:killed,
leakedLabels:leaked.map(labelOfThreat),
clean:leaked.length === NO_COUNT
};
}
function statusOf(state) {
if (state.phase === PHASE_WON) return 'won';
if (state.phase === PHASE_LOST) return 'lost';
return 'playing';
}
function statusLine(status,stars,state) {
if (status === 'won') return 'Run shipped: ' + state.integrity + '/' + state.maxIntegrity + ' integrity left, ' + stars + ' of 3 stars.';
if (status === 'lost') return 'Run failed: integrity ran out before the harness held.';
return 'Run in progress: ' + state.integrity + '/' + state.maxIntegrity + ' integrity.';
}
export function runSummary(state) {
const status = statusOf(state);
const stars = starsFor(state);
const entries = state.leaks.map(leakEntry);
return {
status:status,
stars:stars,
integrity:state.integrity,
maxIntegrity:state.maxIntegrity,
leaks:entries.map(publicLeak),
lines:[statusLine(status,stars,state)].concat(leakLines(entries)),
gotThrough:uniqueLabels(entries)
};
}
