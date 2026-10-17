import { applyLoopPinch,bruteChecks,createLoopPinch,loopPinchMistake,loopPinchPar,loopPinchSum } from '../fusion/loop-pinch.js';
import { trialView as loopChips } from '../fusion/loop-pinch-trial.js';
import { applyMonoDeque,bruteLooks,createMonoDeque,dequeValues,monoDequeMistake,monoDequePar } from '../fusion/mono-deque.js';
import { trialView as dequeChips } from '../fusion/mono-deque-trial.js';

const LOOP_PHASE = 4;
const DEQUE_PHASE = 5;
const LOOP_ROW = Object.freeze({ nums:Object.freeze([-5,-2,-2,0,2,3,4]),target:0 });
const DEQUE_STREAM = Object.freeze({ nums:Object.freeze([2,6,3,1,5,4,7,2,8,3]),k:5 });
const LOOP_POWERS = Object.freeze(['pincer']);
const DEQUE_POWERS = Object.freeze(['net','plate']);
const ROOT_CHECKS_PER_PRESS = 1;
const SEPARATOR = ' . ';

function phaseOf(fields) {
return { ...fields,ops:0,wrong:0,done:false };
}
function createLoopPhase() {
return phaseOf({ n:LOOP_PHASE,name:'LOOP-PINCH',run:createLoopPinch(LOOP_ROW),puzzle:LOOP_ROW,powers:LOOP_POWERS });
}
function createDequePhase() {
return phaseOf({ n:DEQUE_PHASE,name:'MONO DEQUE',run:createMonoDeque(),puzzle:DEQUE_STREAM,powers:DEQUE_POWERS });
}
function withRun(phase,run) {
return { ...phase,run,ops:run.moves,wrong:run.wrong,done:run.status === 'won' };
}
function pressed(phase,played,mistake) {
const next = withRun(phase,played.state);
return { phase:next,kind:played.kind,hurt:mistake(played.kind),note:played.note,ops:next.ops };
}
function pressLoop(phase,move) {
return pressed(phase,applyLoopPinch(phase.run,move,phase.puzzle),loopPinchMistake);
}
function pressDeque(phase,move) {
return pressed(phase,applyMonoDeque(phase.run,move,phase.puzzle),monoDequeMistake);
}
function finalePar(phase) {
return phase.n === LOOP_PHASE ? loopPinchPar(phase.puzzle) :monoDequePar(phase.puzzle);
}
function rootChecks(phase) {
return phase.n === LOOP_PHASE || phase.n === DEQUE_PHASE ? ROOT_CHECKS_PER_PRESS :0;
}
function countOf(phase) {
return 'PRESS ' + phase.ops + SEPARATOR + 'PAR ' + finalePar(phase);
}
function chipsOf(trialView,run) {
return trialView(run).chips;
}
function loopView(phase) {
const { run,puzzle } = phase;
const { nums } = puzzle;
const open = run.l < run.r;
const ask = open ? ['i ' + nums[run.i],'L ' + nums[run.l],'R ' + nums[run.r],'SUM ' + loopPinchSum(run,puzzle)] :['i ' + nums[run.i],'ADVANCE i'];
return {
n:phase.n,head:'K4 ' + phase.name,count:countOf(phase),ask:ask.join(SEPARATOR),
tele:run.found.length > 0 ? 'FOUND ' + run.found.map((triple) => triple.join(' ')).join(' | ') :'FOUND none yet',note:'',fiction:'',
chips:chipsOf(loopChips,run),
};
}
function dequeAsk(run,puzzle) {
const incoming = run.pushed || run.t >= puzzle.nums.length ? [] :['NEXT ' + puzzle.nums[run.t]];
const held = dequeValues(run,puzzle);
return [...incoming,'DEQUE ' + (held.length > 0 ? held.join(' ') :'empty')].join(SEPARATOR);
}
function dequeView(phase) {
const { run,puzzle } = phase;
return {
n:phase.n,head:'K5 ' + phase.name,count:countOf(phase),ask:dequeAsk(run,puzzle),
tele:run.shots.length > 0 ? 'MAX ' + run.shots.join(' ') :'MAX none yet',note:'',fiction:'',
chips:chipsOf(dequeChips,run),
};
}
function bruteLoopLine(phase) {
return 'BRUTE: ' + phase.puzzle.nums.length + ' choose 3 = ' + bruteChecks(phase.puzzle) + ' triples. You pressed ' + phase.ops + '.';
}
function bruteDequeLine(phase) {
const { nums,k } = phase.puzzle;
return 'BRUTE: ' + (nums.length - k + 1) + ' x ' + k + ' = ' + bruteLooks(phase.puzzle) + ' looks. You pressed ' + phase.ops + '.';
}

export { DEQUE_STREAM,LOOP_ROW,bruteDequeLine,bruteLoopLine,createDequePhase,createLoopPhase,dequeView,finalePar,loopView,pressDeque,pressLoop,rootChecks };
