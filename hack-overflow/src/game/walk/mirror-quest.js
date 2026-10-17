import { MIRROR,mirrorPairs } from '../power/mirror.js';
import { STAGE } from '../quest/quests.js';

const MIRROR_QUEST = Object.freeze({
id:'mirror-sign',
start:'TWINS: First pair that differs ends it.',
done:'TWINS: You moved both pointers. Take a pin.',
});
const EVENTS = { match:{ kind:'slip' },mismatch:{ kind:'progress' } };

function mirrorQuestEvent(kind) {
return Object.hasOwn(EVENTS,kind) ? { ...EVENTS[kind] } :null;
}
function mirrorQuestStarts(view) {
return view.usable && !view.solved && view.stage < STAGE.active;
}
function signRow(shown,status) {
const word = MIRROR.plates;
const pairs = mirrorPairs(word);
const seen = Math.max(0,Math.min(Math.trunc(shown) || 0,pairs.length));
const found = status === 'found' && seen > 0;
const focus = found ? seen - 1 :seen;
const tiles = [...word].map((ch,index) => ({ index,ch,hidden:false,role:'mid',pointer:null }));
pairs.forEach(function (pair,at) {
const hidden = at >= seen;
const role = at < focus ? 'done' :at === focus ? (found ? 'bad' :'next') :'end';
pair.forEach(function (index,side) {
tiles[index] = { index,ch:hidden ? '?' :word[index],hidden,role,pointer:at === focus ? (side === 0 ? 'L' :'R') :null };
});
});
return { tiles,caption:signCaption(pairs,{ seen,found }) };
}
function signCaption(pairs,state) {
const word = MIRROR.plates;
const total = pairs.length;
if (state.found) {
const [low,high] = pairs[state.seen - 1];
return 'Pair ' + state.seen + ' of ' + total + ': ' + word[low] + ' is not ' + word[high];
}
return state.seen < total ? 'Pair ' + (state.seen + 1) + ' of ' + total + ': compare the ends' :'Every pair matches';
}

export { MIRROR_QUEST,mirrorQuestEvent,mirrorQuestStarts,signRow };
