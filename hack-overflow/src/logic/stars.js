import { isFullPass } from './judge-view.js';

const NO_STARS = 0;
const ONE_STAR = 1;
const TWO_STARS = 2;
const THREE_STARS = 3;
const MAX_STARS_PER_LOCK = THREE_STARS;
const FEW_FAILS_CEILING = 2;

const FIRST_TRY_OPEN = 'open';
const FIRST_TRY_WON = 'won';
const FIRST_TRY_LOST = 'lost';
const FIRST_TRY_RULE = 'First try = your first SUBMIT. RUN is free.';

function countFailedSubmits(submitted) {
return submitted.filter((entry) => !isFullPass(entry.outcomes)).length;
}
/**
 * The first-try state of a lock, from its distinct SUBMIT attempts only:
 * RUN never counts, because RUN is meant to be a safe, repeatable check
 * that must never cost the player their one first-try attempt. `open`
 * before any SUBMIT, `won`/`lost` from the outcome of the very first one,
 * permanently.
 * @param {Array<{text: string, outcomes: string}>} submitted - distinct
 *   texts judged by SUBMIT, in the order first submitted
 * @returns {'open'|'won'|'lost'} the first-try state
 */
function firstTryFor(submitted) {
if (submitted.length === 0) return FIRST_TRY_OPEN;
return isFullPass(submitted[0].outcomes) ? FIRST_TRY_WON :FIRST_TRY_LOST;
}
/**
 * Stars for a lock from its distinct SUBMIT attempts only; RUN never costs
 * a star. Three stars only on a won first try; SHOW LINE always zeroes it.
 * @param {Array<{text: string, outcomes: string}>} submitted - distinct
 *   texts judged by SUBMIT, in the order first submitted
 * @param {boolean} revealed - SHOW LINE was used on this lock
 * @returns {number} 0-3 stars
 */
function starsFor(submitted,revealed) {
if (revealed) return NO_STARS;
if (firstTryFor(submitted) === FIRST_TRY_WON) return THREE_STARS;
const failed = countFailedSubmits(submitted);
return failed <= FEW_FAILS_CEILING ? TWO_STARS :ONE_STAR;
}
const GRADE_A_RATIO = 0.8;
const GRADE_B_RATIO = 0.5;
function isCleanBreach(starsList) {
return starsList.length > 0 && starsList.every((stars) => stars === MAX_STARS_PER_LOCK);
}
function starsRatio(starsList) {
if (starsList.length === 0) return 0;
const earned = starsList.reduce((sum,stars) => sum + stars,0);
return earned / (starsList.length * MAX_STARS_PER_LOCK);
}
function gradeFor(starsList) {
if (isCleanBreach(starsList)) return 'S';
const ratio = starsRatio(starsList);
if (ratio >= GRADE_A_RATIO) return 'A';
return ratio >= GRADE_B_RATIO ? 'B' :'C';
}

export {
MAX_STARS_PER_LOCK,
GRADE_A_RATIO,
GRADE_B_RATIO,
FIRST_TRY_OPEN,
FIRST_TRY_WON,
FIRST_TRY_LOST,
FIRST_TRY_RULE,
starsFor,
firstTryFor,
isCleanBreach,
gradeFor,
};
