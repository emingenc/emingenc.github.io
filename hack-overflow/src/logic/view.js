import { canAppendChip } from './line.js';
import { gradeFor, isCleanBreach, firstTryFor, FIRST_TRY_RULE } from './stars.js';
import { SHOW_LINE_THRESHOLD } from './run-judge.js';
import { BUILD_PHASE, RESULT_PHASE, REVIEW_PHASE } from './run-phase.js';

const BACKSPACE_LABEL = '⌫';
function chipOption(tray,position) {
return { id:`chip-${position}`,label:tray.labels[position] };
}
function chipOptions(lock) {
if (!canAppendChip(lock.line)) return [];
return lock.tray.order.map((_,position) => chipOption(lock.tray,position));
}
function editOptions(lock) {
return lock.line.length > 0 ? [{ id:'backspace',label:BACKSPACE_LABEL },{ id:'clear',label:'CLEAR' }] :[];
}
function showLineEligible(lock) {
return !lock.revealed && lock.visibleFails >= SHOW_LINE_THRESHOLD;
}
function judgeOptions(lock) {
if (lock.line.length === 0) return [];
const options = [{ id:'run',label:'RUN' },{ id:'submit',label:'SUBMIT' }];
if (showLineEligible(lock)) options.push({ id:'show-line',label:'SHOW LINE' });
return options;
}
function buildOptions(lock) {
return [...chipOptions(lock),...editOptions(lock),...judgeOptions(lock)];
}
const NEXT_LOCK_OPTIONS = [{ id:'next',label:'NEXT LOCK' }];
const REVIEW_OPTIONS = [{ id:'practice',label:'PRACTICE AGAIN' },{ id:'next-day',label:'NEXT DUE DAY (DEMO)' }];
function optionsFor(run) {
if (run.phase === BUILD_PHASE) return buildOptions(run.lock);
return run.phase === RESULT_PHASE ? NEXT_LOCK_OPTIONS :REVIEW_OPTIONS;
}
function lockLineTexts(problem,lock) {
return lock.line.map((paletteIndex) => problem.palette[paletteIndex]);
}
function publicProblemFields(problem) {
return { statement:problem.statement,constraints:problem.constraints,skeleton:problem.skeleton,slotKind:problem.slot_kind };
}
function revealedProblemFields(problem) {
return { number:problem.number,name:problem.name,slug:problem.slug,time:problem.time,space:problem.space,invariant:problem.invariant };
}
function identityRevealed(run) {
return run.phase !== BUILD_PHASE || run.lock.revealed;
}
function lockView(catalog,run) {
const problem = catalog.problemByKey.get(run.lock.key);
const identity = identityRevealed(run) ? revealedProblemFields(problem) :{};
return {
family:run.lock.family,
scored:run.lock.scored,
tray:run.lock.tray.labels,
line:lockLineTexts(problem,run.lock),
firstTry:firstTryFor(run.lock.submitted || []),
firstTryRule:FIRST_TRY_RULE,
revealed:run.lock.revealed,
revealedText:run.lock.revealed ? problem.answer.join(' ') :null,
lastRun:run.lock.lastRun,
lastSubmit:run.lock.lastSubmit,
stars:run.lock.stars,
...publicProblemFields(problem),
...identity,
};
}
function promptFor(catalog,run) {
return run.phase === REVIEW_PHASE ? null :catalog.problemByKey.get(run.lock.key).statement;
}
function view(catalog,run) {
const done = run.phase === REVIEW_PHASE;
const top = done && isCleanBreach(run.completedStars);
const grade = gradeFor(run.completedStars);
const base = { phase:run.phase,prompt:promptFor(catalog,run),options:optionsFor(run),done,top,grade,profile:run.profile };
return done ? { ...base,completedLocks:run.completedLocks } :{ ...base,lock:lockView(catalog,run) };
}

export { view };
