import { MAX_STARS_PER_LOCK } from './stars.js';

const NEVER = -1;
const START_DAY = 0;
const START_BOX = 0;
const START_SEQ = 0;
const INTERVAL_DAYS = { 1:1,2:3,3:7,4:14,5:30 };
const PROMOTED_FROM_ZERO_BOX = 2;
const MAX_BOX = 5;
const RESET_BOX = 1;
const RESET_DELAY_DAYS = 1;
function newFamilyState() {
return { box:START_BOX,due:START_DAY,lastServed:null };
}
function newProblemState() {
return { solvedSeq:NEVER,servedSeq:NEVER };
}
function createProfile(families) {
const familyState = {};
const problemState = {};
for (const family of families) {
familyState[family.key] = newFamilyState();
for (const key of family.problems) problemState[key] = newProblemState();
}
return { today:START_DAY,attempt:START_SEQ,seq:START_SEQ,families:familyState,problems:problemState };
}
const DEMO_DAY = 3;
function demoFamilyState(family) {
return { box:PROMOTED_FROM_ZERO_BOX,due:DEMO_DAY,lastServed:family.problems[family.problems.length - 1] };
}
function demoProblemStates(families) {
const problemState = {};
let seq = START_SEQ;
for (const family of families) {
for (const key of family.problems) {
problemState[key] = { solvedSeq:seq,servedSeq:seq };
seq += 1;
}
}
return { problemState,seq };
}
function demoProfile(families) {
const { problemState,seq } = demoProblemStates(families);
const familyState = {};
for (const family of families) familyState[family.key] = demoFamilyState(family);
return { today:DEMO_DAY,attempt:START_SEQ,seq,families:familyState,problems:problemState };
}
function isDue(familyState,day) {
return familyState.due <= day;
}
function promoteBox(box) {
return box === START_BOX ? PROMOTED_FROM_ZERO_BOX :Math.min(box + 1,MAX_BOX);
}
function promotedFamilyState(current,day) {
const box = promoteBox(current.box);
return { ...current,box,due:day + INTERVAL_DAYS[box] };
}
function resetFamilyState(current,day) {
return { ...current,box:RESET_BOX,due:day + RESET_DELAY_DAYS };
}
function scoredFamilyState(current,day,stars) {
return stars === MAX_STARS_PER_LOCK ? promotedFamilyState(current,day) :resetFamilyState(current,day);
}
function withLastServed(familyState,problemKey) {
return { ...familyState,lastServed:problemKey };
}
function servedProblemState(current,seq) {
return { ...current,servedSeq:seq };
}
function solvedProblemState(current,seq) {
return { ...current,solvedSeq:seq };
}
function hasBeenServed(problemState) {
return problemState.servedSeq !== NEVER;
}
function hasBeenSolved(problemState) {
return problemState.solvedSeq !== NEVER;
}
/**
 * A family counts as solved once any one of its problems has been solved:
 * a locked family opens once every prereq family has at least one solved
 * problem.
 * @param {object} profile
 * @param {{problems: Array<string>}} family - a live family (its problem keys)
 * @returns {boolean}
 */
function isFamilySolved(profile,family) {
return family.problems.some((key) => hasBeenSolved(profile.problems[key]));
}

export {
createProfile,
demoProfile,
isDue,
scoredFamilyState,
withLastServed,
servedProblemState,
solvedProblemState,
hasBeenServed,
hasBeenSolved,
isFamilySolved,
};
