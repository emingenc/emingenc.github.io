import { uiEl, uiPointerIsCoarse } from './dom.js';
import { uiVerdictHeld } from './render-submit-panel.js';

const UI_ONBOARD_STAGE_CHIP = 1;
const UI_ONBOARD_STAGE_VERDICT = 2;
const UI_ONBOARD_STAGE_RULE = 3;
const UI_ONBOARD_NEXT_STEP = 'Finish the line, then PROBE it. BREACH once the examples pass.';
const UI_ONBOARD_SWEEP_TIP = 'Watch the lock: one pin per test, and the larger last pin is the max test.';
function uiOnboardStage1Text() {
return uiPointerIsCoarse() ? 'Tap chips to write the missing line.' :'Arrow keys pick a chip, Enter adds it.';
}
const UI_ONBOARD_RULE_MESSAGES = {
ACCEPTED:'Accepted: it passed every hidden test, then the max test.',
'TIME LIMIT EXCEEDED':'Too slow: your line ran out of its op budget before it could finish. The test panel has the exact numbers.',
'WRONG ANSWER':'Wrong answer: the returned value does not match. Check the evidence in the test panel.',
'RUNTIME ERROR':'Runtime error: that line raised an exception on real input. Check the evidence in the test panel.',
'SYNTAX ERROR':'Syntax error: the game parser flagged your line. Fix the flagged chip.',
};
function uiOnboardStage3Message(verdictWord) {
return UI_ONBOARD_RULE_MESSAGES[verdictWord] || UI_ONBOARD_RULE_MESSAGES['WRONG ANSWER'];
}
function uiOnboardStage3Text(app) {
if (uiVerdictHeld(app)) return UI_ONBOARD_SWEEP_TIP;
return app.lastPanelKind === 'run' ? UI_ONBOARD_NEXT_STEP :app.onboardMessage;
}
function uiOnboardingText(app) {
if (app.onboardStage === UI_ONBOARD_STAGE_CHIP) return uiOnboardStage1Text();
if (app.onboardStage === UI_ONBOARD_STAGE_VERDICT) return UI_ONBOARD_NEXT_STEP;
return app.onboardStage === UI_ONBOARD_STAGE_RULE ? uiOnboardStage3Text(app) :null;
}
function uiOnboardingBanner(app) {
const text = uiOnboardingText(app);
if (!text) return null;
return uiEl('p',{ className:'onboarding-hint',attrs:{ role:'status' },text:text });
}

export { UI_ONBOARD_STAGE_CHIP, UI_ONBOARD_STAGE_VERDICT, UI_ONBOARD_STAGE_RULE, uiOnboardStage3Message, uiOnboardingBanner };
