import { GHOST } from './beats.js';
import { toastText } from './story.js';

const LADDER_GAP_MS = 2600;
const ORDEAL_BEAT = 'ordeal';
const LV5_BEAT = 'gate-lv5';
const WRITE_ACCESS = 'Write access to everything. No permission gate. No review.';
const LV5_BEFORE = Object.freeze(['So I kept rewriting locks. I wrote something to help.','I do not know where it is now.']);
const LV5_AFTER = Object.freeze(['That flood? I told you I lost something.']);

function ghostToast(text) {
return toastText({ lines:[{ who:GHOST,text }] });
}
function ladderRest(beatId,told = []) {
if (beatId !== LV5_BEAT) return [];
const bent = Array.isArray(told) && told.includes(ORDEAL_BEAT);
return [WRITE_ACCESS,...(bent ? LV5_AFTER :LV5_BEFORE)].map(ghostToast);
}
function ladderTexts(beat,told = []) {
return [toastText(beat),...ladderRest(beat.id,told)];
}

export { LADDER_GAP_MS,ladderRest,ladderTexts };
