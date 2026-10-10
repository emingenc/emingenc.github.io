import { cellAt } from './world.js';


const OPENING_CALM_MS = 3000;
const OPENING_ALARM_MS = 1500;
const OPENING_IDLE_TICK_MS = 2500;
const OPENING_DOWN_MS = 900;
const CALM_DRONE_MS = 10000;
const DRONE_DISTANCE = 2;
const OFFSETS = [-DRONE_DISTANCE,-1,0,1,DRONE_DISTANCE];

function ringCells(pos) {
const cells = [];
OFFSETS.forEach((dr) => OFFSETS.forEach((dc) => {
if (Math.max(Math.abs(dr),Math.abs(dc)) === DRONE_DISTANCE) cells.push({ col:pos.col + dc,row:pos.row + dr });
}));
return cells;
}
function openingDroneCell(world,pos) {
const spawn = world.spawn;
const isSpawn = (cell) => Boolean(spawn) && cell.col === spawn.col && cell.row === spawn.row;
return ringCells(pos).find((cell) => cellAt(world,cell)?.kind === 'floor' && !isSpawn(cell)) || null;
}
function createOpening(now) {
return { phase:'calm',since:now };
}
function enter(next,now,cue) {
return { state:{ ...next,since:now },cue };
}
function shiftOpening(state,ms) {
const shifted = { ...state,since:state.since + ms };
if (state.armedAt !== undefined) shifted.armedAt = state.armedAt + ms;
return shifted;
}
function stepSleeping(state,now,moved) {
if (state.armedAt === undefined) return { state:moved ? { ...state,armedAt:now } :state,cue:null };
return now - state.armedAt >= CALM_DRONE_MS ? enter({ phase:'crash',woke:true },now,'wake') :{ state,cue:null };
}
function stepCrash(state,input) {
const { now,droneAlive,moved } = input;
if (!droneAlive) return enter({ phase:'done' },now,state.woke ? 'done' :'kill');
if (!state.woke) return stepSleeping(state,now,moved);
if (now - state.since >= OPENING_IDLE_TICK_MS) return enter({ phase:'crash',woke:true },now,'idle-tick');
return { state,cue:null };
}
function stepDone(state,now) {
return now - state.since >= OPENING_DOWN_MS ? enter({ phase:'over' },now,'finish') :{ state,cue:null };
}
function stepAlarm(state,now) {
return now - state.since >= OPENING_ALARM_MS ? enter({ phase:'crash',woke:false },now,'crash') :{ state,cue:null };
}
function stepOpening(state,input) {
const { now } = input;
if (state.phase === 'calm') return now - state.since >= OPENING_CALM_MS ? enter({ phase:'alarm' },now,'alarm') :{ state,cue:null };
if (state.phase === 'alarm') return stepAlarm(state,now);
if (state.phase === 'crash') return stepCrash(state,input);
if (state.phase === 'done') return stepDone(state,now);
return { state,cue:null };
}

export { CALM_DRONE_MS, OPENING_CALM_MS, OPENING_ALARM_MS, OPENING_IDLE_TICK_MS, OPENING_DOWN_MS, openingDroneCell, createOpening, shiftOpening, stepOpening };
