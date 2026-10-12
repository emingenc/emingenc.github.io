import { hasBeat } from '../ext/ops.js';

const POCKET = Object.freeze({ minCol:34,maxCol:41,minRow:1,maxRow:4 });
const CORRIDOR = Object.freeze({ minCol:34,maxCol:34,minRow:5,maxRow:10 });
const MOUTH = Object.freeze({ col:34,row:10 });
const NEAR = Object.freeze({ minCol:30,maxCol:45,minRow:0,maxRow:13 });
const SIGN = Object.freeze({ col:35,row:10 });
const ROW_WIDTH = POCKET.maxCol - POCKET.minCol + 1;
const ROW_COUNT = POCKET.maxRow - POCKET.minRow + 1;
const DOOR_COUNT = ROW_WIDTH * ROW_COUNT;
const FIRST_DOOR = 0;
const LAST_DOOR = DOOR_COUNT - 1;
const NO_DOOR = -1;
const ANSWERS = Object.freeze({ higher:'HIGHER',lower:'LOWER' });
const BEATS = Object.freeze({ lock:'oracle-lock',higher:'oracle-hi',lower:'oracle-lo' });
const FIND = Object.freeze({ id:'commit-7c1' });
const REWARD = Object.freeze({ source:'oracle-lock',rank:5,toast:'Found commit 7c1. +5 R' });
const PREFIX = 'ORACLE-7: ';
const TOASTS = Object.freeze({ sign:PREFIX + '32 doors. One is the break. I say HIGHER or LOWER.' });
const MEANINGS = Object.freeze({ HIGHER:'the break is a higher door',LOWER:'the break is a lower door' });
const BEAT_OF = Object.freeze({ HIGHER:BEATS.higher,LOWER:BEATS.lower });

function inRect(rect,cell) {
return cell.col >= rect.minCol && cell.col <= rect.maxCol && cell.row >= rect.minRow && cell.row <= rect.maxRow;
}
function inPocket(cell) {
return inRect(POCKET,cell);
}
function inNear(cell) {
return inRect(NEAR,cell);
}
function runsRight(line) {
return line % 2 === 0;
}
function doorCell(index) {
const line = Math.floor(index / ROW_WIDTH);
const offset = index % ROW_WIDTH;
return { col:runsRight(line) ? POCKET.minCol + offset :POCKET.maxCol - offset,row:POCKET.maxRow - line };
}
const DOORS = Object.freeze(Array.from({ length:DOOR_COUNT },(unused,index) => Object.freeze(doorCell(index))));
function doorAt(cell) {
if (!inPocket(cell)) return NO_DOOR;
const line = POCKET.maxRow - cell.row;
return line * ROW_WIDTH + (runsRight(line) ? cell.col - POCKET.minCol :POCKET.maxCol - cell.col);
}
function createOracle() {
return { lo:FIRST_DOOR,hi:LAST_DOOR,opened:[],done:false };
}
function isLive(state,index) {
return !state.done && Number.isInteger(index) && index >= state.lo && index <= state.hi;
}
function answerFor(state,index) {
return state.hi - index >= index - state.lo ? ANSWERS.higher :ANSWERS.lower;
}
function rangeAfter(state,index,answer) {
return answer === ANSWERS.higher ? { lo:index + 1,hi:state.hi } :{ lo:state.lo,hi:index - 1 };
}
function openDoor(state,index) {
if (!isLive(state,index)) return { state,answer:null,moved:false,lock:false };
const answer = answerFor(state,index);
const range = rangeAfter(state,index,answer);
const lock = range.lo === range.hi;
const opened = lock ? [...state.opened,index,range.lo] :[...state.opened,index];
return { state:{ ...range,opened,done:lock },answer,moved:true,lock };
}
function hasEarned(ext) {
return hasBeat(ext,BEATS.lock);
}
function lockLine(index,result) {
return PREFIX + 'door ' + index + '. ' + result.answer + '. LOCK: door ' + result.state.lo + ' opens itself.';
}
function doorTell(ext,index,result) {
if (result.lock) return { text:lockLine(index,result),beat:null };
const beat = BEAT_OF[result.answer];
const text = PREFIX + 'door ' + index + '. ' + result.answer;
return hasBeat(ext,beat) ? { text:text + '.',beat:null } :{ text:text + ': ' + MEANINGS[result.answer] + '.',beat };
}

export {
POCKET,CORRIDOR,MOUTH,NEAR,SIGN,DOORS,DOOR_COUNT,FIRST_DOOR,LAST_DOOR,NO_DOOR,ANSWERS,BEATS,FIND,REWARD,TOASTS,
inPocket,inNear,doorCell,doorAt,createOracle,isLive,openDoor,doorTell,hasEarned,
};
