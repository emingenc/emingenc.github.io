
const LOOP_PINCH = Object.freeze({ nums:Object.freeze([-4,-1,-1,0,1,2,3]),target:0 });
const TRIPLE = 3;
const TRIPLE_ORDERS = 6;
const MOVES = Object.freeze(['advance','l','r','fire']);
const SIDES = {
l:{ step:1,kind:'left',wrong:'wrong-left',right:(sum,target) => sum < target,hint:'L> only raises it. Move <R.' },
r:{ step:-1,kind:'right',wrong:'wrong-right',right:(sum,target) => sum > target,hint:'<R only lowers it. Move L>.' },
};
const SOLVE_LIMIT = 200;
const MISTAKES = new Set(['wrong-left','wrong-right','early-fire','early-advance','pincer-met','dup-i']);

function createLoopPinch(puzzle = LOOP_PINCH) {
return { i:0,l:1,r:puzzle.nums.length - 1,found:[],moves:0,wrong:0,status:'running' };
}
function loopPinchSum(state,puzzle = LOOP_PINCH) {
return puzzle.nums[state.i] + puzzle.nums[state.l] + puzzle.nums[state.r];
}
function loopPinchMoves(state) {
return state.status === 'running' ? [...MOVES] :[];
}
function met(state) {
return state.l >= state.r;
}
function repeatsLast(state,puzzle) {
return state.i > 0 && puzzle.nums[state.i] === puzzle.nums[state.i - 1];
}
function mistake(state,kind,note) {
return { state:{ ...state,moves:state.moves + 1,wrong:state.wrong + 1 },kind,note };
}
function dupNote(state,puzzle) {
return 'ADVANCE i onto another ' + puzzle.nums[state.i] + ' -> same triples twice. Skip duplicate i.';
}
function sayWrong(state,side,puzzle) {
const sum = loopPinchSum(state,puzzle);
if (sum === puzzle.target) return 'Sum ' + sum + ' is the target. Fire now.';
return 'Sum ' + sum + ' is ' + (sum < puzzle.target ? 'below ' :'above ') + puzzle.target + '. ' + side.hint;
}
function exhausted(i,puzzle) {
const { nums,target } = puzzle;
return i > nums.length - TRIPLE || nums[i] + nums[i + 1] + nums[i + 2] > target;
}
function advance(state,puzzle) {
if (!met(state) && !repeatsLast(state,puzzle)) return mistake(state,'early-advance','The pincer is still open. Pinch j and k first, then ADVANCE i.');
const i = state.i + 1;
const next = { ...state,i,l:i + 1,r:puzzle.nums.length - 1,moves:state.moves + 1 };
if (exhausted(i,puzzle)) return { state:{ ...next,status:'won' },kind:'win',note:'No triple is left ahead. Sweep done: ' + next.found.length + ' found in ' + next.moves + ' presses.' };
return { state:next,kind:'advance',note:repeatsLast(next,puzzle) ? 'i is on another ' + puzzle.nums[i] + '. Skip it.' :'i on ' + puzzle.nums[i] + '. Sum ' + loopPinchSum(next,puzzle) + '.' };
}
function movePointer(state,move,puzzle) {
const side = SIDES[move];
const sum = loopPinchSum(state,puzzle);
if (!side.right(sum,puzzle.target)) return mistake(state,side.wrong,sayWrong(state,side,puzzle));
const next = { ...state,moves:state.moves + 1,[move]:state[move] + side.step };
if (met(next)) return { state:next,kind:side.kind,note:'The pincer met. i is done: ADVANCE i.' };
return { state:next,kind:side.kind,note:'Sum ' + loopPinchSum(next,puzzle) + ', target ' + puzzle.target + '.' };
}
function closePast(state,puzzle) {
let { l,r } = state;
l += 1;
r -= 1;
while (l < r && puzzle.nums[l] === puzzle.nums[l - 1]) l += 1;
while (l < r && puzzle.nums[r] === puzzle.nums[r + 1]) r -= 1;
return { ...state,l,r };
}
function fire(state,puzzle) {
const sum = loopPinchSum(state,puzzle);
if (sum !== puzzle.target) return mistake(state,'early-fire','FIRE at ' + sum + ' is not ' + puzzle.target + '. Fire only on ' + puzzle.target + '.');
const triple = [puzzle.nums[state.i],puzzle.nums[state.l],puzzle.nums[state.r]];
const next = closePast({ ...state,moves:state.moves + 1,found:[...state.found,triple] },puzzle);
return { state:next,kind:'fire',note:triple.join(' + ') + ' = ' + puzzle.target + '. Triple ' + next.found.length + '.' };
}
function applyLoopPinch(state,move,puzzle = LOOP_PINCH) {
if (!loopPinchMoves(state).includes(move)) return { state,kind:'none',note:'' };
if (move === 'advance') return advance(state,puzzle);
if (met(state)) return mistake(state,'pincer-met','The pincer met. ADVANCE i.');
if (repeatsLast(state,puzzle)) return mistake(state,'dup-i',dupNote(state,puzzle));
return move === 'fire' ? fire(state,puzzle) :movePointer(state,move,puzzle);
}
function nextMove(state,puzzle) {
if (met(state) || repeatsLast(state,puzzle)) return 'advance';
const sum = loopPinchSum(state,puzzle);
if (sum === puzzle.target) return 'fire';
return sum < puzzle.target ? 'l' :'r';
}
function loopPinchMistake(kind) {
return MISTAKES.has(kind);
}
function solveLoopPinch(puzzle = LOOP_PINCH) {
const moves = [];
let state = createLoopPinch(puzzle);
while (state.status === 'running' && moves.length < SOLVE_LIMIT) {
const move = nextMove(state,puzzle);
moves.push(move);
state = applyLoopPinch(state,move,puzzle).state;
}
return { moves,triples:state.found };
}
function loopPinchPar(puzzle = LOOP_PINCH) {
return solveLoopPinch(puzzle).moves.length;
}
function bruteChecks(puzzle = LOOP_PINCH) {
const count = puzzle.nums.length;
return (count * (count - 1) * (count - 2)) / TRIPLE_ORDERS;
}

export { LOOP_PINCH,applyLoopPinch,bruteChecks,createLoopPinch,loopPinchMistake,loopPinchMoves,loopPinchPar,loopPinchSum,solveLoopPinch };
