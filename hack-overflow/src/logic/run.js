import { createProfile, demoProfile } from './profile.js';
import { scheduleForRun, practiceSchedule, earliestDueDay } from './schedule.js';
import { buildTray } from './tray.js';
import { canAppendChip, appendChip, removeLastChip, clearLine } from './line.js';
import { applyRun, applySubmit, applyShowLine } from './run-judge.js';
import { BUILD_PHASE, RESULT_PHASE, REVIEW_PHASE } from './run-phase.js';

const PRACTICE_ATTEMPT_STEP = 1;
const NEXT_DAY_ATTEMPT = 0;
function resolveProfile(catalog,options) {
if (options.fresh) return createProfile(catalog.data.families);
return options.profile || demoProfile(catalog.data.families);
}
function emptyLockFields() {
return { line:[],judged:[],visibleFails:0,revealed:false,lastRun:null,lastSubmit:null,acceptedText:null,stars:null };
}
function startLock(catalog,when,scheduled) {
const problem = catalog.problemByKey.get(scheduled.key);
const tray = buildTray(problem,when.day,when.attempt);
return { ...scheduled,tray,...emptyLockFields() };
}
function lockAt(catalog,plan,index) {
return index < plan.schedule.length ? startLock(catalog,plan.when,plan.schedule[index]) :null;
}
function buildSchedule(plan) {
return plan.practice
? practiceSchedule(plan.profile,plan.families,plan.when)
:scheduleForRun(plan.profile,plan.families,plan.when);
}
function newRun(catalog,options) {
const profile = resolveProfile(catalog,options);
const when = { day:options.day,attempt:options.attempt };
const schedule = buildSchedule({ profile,families:catalog.data.families,when,practice:options.practice });
return {
when,
profile:{ ...profile,today:when.day,attempt:when.attempt },
schedule,
index:0,
phase:BUILD_PHASE,
completedLocks:[],
completedStars:[],
lock:lockAt(catalog,{ when,schedule },0),
};
}
function withLine(run,line) {
return { ...run,lock:{ ...run.lock,line } };
}
function chipIndexFromId(optionId) {
const match = /^chip-(\d+)$/.exec(optionId);
return match ? Number(match[1]) :null;
}
function applyChip(run,index) {
if (run.phase !== BUILD_PHASE || index === null) return run;
if (index < 0 || index >= run.lock.tray.order.length) return run;
if (!canAppendChip(run.lock.line)) return run;
return withLine(run,appendChip(run.lock.line,run.lock.tray.order[index]));
}
function applyBackspace(run) {
return run.phase === BUILD_PHASE ? withLine(run,removeLastChip(run.lock.line)) :run;
}
function applyClear(run) {
return run.phase === BUILD_PHASE ? withLine(run,clearLine()) :run;
}
function applyNext(catalog,run) {
if (run.phase !== RESULT_PHASE) return run;
const index = run.index + 1;
const lock = lockAt(catalog,{ when:run.when,schedule:run.schedule },index);
return lock ? { ...run,phase:BUILD_PHASE,index,lock } :{ ...run,phase:REVIEW_PHASE,index,lock:null };
}
function applyPractice(catalog,run) {
if (run.phase !== REVIEW_PHASE) return run;
const when = { day:run.when.day,attempt:run.when.attempt + PRACTICE_ATTEMPT_STEP };
return newRun(catalog,{ ...when,fresh:false,profile:run.profile,practice:true });
}
function applyNextDay(catalog,run) {
if (run.phase !== REVIEW_PHASE) return run;
const day = earliestDueDay(run.profile,catalog.data.families,run.when.day);
return newRun(catalog,{ day,attempt:NEXT_DAY_ATTEMPT,fresh:false,profile:run.profile });
}
const ACT_HANDLERS = {
backspace:(catalog,run) => applyBackspace(run),
clear:(catalog,run) => applyClear(run),
run:(catalog,run) => applyRun(catalog,run),
submit:(catalog,run) => applySubmit(catalog,run),
'show-line':(catalog,run) => applyShowLine(run),
next:(catalog,run) => applyNext(catalog,run),
practice:(catalog,run) => applyPractice(catalog,run),
'next-day':(catalog,run) => applyNextDay(catalog,run),
};
function act(catalog,run,optionId) {
const chipIndex = chipIndexFromId(optionId);
if (chipIndex !== null) return applyChip(run,chipIndex);
const handler = ACT_HANDLERS[optionId];
return handler ? handler(catalog,run) :run;
}

export { newRun, act };
