import { createCatalog } from './context.js';
import { newRun, act } from './run.js';
import { view } from './view.js';
import { rightOptions } from './rightoptions.js';
import { buildTray } from './tray.js';
import { fullJudge, examplesFor } from './judge-view.js';
import { parseCandidate } from './parse-bridge.js';
import { submitFor } from './submit-view.js';
import { scheduleForRun } from './schedule.js';
import { starsFor, gradeFor } from './stars.js';
import { BUILD_PHASE, RESULT_PHASE } from './run-phase.js';

const CONCEPT_ID = 'E';
const RESULT_PHASE_OPTIONS = ['next'];
const NON_BUILD_OPTIONS = [];
function rightOptionsForRun(catalog,run) {
if (run.phase === RESULT_PHASE) return RESULT_PHASE_OPTIONS;
if (run.phase !== BUILD_PHASE) return NON_BUILD_OPTIONS;
const problem = catalog.problemByKey.get(run.lock.key);
return rightOptions(problem,run.lock.tray,run.lock.line);
}
function problemsCheck(catalog) {
return catalog.data.problems.map((problem) => ({
key:problem.key,
family:problem.family,
palette:problem.palette,
slotKind:problem.slot_kind,
skeleton:problem.skeleton,
}));
}
function trayCheck(catalog,key,when) {
return buildTray(catalog.problemByKey.get(key),when.day,when.attempt).labels;
}
function scheduleCheck(catalog,profile,when) {
return scheduleForRun(profile,catalog.data.families,when);
}
function maxTestCheck(catalog,key) {
const problem = catalog.problemByKey.get(key);
const context = catalog.contextFor(key);
const { args,expected } = context.cases.max;
return {
args,
expected,
inputHashOk:context.maxHashes.inputHash === problem.max.input_hash,
expectedHashOk:context.maxHashes.expectedHash === problem.max.expected_hash,
};
}
function buildChecks(catalog) {
return {
problems:() => problemsCheck(catalog),
judge:(key,text) => fullJudge(catalog,key,text),
parse:(key,text) => parseCandidate(catalog.problemByKey.get(key),text),
examples:(key,text) => examplesFor(catalog,key,text),
submit:(key,text) => submitFor(catalog,key,text),
tray:(key,day,attempt) => trayCheck(catalog,key,{ day,attempt }),
schedule:(profile,day,attempt) => scheduleCheck(catalog,profile,{ day,attempt }),
stars:starsFor,
grade:gradeFor,
maxTest:(key) => maxTestCheck(catalog,key),
};
}
function createAudit(data) {
const catalog = createCatalog(data);
return {
concept:CONCEPT_ID,
newRun:(options) => newRun(catalog,options),
view:(run) => view(catalog,run),
act:(run,optionId) => act(catalog,run,optionId),
rightOptions:(run) => rightOptionsForRun(catalog,run),
checks:buildChecks(catalog),
};
}

export { createAudit };
