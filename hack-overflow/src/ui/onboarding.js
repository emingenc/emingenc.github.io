import { uiEl, uiPointerIsCoarse } from './dom.js';
import { uiVerdictHeld } from './render-submit-panel.js';

const UI_ONBOARD_STAGE_CHIP = 1;
const UI_ONBOARD_STAGE_VERDICT = 2;
const UI_ONBOARD_STAGE_RULE = 3;
const UI_ONBOARD_NEXT_STEP = 'Finish the line, then PROBE it. BREACH once the examples pass.';
const UI_ONBOARD_PASS_STEP = 'Examples pass. BREACH!';
const UI_ONBOARD_SWEEP_TIP = 'Watch the lock: one pin per test, and the larger last pin is the max test.';
function uiProbePassedOnLine(app) {
const lock = app.run ? app.run.lock :null;
const run = lock ? lock.lastRun :null;
if (app.lastPanelKind !== 'run' || !run || !run.ok) return false;
return run.examples.every(function (example) { return example.pass; }) && app.probedLine === lock.line.join();
}
function uiOnboardNextStep(app) {
return uiProbePassedOnLine(app) ? UI_ONBOARD_PASS_STEP :UI_ONBOARD_NEXT_STEP;
}
function uiOnboardStage1Text() {
return uiPointerIsCoarse() ? 'Tap chips to write the missing line.' :'Click chips to write the missing line. Arrow keys pick a chip, Enter adds it.';
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
return app.lastPanelKind === 'run' ? uiOnboardNextStep(app) :app.onboardMessage;
}
function uiOnboardingText(app) {
if (app.onboardStage === UI_ONBOARD_STAGE_CHIP) return uiOnboardStage1Text();
if (app.onboardStage === UI_ONBOARD_STAGE_VERDICT) return uiOnboardNextStep(app);
return app.onboardStage === UI_ONBOARD_STAGE_RULE ? uiOnboardStage3Text(app) :null;
}
function uiOnboardingBanner(app) {
const text = uiOnboardingText(app);
if (!text) return null;
return uiEl('p',{ className:'onboarding-hint',attrs:{ role:'status' },text:text });
}

export { uiProbePassedOnLine, UI_ONBOARD_STAGE_CHIP, UI_ONBOARD_STAGE_VERDICT, UI_ONBOARD_STAGE_RULE, uiOnboardStage3Message, uiOnboardingBanner };
