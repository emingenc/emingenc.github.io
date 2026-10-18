const QUEST_ID = 'anagram-bins';
const BIN_SIZE = 2;
const WORDS = Object.freeze(['zero','one','two','three']);
const CRATES = Object.freeze([
{ id:'ag-1',word:'TAN',col:18,row:14 },{ id:'ag-2',word:'EAT',col:20,row:14 },{ id:'ag-3',word:'TAB',col:22,row:14 },
{ id:'ag-4',word:'ANT',col:26,row:14 },{ id:'ag-5',word:'BAT',col:28,row:14 },{ id:'ag-6',word:'TEA',col:30,row:14 },
].map((crate) => Object.freeze(crate)));
const BINS = Object.freeze([
{ id:'ag-bin-1',key:'a1b1t1',col:19,row:17 },{ id:'ag-bin-2',key:'a1n1t1',col:23,row:17 },{ id:'ag-bin-3',key:'a1e1t1',col:27,row:17 },
].map((bin) => Object.freeze(bin)));
const TEXT = Object.freeze({
taken:'TALLY: You carry all six. Bump the right bin.',
waiting:'TALLY: Bump the bin that fits the top crate.',
wrong:'Not this bin. Count the letters again.',
misfile:(word) => 'Not this bin. ' + word + ' goes to the back.',
full:'That bin is full.',
done:'TALLY: Same counts, same key. The key finds the bin.',
crate:(word) => 'Crate ' + word + '. Count its letters.',
binCode:(key) => 'Bin ' + key + ': ' + spell(key) + '.',
binCount:(key,count) => 'Bin ' + key + ': ' + count + ' of ' + BIN_SIZE,
});
const TALLY_JOB = Object.freeze({ id:QUEST_ID,label:'ANAGRAM BINS',taken:TEXT.taken,waiting:TEXT.waiting });

function spell(key) {
return [...key.matchAll(/([a-z])(\d+)/g)].map((part) => (WORDS[part[2]] || part[2]) + ' ' + part[1]).join(', ');
}
function keyOf(word) {
const counts = new Map();
[...word.toLowerCase()].sort().forEach((letter) => counts.set(letter,(counts.get(letter) || 0) + 1));
return [...counts].map(([letter,count]) => letter + count).join('');
}
function newState() {
return { hand:CRATES.map((crate) => crate.id),placed:{} };
}
function crateOf(id) {
return CRATES.find((crate) => crate.id === id);
}
function binOf(id) {
return BINS.find((bin) => bin.id === id);
}
function topOf(state) {
return crateOf(state.hand[0]);
}
function handTag(state) {
const top = topOf(state);
if (!top) return null;
return state.hand.length > 1 ? top.word + ' +' + (state.hand.length - 1) :top.word;
}
function handTray(state) {
return state.hand.map((id,index) => ({ word:crateOf(id).word,top:index === 0 }));
}
function solidsOf() {
return BINS.map(({ id,col,row }) => ({ id,col,row }));
}
function binCount(state,binId) {
return Object.values(state.placed).filter((placed) => placed === binId).length;
}
function dropInto(state,binId) {
const bin = binOf(binId);
const crate = topOf(state);
if (!bin || !crate) return { kind:'empty',state,count:0 };
const count = binCount(state,binId);
const rest = state.hand.slice(1);
if (keyOf(crate.word) !== bin.key) return { kind:'wrong',state:{ ...state,hand:[...rest,crate.id] },count };
if (count >= BIN_SIZE) return { kind:'full',state,count };
return { kind:'ok',state:{ hand:rest,placed:{ ...state.placed,[crate.id]:binId } },count:count + 1 };
}

export { QUEST_ID,BIN_SIZE,CRATES,BINS,TEXT,TALLY_JOB,keyOf,newState,crateOf,binOf,topOf,handTag,handTray,solidsOf,binCount,dropInto };
