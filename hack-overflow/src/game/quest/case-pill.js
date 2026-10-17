import { chainSteps } from '../ext/badge-ops.js';
import { hasBeat } from '../ext/ops.js';
import { BEATS } from '../finale/contract.js';
import { STEPS,caseOpen } from './first-bad-commit.js';
import { PILL_MAX } from './quests.js';

const PILL_SEP = ' . ';

function casePillText(ext,save,active = STEPS) {
if (!ext || !caseOpen(ext,save)) return null;
const done = chainSteps(ext);
const left = STEPS.filter((item) => !done[item.bit]);
if (!left.length) return null;
const next = active.find((item) => !done[item.bit]);
const text = 'CASE ' + (STEPS.length - left.length) + '/' + STEPS.length + (next ? PILL_SEP + 'next ' + next.name :'');
return text.slice(0,PILL_MAX);
}
function pillWanted(ext) {
return Boolean(ext && (ext.pin || hasBeat(ext,BEATS.ordeal)));
}

export { casePillText,pillWanted };
