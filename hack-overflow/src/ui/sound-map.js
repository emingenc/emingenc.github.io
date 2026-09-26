import { uiSoundAccepted, uiSoundWrong, uiSoundTle, uiSoundSyntax, uiSoundRunTick, uiSoundSubmitTick, uiSoundBackspace, uiSoundChipAdd } from './audio.js';
import { uiChipPosition, uiLineRemovePosition } from './line-actions.js';

const UI_SOUND_BY_VERDICT = {
ACCEPTED:uiSoundAccepted,
'WRONG ANSWER':uiSoundWrong,
'RUNTIME ERROR':uiSoundWrong,
'TIME LIMIT EXCEEDED':uiSoundTle,
'SYNTAX ERROR':uiSoundSyntax,
};
function uiPlaySubmitSound(run) {
uiSoundSubmitTick();
const verdict = run.lock.lastSubmit && run.lock.lastSubmit.verdict;
const play = UI_SOUND_BY_VERDICT[verdict];
if (play) play();
}
function uiPlayRunSound(run) {
uiSoundRunTick(Boolean(run.lock.lastRun && run.lock.lastRun.ok));
}
const UI_SOUND_BY_ACTION = {
run:uiPlayRunSound,
submit:uiPlaySubmitSound,
backspace:uiSoundBackspace,
clear:uiSoundBackspace,
};
function uiPlayActionSound(actionId,run) {
if (uiChipPosition(actionId) !== null) return uiSoundChipAdd();
if (uiLineRemovePosition(actionId) !== null) return uiSoundBackspace();
const play = UI_SOUND_BY_ACTION[actionId];
if (play) play(run);
}

export { uiPlayActionSound };
