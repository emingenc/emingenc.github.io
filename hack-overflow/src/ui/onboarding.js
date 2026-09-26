import { uiEl, uiPointerIsCoarse } from './dom.js';
import { testCounts } from '../judge/counts.js';
import { ui } from './app.js';

const UI_ONBOARD_STAGE_CHIP = 1;
const UI_ONBOARD_STAGE_VERDICT = 2;
const UI_ONBOARD_STAGE_RULE = 3;
function uiOnboardStage1Text() {
return uiPointerIsCoarse() ? 'Tap chips to write the missing line.' :'Arrow keys pick a chip, Enter adds it.';
}
// "N tests (E examples + H hidden), then the max test" is read from the
// current lock's own problem so no problem's count is ever a hardcoded
// literal.
function uiOnboardStage2Text(app) {
const problem = ui.content.problems.find(function (candidate) { return candidate.key === app.run.lock.key; });
const counts = testCounts(problem.cases);
return 'RUN checks the examples. SUBMIT runs ' + counts.total + ' tests (' + counts.examples + ' examples + '
+ counts.hidden + ' hidden), then the max test.';
}
// States the outcome only, never the fix: the exact op count and n are
// already in the test panel below, so this rule line only names what
// happened, the same wording for every problem.
const UI_ONBOARD_RULE_MESSAGES = {
ACCEPTED:'Accepted: it passed every hidden test, then the max test.',
'TIME LIMIT EXCEEDED':'Too slow: your line ran out of its op budget before it could finish. See the test panel below for the exact numbers.',
'WRONG ANSWER':'Wrong answer: the returned value does not match. Check the evidence below.',
'RUNTIME ERROR':'Runtime error: that line raised an exception on real input. Check the evidence below.',
'SYNTAX ERROR':'Syntax error: the game parser flagged your line. Fix the flagged chip.',
};
function uiOnboardStage3Message(verdictWord) {
return UI_ONBOARD_RULE_MESSAGES[verdictWord] || UI_ONBOARD_RULE_MESSAGES['WRONG ANSWER'];
}
function uiOnboardingText(app) {
if (app.onboardStage === UI_ONBOARD_STAGE_CHIP) return uiOnboardStage1Text();
if (app.onboardStage === UI_ONBOARD_STAGE_VERDICT) return uiOnboardStage2Text(app);
return app.onboardStage === UI_ONBOARD_STAGE_RULE ? app.onboardMessage :null;
}
function uiOnboardingBanner(app) {
const text = uiOnboardingText(app);
if (!text) return null;
return uiEl('p',{ className:'onboarding-hint',attrs:{ role:'status' },text:text });
}

export { UI_ONBOARD_STAGE_CHIP, UI_ONBOARD_STAGE_VERDICT, UI_ONBOARD_STAGE_RULE, uiOnboardStage3Message, uiOnboardingBanner };
