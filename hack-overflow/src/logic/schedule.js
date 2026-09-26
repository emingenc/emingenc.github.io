import { hashStr, mulberry32 } from './tray.js';
import { isDue, hasBeenServed, hasBeenSolved, isFamilySolved } from './profile.js';

// Mirrors content/families.json's run_size. Kept as a module constant
// rather than a parameter: scheduleForRun's (profile, families, when)
// signature is shared with src/logic/audit.js's checks.schedule, which
// calls it positionally, so a 4th argument cannot be threaded through
// safely.
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
/**
 * The live families the player may currently be served from: start_open
 * families from day 0, others once every prereq family has at least one
 * solved problem.
 * @param {object} profile
 * @param {Array<object>} families - catalog.data.families, in route order
 * @returns {Array<object>}
 */
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
/**
 * Available families due for a box review today, most-overdue first (ties
 * broken by route order) so a family cannot be starved indefinitely by
 * always losing the route-order tiebreak once more families are due than
 * fit in one run (RUN_SIZE caps a run at 3 locks).
 * @param {object} profile
 * @param {Array<object>} families
 * @param {number} day
 * @returns {Array<object>}
 */
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
/**
 * Picks a review problem from a family that has no unserved problem left:
 * the sibling(s) solved longest ago (or never solved), tie-broken away from
 * the immediately preceding pick, then by a seeded choice.
 * @param {object} profile
 * @param {object} family
 * @param {{day: number, attempt: number}} when
 * @returns {string} a problem key
 */
function pickReviewProblem(profile,family,when) {
const familyState = profile.families[family.key];
const candidates = excludingLastServed(leastRecentlySolved(family,profile),familyState.lastServed);
if (candidates.length === 1) return candidates[0];
return seededChoice(candidates,`${family.key}:${when.day}:${when.attempt}`);
}
/**
 * Picks a problem the player was served but has not (yet) solved on a
 * later try: failed a hidden test, timed out, or used SHOW LINE (CR
 * finding 16). Spaced repetition should bring these back at the family's
 * next due date before any sibling the player has never seen, tie-broken
 * away from the immediately preceding pick, then by a seeded choice.
 * @param {object} profile
 * @param {object} family
 * @param {{day: number, attempt: number}} when
 * @returns {string|null} a problem key, or null when none is outstanding
 */
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
/**
 * Picks the problem to serve for a family that is due today: a problem the
 * player failed or had revealed on its most recent try, when one exists
 * (CR finding 16); otherwise its next never-served problem in authoring
 * order (this both introduces new content and satisfies the due review);
 * otherwise a review pick among its already-served, already-solved
 * siblings.
 * @param {object} profile
 * @param {object} family
 * @param {{day: number, attempt: number}} when
 * @returns {string} a problem key
 */
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
/**
 * Builds one daily run's locks: families due for a box review first (their
 * next unserved problem when one remains, otherwise a review pick), then
 * at most one new problem per still-open
 * family that was not already scheduled, in route order, capped at
 * run_size (3) total.
 * @param {object} profile
 * @param {Array<object>} families - catalog.data.families
 * @param {{day: number, attempt: number}} when
 * @returns {Array<{key: string, family: string, scored: boolean}>}
 */
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
/**
 * Builds a practice run's picks: the player's currently-available,
 * not-yet-solved problems first (family/problem
 * order), falling back to a review pick from the family due soonest once
 * every available problem is solved. Every entry is unscored, so playing
 * it never itself changes a family's box (run-judge.js only promotes or
 * resets a family when a completed lock's `scored` is true).
 * @param {object} profile
 * @param {Array<object>} families - catalog.data.families
 * @param {{day: number, attempt: number}} when
 * @returns {Array<{key: string, family: string, scored: boolean}>}
 */
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
