
const WINDOW_MAP = Object.freeze({ text:'DOBECAB',want:'ABC' });
const MOVES = Object.freeze(['extend','shrink','best']);
const SOLVE_LIMIT = 200;
const MISTAKES = new Set(['late-extend','early-shrink','early-best','lost-best','not-shorter']);

function tally(want) {
const count = {};
[...want].forEach((letter) => { count[letter] = (count[letter] || 0) + 1; });
return count;
}
function createWindowMap(puzzle = WINDOW_MAP) {
return { head:0,tail:0,count:tally(puzzle.want),missing:puzzle.want.length,best:null,moves:0,wrong:0,status:'running' };
}
function windowMapNeed(state) {
return Object.fromEntries(Object.entries(state.count).map(([letter,left]) => [letter,Math.max(0,left)]));
}
function windowMapText(state,span = { from:state.tail,to:state.head },puzzle = WINDOW_MAP) {
return span ? puzzle.text.slice(span.from,span.to) :'';
}
function windowMapMoves(state) {
return state.status === 'running' ? [...MOVES] :[];
}
function covered(state) {
return state.missing === 0;
}
function size(state) {
return state.head - state.tail;
}
function bestSize(state) {
return state.best ? state.best.to - state.best.from :Infinity;
}
function mistake(state,kind,note) {
return { state:{ ...state,moves:state.moves + 1,wrong:state.wrong + 1 },kind,note };
}
function breaksOnShrink(state,puzzle) {
const left = state.count[puzzle.text[state.tail]];
return left !== undefined && left >= 0;
}
function spent(state,puzzle) {
return state.head >= puzzle.text.length && !covered(state);
}
function finish(next,puzzle) {
return spent(next,puzzle) ? { ...next,status:'won' } :next;
}
function winNote(state,puzzle) {
return 'Row spent. Shortest cover ' + windowMapText(state,state.best,puzzle) + ', ' + state.moves + ' presses.';
}
function extendTail(left,missing) {
if (left === undefined) return 'Not in the map.';
return left > 0 ? 'Missing ' + missing + '.' :'Spare.';
}
function extend(state,puzzle) {
if (covered(state)) return mistake(state,'late-extend','The window covers. EXTEND only makes it longer: SHRINK while it still covers, or BEST when the next SHRINK would break it.');
const letter = puzzle.text[state.head];
const left = state.count[letter];
const count = left === undefined ? state.count :{ ...state.count,[letter]:left - 1 };
const missing = left !== undefined && left > 0 ? state.missing - 1 :state.missing;
const next = finish({ ...state,head:state.head + 1,count,missing,moves:state.moves + 1 },puzzle);
if (next.status === 'won') return { state:next,kind:'win',note:winNote(next,puzzle) };
if (covered(next)) return { state:next,kind:'extend',note:letter + ' in. Covered: ' + windowMapText(next,undefined,puzzle) + '. SHRINK while it still covers; BEST when the next SHRINK would break it.' };
return { state:next,kind:'extend',note:letter + ' in. ' + extendTail(left,missing) };
}
function shrinkNote(letter,before,next) {
if (next.missing > before.missing) return letter + ' out. Missing ' + next.missing + '.';
return letter + ' out.' + (covered(next) ? ' Still covered.' :'');
}
function shrink(state,puzzle) {
if (!covered(state)) return mistake(state,'early-shrink','Missing ' + state.missing + '. SHRINK only loses more: EXTEND first.');
if (breaksOnShrink(state,puzzle) && size(state) < bestSize(state)) {
return mistake(state,'lost-best',windowMapText(state,undefined,puzzle) + ' is your shortest cover so far, and SHRINK breaks it. BEST it first.');
}
const letter = puzzle.text[state.tail];
const left = state.count[letter];
const count = left === undefined ? state.count :{ ...state.count,[letter]:left + 1 };
const missing = left !== undefined && left >= 0 ? state.missing + 1 :state.missing;
const next = finish({ ...state,tail:state.tail + 1,count,missing,moves:state.moves + 1 },puzzle);
if (next.status === 'won') return { state:next,kind:'win',note:winNote(next,puzzle) };
return { state:next,kind:'shrink',note:shrinkNote(letter,state,next) };
}
function best(state,puzzle) {
if (!covered(state)) return mistake(state,'early-best','The window is missing ' + state.missing + '. BEST keeps a window that covers.');
if (size(state) >= bestSize(state)) return mistake(state,'not-shorter','Your best is ' + bestSize(state) + ' long. Keep a window only when it is shorter.');
const next = { ...state,best:{ from:state.tail,to:state.head },moves:state.moves + 1 };
return { state:next,kind:'best',note:'Kept ' + windowMapText(next,undefined,puzzle) + ' (' + size(next) + '). Shortest so far.' };
}
function applyWindowMap(state,move,puzzle = WINDOW_MAP) {
if (!windowMapMoves(state).includes(move)) return { state,kind:'none',note:'' };
if (move === 'extend') return extend(state,puzzle);
return move === 'shrink' ? shrink(state,puzzle) :best(state,puzzle);
}
function nextMove(state,puzzle) {
if (!covered(state)) return 'extend';
return breaksOnShrink(state,puzzle) && size(state) < bestSize(state) ? 'best' :'shrink';
}
function windowMapMistake(kind) {
return MISTAKES.has(kind);
}
function solveWindowMap(puzzle = WINDOW_MAP) {
const moves = [];
let state = createWindowMap(puzzle);
while (state.status === 'running' && moves.length < SOLVE_LIMIT) {
const move = nextMove(state,puzzle);
moves.push(move);
state = applyWindowMap(state,move,puzzle).state;
}
return { moves,window:windowMapText(state,state.best,puzzle) };
}
function windowMapPar(puzzle = WINDOW_MAP) {
return solveWindowMap(puzzle).moves.length;
}
function bruteWindows(puzzle = WINDOW_MAP) {
const count = puzzle.text.length;
return (count * (count + 1)) / 2;
}

export { WINDOW_MAP,applyWindowMap,bruteWindows,createWindowMap,solveWindowMap,windowMapMistake,windowMapMoves,windowMapNeed,windowMapPar,windowMapText };
