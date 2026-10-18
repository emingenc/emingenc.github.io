
const MIRROR = Object.freeze({
plates:'RACEXAR',
cell:Object.freeze({ col:26,row:10 }),
from:Object.freeze({ col:26,row:11 }),
find:'mirror-find',
});
const TEXT = {
start:'A mirror sign. Compare the two ends. Same or different?',
locked:'A mirror sign. TWINS have a way in.',
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
function judgePair(state,verdict) {
if (state.status === 'found' || (verdict !== 'same' && verdict !== 'differ')) return { state,kind:'done',note:TEXT.solved };
const { first,second } = lettersOf(state.shown);
const equal = first === second;
if (equal && verdict === 'same') return { state:{ ...state,shown:state.shown + 1 },kind:'match',note:first + ' = ' + second + '. Move both pointers in.' };
if (equal) return { state,kind:'wrong',note:'Look again at ' + first + ' and ' + second + '.' };
if (verdict === 'same') return { state,kind:'wrong',note:'Look again at ' + first + ' and ' + second + '.' };
const looks = state.shown + 1;
return {
state:{ shown:looks,status:'found' },kind:'mismatch',
note:first + ' is not ' + second + '. ' + MIRROR.plates + ' is not a palindrome. Two pointers found it in ' + looks + ' looks.',
};
}
function mirrorText() {
return { ...TEXT };
}

export { MIRROR,createMirror,judgePair,mirrorPairs,mirrorText };
