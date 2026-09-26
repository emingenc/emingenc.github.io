import { uiEl, uiLeetcodeLink } from './dom.js';
import { isFullPass } from '../logic/index.js';
import { segmentIntoChips } from '../logic/line.js';
import { prettyLine, classForm } from '../logic/solution-form.js';
import { uiStarGlyphs, uiDayLabel, uiFormatNumber } from './format.js';
import { uiFamilyName, uiProblemByKey } from './render-lock-left.js';
import { ui } from './app.js';

function uiReviewClassFormText(problem,lock) {
const chips = segmentIntoChips(lock.acceptedText,problem.palette);
return classForm(problem,prettyLine(chips));
}
function uiReviewCodeBlock(problem,lock) {
const codeNode = uiEl('code',{ className:'class-form-code',text:uiReviewClassFormText(problem,lock) });
const code = uiEl('pre',{ className:'review-code',children:[codeNode] });
if (!lock.revealed) return [code];
return [uiEl('p',{ className:'revealed-tag',text:'revealed' }),code];
}
function uiReferenceLine(problem,lock) {
const reference = problem.answer.join(' ');
return reference === lock.acceptedText ? null :uiEl('p',{ className:'reference-line',text:'Reference line: ' + reference });
}
const REVIEW_SLOWER_RATIO = 1.5;
function uiMeasuredMaxOps(lock) {
return ui.audit.checks.judge(lock.key,lock.acceptedText).max_ops;
}
function uiOpsSlowerNote(playerOps,referenceOps) {
return playerOps / referenceOps > REVIEW_SLOWER_RATIO ? ' slower than the reference.' :'';
}
function uiReviewOpsLine(problem,lock) {
const playerOps = uiMeasuredMaxOps(lock);
const referenceOps = problem.max.answer_ops;
const text = 'Your line: ' + uiFormatNumber(playerOps) + ' ops on the max test. '
+ 'reference: Time ' + problem.time + ', ' + uiFormatNumber(referenceOps) + ' ops.'
+ uiOpsSlowerNote(playerOps,referenceOps);
return uiEl('p',{ className:'review-ops',text:text });
}
function uiReviewFirstTryVerdict(lock) {
if (lock.revealed) return 'SHOW LINE used';
const failed = lock.judged.filter(function (entry) { return !isFullPass(entry.outcomes); }).length;
return failed === 0 ? 'FIRST TRY' :failed + ' failed line' + (failed === 1 ? '' :'s');
}
function uiReviewLockMeta(problem) {
const text = 'Time ' + problem.time + ' | Space ' + problem.space + '. Invariant: ' + problem.invariant;
return uiEl('p',{ className:'review-meta',text:text });
}
function uiReviewLockHeading(problem) {
return uiEl('h3',{ className:'review-lock-title',text:problem.number + '. ' + problem.name });
}
function uiReviewLockFamily(lock,problem) {
return uiEl('p',{ className:'review-family',text:uiFamilyName(lock.family) + ' | ' + problem.idea });
}
function uiReviewLockStars(lock) {
return uiEl('p',{ className:'review-stars',text:uiStarGlyphs(lock.stars) + ' ' + uiReviewFirstTryVerdict(lock) });
}
function uiReviewLockBlock(lock) {
const problem = uiProblemByKey(lock.key);
const reference = uiReferenceLine(problem,lock);
let children = [uiReviewLockHeading(problem),uiReviewLockFamily(lock,problem),uiReviewLockMeta(problem)];
children = children.concat(uiReviewCodeBlock(problem,lock));
if (reference) children.push(reference);
children.push(uiReviewOpsLine(problem,lock),uiReviewLockStars(lock),uiLeetcodeLink(problem.slug,'SOLVE IT FOR REAL ↗'));
return uiEl('div',{ className:'review-lock',children:children });
}
function uiReviewLocksList(completedLocks) {
return uiEl('div',{ className:'review-locks',children:completedLocks.map(uiReviewLockBlock) });
}
// Box 0 is "new", never shown as a bare number, so a transition out of it
// reads as an entry (or a first-try promotion) rather than an ordinary
// "box 0 -> box 1" promotion.
const NEW_FAMILY_BOX = 0;
const ENTRY_BOX = 1;
const FIRST_TRY_BOX = 2;
function uiBoxTransitionText(before,after) {
if (before.box === after.box) return 'box ' + before.box;
if (before.box === NEW_FAMILY_BOX && after.box === FIRST_TRY_BOX) return 'new → box 2 (first try)';
if (before.box === NEW_FAMILY_BOX) return 'new → box 1 (entry)';
if (after.box === ENTRY_BOX) return 'box ' + before.box + ' → box 1 (reset)';
return 'box ' + before.box + ' → box ' + after.box;
}
function uiFamilyBoxRow(startProfile,endProfile,familyKey) {
const before = startProfile.families[familyKey];
const after = endProfile.families[familyKey];
const text = uiFamilyName(familyKey) + ': ' + uiBoxTransitionText(before,after) + ', due day ' + uiDayLabel(after.due);
return uiEl('li',{ className:'family-box-row',text:text });
}
function uiBoxLegend() {
return uiEl('p',{ className:'box-legend',text:'Box 1 is the entry and reset box.' });
}
function uiFamilyBoxList(app,run) {
const rows = ui.content.families.map(function (family) { return uiFamilyBoxRow(app.runStartProfile,run.profile,family.key); });
const list = uiEl('ul',{ className:'family-box-list',children:rows });
return uiEl('div',{ className:'family-box-block',children:[uiBoxLegend(),list] });
}

export { uiReviewLocksList, uiFamilyBoxList };
