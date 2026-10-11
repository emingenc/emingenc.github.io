
const MIRROR = Object.freeze({
plates:'RACEXAR',
cell:Object.freeze({ col:26,row:10 }),
from:Object.freeze({ col:26,row:11 }),
find:'mirror-find',
});
const TEXT = {
start:'A mirror sign. Check the ends first, then move both in.',
locked:'A mirror sign. TWINS have a way in.',
order:'Start at the two ends.',
solved:'Already solved.',
stand:'Sign left as it was.',
};

function mirrorPairs(word) {
return [...Array(Math.floor(word.length / 2)).keys()].map((at) => [at,word.length - 1 - at]);
}
function createMirror() {
return { shown:0,status:'open' };
}
function lettersOf(index) {
const [low,high] = mirrorPairs(MIRROR.plates)[index];
return { first:MIRROR.plates[low],second:MIRROR.plates[high] };
}
function pairLabel(state,index) {
if (index >= state.shown) return '? . ?';
const { first,second } = lettersOf(index);
return first + ' . ' + second;
}
function revealPair(state,index) {
if (state.status === 'found' || index < state.shown) return { state,kind:'done',note:TEXT.solved };
if (index > state.shown) return { state,kind:'order',note:TEXT.order };
const { first,second } = lettersOf(index);
if (first === second) return { state:{ ...state,shown:state.shown + 1 },kind:'match',note:first + ' = ' + second + '. Move both pointers in.' };
const looks = index + 1;
return {
state:{ shown:looks,status:'found' },kind:'mismatch',
note:first + ' is not ' + second + '. ' + MIRROR.plates + ' is not a palindrome. Two pointers found it in ' + looks + ' looks.',
};
}
function mirrorText() {
return { ...TEXT };
}

export { MIRROR,createMirror,mirrorPairs,mirrorText,pairLabel,revealPair };
