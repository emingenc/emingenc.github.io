
const MONO_DEQUE = Object.freeze({ nums:Object.freeze([9,4,7,2,5,3,8,1,6,2]),k:5 });
const MOVES = Object.freeze(['expire','pop','push','shoot']);
const MISTAKES = new Set(['early-expire','early-pop','stale-front','keep-smaller','early-shoot','shoot-first']);
const SOLVE_LIMIT = 400;

function createMonoDeque() {
return { t:0,deque:[],pushed:false,shots:[],moves:0,wrong:0,status:'running' };
}
function dequeValues(state,puzzle = MONO_DEQUE) {
return state.deque.map((at) => puzzle.nums[at]);
}
function monoDequeMoves(state) {
return state.status === 'running' ? [...MOVES] :[];
}
function frontStale(state,puzzle) {
return state.deque.length > 0 && state.deque[0] <= state.t - puzzle.k;
}
function backSmaller(state,puzzle) {
const back = state.deque.at(-1);
return back !== undefined && puzzle.nums[back] < puzzle.nums[state.t];
}
function mistake(state,kind,note) {
return { state:{ ...state,moves:state.moves + 1,wrong:state.wrong + 1 },kind,note };
}
function expire(state,puzzle) {
if (state.deque.length === 0) return mistake(state,'early-expire','The deque is empty. Nothing to expire. PUSH.');
if (!frontStale(state,puzzle)) return mistake(state,'early-expire','Front ' + puzzle.nums[state.deque[0]] + ' is still in the window of ' + puzzle.k + '. Keep it.');
const gone = puzzle.nums[state.deque[0]];
return { state:{ ...state,deque:state.deque.slice(1),moves:state.moves + 1 },kind:'expire',note:'Front ' + gone + ' left the window. Expired.' };
}
function pop(state,puzzle) {
if (state.deque.length === 0) return mistake(state,'early-pop','The deque is empty. PUSH.');
if (!backSmaller(state,puzzle)) return mistake(state,'early-pop','Back ' + puzzle.nums[state.deque.at(-1)] + ' is not smaller than ' + puzzle.nums[state.t] + '. Keep it. PUSH.');
const gone = puzzle.nums[state.deque.at(-1)];
return { state:{ ...state,deque:state.deque.slice(0,-1),moves:state.moves + 1 },kind:'pop',note:'Back ' + gone + ' is smaller than ' + puzzle.nums[state.t] + '. Popped.' };
}
function keptNote(state,puzzle) {
const back = puzzle.nums[state.deque.at(-1)];
const incoming = puzzle.nums[state.t];
return 'Kept ' + back + ' before ' + incoming + ' -> ' + incoming + ' arrived later and leaves later; ' + back + ' can never be the max again. POP BACK.';
}
function push(state,puzzle) {
if (frontStale(state,puzzle)) return mistake(state,'stale-front','Front ' + puzzle.nums[state.deque[0]] + ' left the window. EXPIRE FRONT.');
if (backSmaller(state,puzzle)) return mistake(state,'keep-smaller',keptNote(state,puzzle));
const next = { ...state,deque:[...state.deque,state.t],moves:state.moves + 1 };
const due = state.t >= puzzle.k - 1;
const value = puzzle.nums[state.t];
if (due) return { state:{ ...next,pushed:true },kind:'push',note:'Pushed ' + value + '. The window is full: SHOOT the front.' };
return { state:{ ...next,t:state.t + 1 },kind:'push',note:'Pushed ' + value + '. ' + (puzzle.k - 1 - state.t) + ' more to fill the window.' };
}
function shoot(state,puzzle) {
if (!state.pushed) {
const first = state.t < puzzle.k - 1 ? 'PUSH ' + puzzle.nums[state.t] + ' first. The window is not full yet.' :'PUSH ' + puzzle.nums[state.t] + ' first, then SHOOT.';
return mistake(state,'early-shoot',first);
}
const max = puzzle.nums[state.deque[0]];
const shots = [...state.shots,max];
const tick = state.t + 1;
const next = { ...state,t:tick,pushed:false,shots,moves:state.moves + 1 };
if (tick >= puzzle.nums.length) return { state:{ ...next,status:'won' },kind:'win',note:'Stream done. ' + shots.length + ' maxes in ' + next.moves + ' presses.' };
return { state:next,kind:'shoot',note:'Window max ' + max + '. Shot ' + shots.length + '.' };
}
const APPLY = { expire,pop,push,shoot };
function applyMonoDeque(state,move,puzzle = MONO_DEQUE) {
if (!monoDequeMoves(state).includes(move)) return { state,kind:'none',note:'' };
if (state.pushed && move !== 'shoot') return mistake(state,'shoot-first','The window is full. SHOOT the front.');
return APPLY[move](state,puzzle);
}
function monoDequeMistake(kind) {
return MISTAKES.has(kind);
}
function nextMove(state,puzzle) {
if (state.pushed) return 'shoot';
if (frontStale(state,puzzle)) return 'expire';
return backSmaller(state,puzzle) ? 'pop' :'push';
}
function solveMonoDeque(puzzle = MONO_DEQUE) {
const moves = [];
let state = createMonoDeque();
while (state.status === 'running' && moves.length < SOLVE_LIMIT) {
const move = nextMove(state,puzzle);
moves.push(move);
state = applyMonoDeque(state,move,puzzle).state;
}
return { moves,shots:state.shots };
}
function monoDequePar(puzzle = MONO_DEQUE) {
return solveMonoDeque(puzzle).moves.length;
}
function bruteLooks(puzzle = MONO_DEQUE) {
return (puzzle.nums.length - puzzle.k + 1) * puzzle.k;
}

export { MONO_DEQUE,applyMonoDeque,bruteLooks,createMonoDeque,dequeValues,monoDequeMistake,monoDequeMoves,monoDequePar,solveMonoDeque };
