
const PLATE_CELLS = Object.freeze([
Object.freeze({ col:34,row:12,plate:1 }),
Object.freeze({ col:35,row:12,plate:3 }),
Object.freeze({ col:36,row:12,plate:4 }),
Object.freeze({ col:37,row:12,plate:7 }),
Object.freeze({ col:38,row:12,plate:9 }),
]);
const BRIDGE = Object.freeze({
droneId:'plate-drone',
plates:Object.freeze(PLATE_CELLS.map((one) => one.plate)),
target:11,
cells:Object.freeze(PLATE_CELLS.map((one) => Object.freeze({ col:one.col,row:one.row }))),
drone:Object.freeze({ col:36,row:11 }),
hall:Object.freeze({ top:11,bottom:12 }),
twins:Object.freeze([
Object.freeze({ id:'twin-l',col:33,row:10 }),
Object.freeze({ id:'twin-r',col:39,row:10 }),
]),
reward:25,
source:'bridge',
});
const SIDES = {
l:{ step:1,kind:'left',wrong:'wrong-left',right:(sum,target) => sum < target,hint:'L> only raises it. Move <R.' },
r:{ step:-1,kind:'right',wrong:'wrong-right',right:(sum,target) => sum > target,hint:'<R only lowers it. Move L>.' },
};
const STAND_DOWN_TEXT = 'Bridge left as it was.';

function createBridge() {
return { l:0,r:BRIDGE.plates.length - 1,moves:0,wrong:0,status:'running' };
}
function bridgeSum(state) {
return BRIDGE.plates[state.l] + BRIDGE.plates[state.r];
}
function bridgeMoves(state) {
return state.status === 'running' ? ['l','r','fire'] :[];
}
function mistake(state,kind,note) {
return { state:{ ...state,moves:state.moves + 1,wrong:state.wrong + 1 },kind,note };
}
function sayWrong(state,side) {
const sum = bridgeSum(state);
if (sum === BRIDGE.target) return 'Sum ' + sum + ' is the target. Fire now.';
return 'Sum ' + sum + ' is ' + (sum < BRIDGE.target ? 'below ' :'above ') + BRIDGE.target + '. ' + side.hint;
}
function movePointer(state,move) {
const side = SIDES[move];
const sum = bridgeSum(state);
if (!side.right(sum,BRIDGE.target)) return mistake(state,side.wrong,sayWrong(state,side));
const moved = move === 'l' ? { ...state,l:state.l + 1 } :{ ...state,r:state.r - 1 };
if (moved.l >= moved.r) return { state,kind:'none',note:'' };
const next = { ...moved,moves:state.moves + 1 };
return { state:next,kind:side.kind,note:'Sum ' + bridgeSum(next) + ', target ' + BRIDGE.target + '.' };
}
function fire(state) {
const sum = bridgeSum(state);
if (sum !== BRIDGE.target) return mistake(state,'early-fire','FIRE at ' + sum + ' is not ' + BRIDGE.target + '. Fire only on equal.');
const next = { ...state,moves:state.moves + 1,status:'won' };
const note = 'Armour cracked: ' + BRIDGE.plates[state.l] + ' + ' + BRIDGE.plates[state.r] + ' = ' + BRIDGE.target + '. Two pointers, ' + next.moves + ' moves.';
return { state:next,kind:'win',note };
}
function applyBridge(state,move) {
if (!bridgeMoves(state).includes(move)) return { state,kind:'none',note:'' };
return move === 'fire' ? fire(state) :movePointer(state,move);
}
function bridgeStandDown() {
return STAND_DOWN_TEXT;
}

export { BRIDGE,applyBridge,bridgeMoves,bridgeStandDown,bridgeSum,createBridge };
