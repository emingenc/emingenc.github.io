import { lineTextFor } from './line.js';
import { examplesFor, fullJudge } from './judge-view.js';
import { submitFor, VERDICT_WORDS } from './submit-view.js';
import { starsFor, firstTryFor } from './stars.js';
import { scoredFamilyState, withLastServed, servedProblemState, solvedProblemState } from './profile.js';
import { BUILD_PHASE, RESULT_PHASE } from './run-phase.js';

const SHOW_LINE_THRESHOLD = 3;
function recordDistinct(list,text,outcomes,kind) {
if (list.some((entry) => entry.text === text)) return list;
return [...list,{ text,outcomes,kind }];
}
// `kind` ('run' or 'submit') names which action produced this evidence row
// so the result screen can prefix it; a text already recorded keeps the
// kind of its first judged occurrence.
function judgeEntry(catalog,lock,text,kind) {
const { outcomes } = fullJudge(catalog,lock.key,text);
return { lock:{ ...lock,judged:recordDistinct(lock.judged,text,outcomes,kind) },outcomes };
}
function runFailedVisibly(result) {
return !result.ok || result.examples.some((example) => !example.pass);
}
function applyRun(catalog,run) {
if (run.phase !== BUILD_PHASE) return run;
const problem = catalog.problemByKey.get(run.lock.key);
const text = lineTextFor(problem,run.lock.line);
if (text === '') return run;
const result = examplesFor(catalog,run.lock.key,text);
const { lock:judgedLock } = judgeEntry(catalog,run.lock,text,'run');
const bump = runFailedVisibly(result) ? 1 :0;
const lock = { ...judgedLock,lastRun:result,visibleFails:judgedLock.visibleFails + bump };
return { ...run,lock };
}
function submitFailedVisibly(result) {
return result.verdict !== VERDICT_WORDS.P;
}
function applySubmit(catalog,run) {
if (run.phase !== BUILD_PHASE) return run;
const problem = catalog.problemByKey.get(run.lock.key);
const text = lineTextFor(problem,run.lock.line);
if (text === '') return run;
const result = submitFor(catalog,run.lock.key,text);
const { lock:judgedLock,outcomes } = judgeEntry(catalog,run.lock,text,'submit');
const submitted = recordDistinct(judgedLock.submitted || [],text,outcomes,'submit');
const bump = submitFailedVisibly(result) ? 1 :0;
const lock = { ...judgedLock,submitted,lastSubmit:result,visibleFails:judgedLock.visibleFails + bump };
const next = { ...run,lock };
return submitFailedVisibly(result) ? next :completeLock(next,text);
}
function applyShowLine(run) {
if (run.phase !== BUILD_PHASE) return run;
if (run.lock.revealed || run.lock.visibleFails < SHOW_LINE_THRESHOLD) return run;
return { ...run,lock:{ ...run.lock,revealed:true } };
}
function markProblemState(profile,entry) {
const problems = { ...profile.problems };
problems[entry.key] = servedProblemState(problems[entry.key],entry.seq);
if (entry.solved) problems[entry.key] = solvedProblemState(problems[entry.key],entry.seq);
return { ...profile,problems };
}
function markFamilyState(profile,completion) {
const { lock,when,stars } = completion;
const families = { ...profile.families };
families[lock.family] = withLastServed(families[lock.family],lock.key);
if (lock.scored) families[lock.family] = scoredFamilyState(families[lock.family],when.day,stars);
return { ...profile,families };
}
function profileAfterLock(profile,completion) {
const { lock } = completion;
const seq = profile.seq;
const withProblem = markProblemState({ ...profile,seq:seq + 1 },{ key:lock.key,seq,solved:!lock.revealed });
return markFamilyState(withProblem,completion);
}
function summarizeLock(lock) {
return {
key:lock.key,
family:lock.family,
scored:lock.scored,
stars:lock.stars,
revealed:lock.revealed,
acceptedText:lock.acceptedText,
judged:lock.judged,
firstTry:firstTryFor(lock.submitted || []),
};
}
function completeLock(run,text) {
const stars = starsFor(run.lock.submitted || [],run.lock.revealed);
const lock = { ...run.lock,acceptedText:text,stars };
const profile = profileAfterLock(run.profile,{ lock,when:run.when,stars });
return {
...run,
phase:RESULT_PHASE,
profile,
lock,
completedLocks:[...run.completedLocks,summarizeLock(lock)],
completedStars:[...run.completedStars,stars],
};
}

export { applyRun, applySubmit, applyShowLine, SHOW_LINE_THRESHOLD };
