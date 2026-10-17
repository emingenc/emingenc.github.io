import { questState } from '../ext/ops.js';
import { STAGE } from '../quest/quests.js';

const DOUBLE_BILLED_ID = 'double-billed';
const WAVE_ID = 'w2';
const TALLY_JOB = Object.freeze({
id:DOUBLE_BILLED_ID,label:'DOUBLE BILLED',
taken:'TALLY: Wave 2. Store the first repeat.',
waiting:'TALLY: Wave 2 is waiting. Store a repeat.',
});
const DOUBLE_BILLED_TEXTS = Object.freeze({
done:'DOUBLE BILLED done: dup receipt',
paid:'TALLY: Billed twice. A count above 1 means seen before.',
});

function movedBy(last,number) {
return Boolean(last) && (last.n === number || movedBy(last.also,number));
}
function billedByMove(state) {
return state.spec.id === WAVE_ID && Boolean(state.billed) && movedBy(state.last,state.billed.n);
}
function billedDue(state,ext) {
return billedByMove(state) && questState(ext,DOUBLE_BILLED_ID) === STAGE.active;
}

export { DOUBLE_BILLED_ID,DOUBLE_BILLED_TEXTS,TALLY_JOB,billedByMove,billedDue };
