import { createProfile, startLock } from '../logic/index.js';
import { BUILD_PHASE } from '../logic/run-phase.js';

const LOCK_RUN_DAY = 0;

function scheduleEntryFor(catalog,key) {
return { key,family:catalog.problemByKey.get(key).family,scored:false };
}
function withoutUndefined(fields) {
const defined = {};
for (const key of Object.keys(fields)) {
if (fields[key] !== undefined) defined[key] = fields[key];
}
return defined;
}
function carriedHistoryOf(history) {
const { submitted,judged,visibleFails,revealed } = history || {};
return withoutUndefined({ submitted,judged,visibleFails,revealed });
}
function newLockRun(catalog,spec) {
const when = { day:LOCK_RUN_DAY,attempt:spec.attempt };
const entry = scheduleEntryFor(catalog,spec.key);
const lock = { ...startLock(catalog,when,entry),...carriedHistoryOf(spec.history) };
return {
when,profile:createProfile(catalog.data.families),schedule:[entry],index:0,phase:BUILD_PHASE,
completedLocks:[],completedStars:[],lock,
};
}
function lockHistory(run) {
const { submitted,judged,visibleFails,revealed } = run.lock;
return { submitted:submitted || [],judged,visibleFails,revealed };
}

export { newLockRun, lockHistory };
