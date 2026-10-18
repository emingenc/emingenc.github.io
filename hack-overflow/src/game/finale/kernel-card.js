import { phaseDoneLines } from './kernel.js';
import { phaseParOps } from './kernel-ring.js';

const BRUTE = 'BRUTE';
const PATCH_FREE = 'PATCH is free. ';
const HALVE_PHASE = 3;
const BRUTE_FRAMES = 'BRUTE: Five frames, five pops. A counter would have said fine.';
const CARD_LINES = Object.freeze({
1:'A tag is one hop. RECALL visits only the tags.',
2:'Last in, first out: a return pops the top frame.',
3:'Halve the range: 128 entries in 9 shots.',
4:'Sorted + two pointers: one sweep, not every triple.',
5:'Pop the smaller back: the deque front is the max.',
});

function bruteCount(phase) {
const entry = phaseDoneLines(phase).find((line) => line.who === BRUTE);
return entry ? entry.text :BRUTE_FRAMES;
}
function lesson(number) {
return (number === HALVE_PHASE ? PATCH_FREE :'') + CARD_LINES[number];
}
function phaseCard(phase,kernel) {
return {
head:'K' + phase.n + ' ' + phase.name + ' HELD',
lines:['YOU ' + kernel.root.you + ' ops . par ' + phaseParOps(phase.n),bruteCount(phase),lesson(phase.n)],
};
}

export { CARD_LINES,phaseCard };
