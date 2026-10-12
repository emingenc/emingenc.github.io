
const SHOT_KINDS = Object.freeze({
b:Object.freeze({ glyph:'B',colour:'blue' }),
c:Object.freeze({ glyph:'C',colour:'green' }),
d:Object.freeze({ glyph:'D',colour:'amber' }),
e:Object.freeze({ glyph:'E',colour:'violet' }),
});
const LANE = Object.freeze({
shots:Object.freeze([...'bccbde'].map((letter) => SHOT_KINDS[letter])),
reward:25,
source:'lane',
find:'lane-find',
ally:'sill',
power:'net',
});
const LIGHT_STEPS = 3;
const VERBS = ['extend','shrink','catch'];
const LANE_TEXT = Object.freeze({
start:'SILL\'s lane. Slide the frame over the shots and catch the longest run with no colour twice.',
locked:'A drone lane. SILL has a frame for it.',
stand:'Lane left as it was.',
reset:'The searchlight swept the frame. It starts again, nothing lost.',
lend:Object.freeze(['Take three trials of the net. Keep the frame clean.','3 NET trials lent.']),
again:Object.freeze(['Back again? Three more.']),
owned:'The net is yours now. Keep the frame clean.',
});
const START_FRAME = Object.freeze({ l:0,r:1 });

function createLane() {
return { ...START_FRAME,light:0,moves:0,wrong:0,resets:0,status:'running' };
}
function laneFrame(state,shots = LANE.shots) {
return shots.slice(state.l,state.r);
}
function laneBest(shots = LANE.shots) {
let best = 0;
let from = 0;
const seen = new Map();
shots.forEach((shot,at) => {
from = Math.max(from,(seen.get(shot.colour) ?? -1) + 1);
seen.set(shot.colour,at);
best = Math.max(best,at - from + 1);
});
return best;
}
function laneMoves(state) {
return state.status === 'running' ? [...VERBS] :[];
}
function peekOf(state,shots) {
return shots[state.r];
}
function peekRepeats(state,shots) {
const peek = peekOf(state,shots);
return Boolean(peek) && laneFrame(state,shots).some((shot) => shot.colour === peek.colour);
}
function mistake(state,kind,note) {
const next = { ...state,moves:state.moves + 1,wrong:state.wrong + 1,light:state.light + 1 };
if (next.light < LIGHT_STEPS) return { state:next,kind,note };
return { state:{ ...next,...START_FRAME,light:0,resets:state.resets + 1 },kind:'reset',note:note + ' ' + LANE_TEXT.reset };
}
function extend(state,shots) {
const peek = peekOf(state,shots);
if (!peek) return { state,kind:'none',note:'' };
if (peekRepeats(state,shots)) return mistake(state,'tear','EXTEND onto the second ' + peek.colour + ' -> frame tore. Shrink past the first ' + peek.colour + ' first.');
const next = { ...state,r:state.r + 1,moves:state.moves + 1 };
return { state:next,kind:'extend',note:'Frame holds ' + (next.r - next.l) + '.' };
}
function shrink(state,shots) {
if (!peekRepeats(state,shots)) return mistake(state,'wasted','SHRINK with no repeat in the frame -> wasted step. Shrink only until the repeat leaves.');
const next = { ...state,l:state.l + 1,moves:state.moves + 1 };
return { state:next,kind:'shrink',note:'Frame holds ' + (next.r - next.l) + '.' };
}
function sayCatch(state,shots) {
const held = state.r - state.l;
const best = laneBest(shots);
if (held < best) return mistake(state,'short','That frame holds ' + held + '. A run of ' + best + ' exists. Slide on.');
const next = { ...state,moves:state.moves + 1,status:'found' };
return { state:next,kind:'found',note:'Run caught: ' + held + ' shots, no colour twice, in ' + next.moves + ' presses.' };
}
const PLAY = { extend,shrink,catch:sayCatch };

function applyLane(state,move,shots = LANE.shots) {
if (!laneMoves(state).includes(move)) return { state,kind:'none',note:'' };
return PLAY[move](state,shots);
}
function laneLine(shots = LANE.shots) {
const best = laneBest(shots);
const line = [];
let state = createLane();
while (state.r - state.l < best) {
const move = peekRepeats(state,shots) ? 'shrink' :'extend';
line.push(move);
state = applyLane(state,move,shots).state;
}
return [...line,'catch'];
}

export { LANE,LANE_TEXT,LIGHT_STEPS,applyLane,createLane,laneBest,laneFrame,laneLine,laneMoves };
