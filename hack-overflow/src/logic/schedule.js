import { hashStr, mulberry32 } from './tray.js';
import { isDue, hasBeenServed, hasBeenSolved, isFamilySolved } from './profile.js';

const RUN_SIZE = 3;

function seededChoice(items,seedText) {
const randomValue = mulberry32(hashStr(seedText))();
const index = Math.min(items.length - 1,Math.floor(randomValue * items.length));
return items[index];
}

function familyByKeyMap(families) {
const byKey = new Map();
for (const family of families) byKey.set(family.key,family);
return byKey;
}
function prereqsMet(profile,family,byKey) {
return family.prereqs.every((prereqKey) => {
const prereqFamily = byKey.get(prereqKey);
return Boolean(prereqFamily) && isFamilySolved(profile,prereqFamily);
});
}
function isFamilyAvailable(profile,family,byKey) {
return family.start_open || prereqsMet(profile,family,byKey);
}
function availableFamilies(profile,families) {
const byKey = familyByKeyMap(families);
return families.filter((family) => isFamilyAvailable(profile,family,byKey));
}

function byDueThenRoute(profile,families) {
const routeIndex = new Map(families.map((family,index) => [family.key,index]));
return (left,right) => {
const dueDelta = profile.families[left.key].due - profile.families[right.key].due;
return dueDelta !== 0 ? dueDelta :routeIndex.get(left.key) - routeIndex.get(right.key);
};
}
function dueFamilies(profile,families,day) {
const due = availableFamilies(profile,families).filter((family) => isDue(profile.families[family.key],day));
return [...due].sort(byDueThenRoute(profile,families));
}
function familiesDueOn(profile,families,day) {
return dueFamilies(profile,families,day);
}

function oldestSolvedSeq(family,profile) {
return Math.min(...family.problems.map((key) => profile.problems[key].solvedSeq));
}
function leastRecentlySolved(family,profile) {
const oldest = oldestSolvedSeq(family,profile);
return family.problems.filter((key) => profile.problems[key].solvedSeq === oldest);
}
function excludingLastServed(candidates,lastServed) {
if (candidates.length === 1) return candidates;
const withoutLast = candidates.filter((key) => key !== lastServed);
return withoutLast.length > 0 ? withoutLast :candidates;
}
function nextUnservedProblem(profile,family) {
return family.problems.find((key) => !hasBeenServed(profile.problems[key])) ?? null;
}
function pickReviewProblem(profile,family,when) {
const familyState = profile.families[family.key];
const candidates = excludingLastServed(leastRecentlySolved(family,profile),familyState.lastServed);
if (candidates.length === 1) return candidates[0];
return seededChoice(candidates,`${family.key}:${when.day}:${when.attempt}`);
}
function pickFailedOrRevealedProblem(profile,family,when) {
const outstanding = family.problems.filter((key) => {
const state = profile.problems[key];
return hasBeenServed(state) && !hasBeenSolved(state);
});
if (outstanding.length === 0) return null;
const familyState = profile.families[family.key];
const candidates = excludingLastServed(outstanding,familyState.lastServed);
if (candidates.length === 1) return candidates[0];
return seededChoice(candidates,`${family.key}:${when.day}:${when.attempt}`);
}
function pickDueProblem(profile,family,when) {
return pickFailedOrRevealedProblem(profile,family,when)
?? nextUnservedProblem(profile,family)
?? pickReviewProblem(profile,family,when);
}
function dueRunItems(profile,families,when) {
const due = dueFamilies(profile,families,when.day).slice(0,RUN_SIZE);
return due.map((family) => ({ key:pickDueProblem(profile,family,when),family:family.key,scored:true }));
}
function newProblemItems(options) {
const { profile,families,excludeKeys,remaining } = options;
const items = [];
for (const family of availableFamilies(profile,families)) {
if (items.length >= remaining) break;
if (excludeKeys.has(family.key)) continue;
const unserved = nextUnservedProblem(profile,family);
if (unserved !== null) items.push({ key:unserved,family:family.key,scored:true });
}
return items;
}
function scheduleForRun(profile,families,when) {
const due = dueRunItems(profile,families,when);
const remaining = RUN_SIZE - due.length;
if (remaining <= 0) return due;
const excludeKeys = new Set(due.map((item) => item.family));
return [...due,...newProblemItems({ profile,families,excludeKeys,remaining })];
}

function unsolvedProblemsIn(profile,family) {
return family.problems
.filter((key) => !hasBeenSolved(profile.problems[key]))
.map((key) => ({ key,family:family.key,scored:false }));
}
function unsolvedAvailableItems(profile,families) {
return availableFamilies(profile,families).flatMap((family) => unsolvedProblemsIn(profile,family));
}
function familyDueDay(profile,family) {
return profile.families[family.key].due;
}
function dueSoonestFamily(profile,families) {
const open = availableFamilies(profile,families);
if (open.length === 0) return null;
return open.reduce((soonest,family) => (familyDueDay(profile,family) < familyDueDay(profile,soonest) ? family :soonest));
}
function practiceSchedule(profile,families,when) {
const unsolved = unsolvedAvailableItems(profile,families).slice(0,RUN_SIZE);
if (unsolved.length > 0) return unsolved;
const family = dueSoonestFamily(profile,families);
return family ? [{ key:pickReviewProblem(profile,family,when),family:family.key,scored:false }] :[];
}

const NEXT_DAY_STEP = 1;
function earliestDueDay(profile,families,today) {
const floor = today + NEXT_DAY_STEP;
const open = availableFamilies(profile,families);
if (open.length === 0) return floor;
const dueDays = open.map((family) => profile.families[family.key].due);
return Math.max(floor,Math.min(...dueDays));
}

export {
seededChoice,
availableFamilies,
dueFamilies,
familiesDueOn,
pickReviewProblem,
pickDueProblem,
scheduleForRun,
practiceSchedule,
earliestDueDay,
};
