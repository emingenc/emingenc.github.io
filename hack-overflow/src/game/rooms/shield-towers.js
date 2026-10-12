import { SCORE } from './data/shield-wave1.js';
import { TOWERS } from './data/shield-waves.js';
import { SHIELD_TEXTS } from './data/shield-texts.js';
import { fillText } from './fill-text.js';
import { endVolley,outcome } from './shield-round.js';


const MAX_STARS = 3;

function heightsOf(volley) {
return [...volley].map(Number);
}
function towersBlank(volley) {
return heightsOf(volley || '').map(() => null);
}
function topIndex(state) {
return state.stack[state.stack.length - 1];
}
function heightAt(state,index) {
return Number(state.wave[state.vi][index]);
}
function towersAnswer(state) {
const top = topIndex(state);
return top !== undefined && heightAt(state,top) < heightAt(state,state.gi) ? 'pop' :'push';
}
function towersJudge(volley) {
const heights = heightsOf(volley);
const answers = heights.map(() => TOWERS.none);
const stack = [];
const read = { pushes:0,pops:0,ties:0,multiPops:0 };
heights.forEach((height,index) => {
let popped = 0;
while (stack.length > 0 && heights[stack[stack.length - 1]] < height) {
answers[stack.pop()] = height;
popped += 1;
}
if (stack.length > 0 && heights[stack[stack.length - 1]] === height) read.ties += 1;
if (popped > 1) read.multiPops += 1;
stack.push(index);
read.pushes += 1;
read.pops += popped;
});
return Object.assign(read,{ answers,leftovers:stack.length });
}
function towersPar(wave) {
return wave.reduce((sum,volley) => {
const read = towersJudge(volley);
return sum + read.pushes + read.pops;
},0);
}
function towersStars(state) {
return Math.max(1,MAX_STARS - state.wrong);
}
function closeRound(state,result) {
state.answers.push(state.ans.slice());
endVolley(state,result);
state.ans = state.status === 'running' ? towersBlank(state.wave[state.vi]) :state.ans;
}
function settle(state,play) {
const leftovers = state.stack.length;
state.stack.forEach((index) => { state.ans[index] = TOWERS.none; });
state.combo += 1;
state.maxCombo = Math.max(state.maxCombo,state.combo);
const points = Math.round(SCORE.block * Math.min(state.combo,state.spec.comboCap) * play.pace);
state.score += points;
Object.assign(state.last,{ points:state.last.points + points,combo:state.combo,blocked:true,leftovers });
closeRound(state,'blocked');
}
function playRight(state,move,play) {
const index = state.gi;
const glyph = String(heightAt(state,index));
state.score += SCORE.glyph;
if (move === 'pop') {
const popped = state.stack.pop();
state.ans[popped] = heightAt(state,index);
outcome(state,{ kind:'pop',glyph,top:heightAt(state,popped),index:popped,points:SCORE.glyph });
return state;
}
state.stack.push(index);
state.gi += 1;
outcome(state,{ kind:'push',glyph,index,points:SCORE.glyph });
if (state.gi >= state.wave[state.vi].length) settle(state,play);
return state;
}
function wrongWhy(state,move) {
const glyph = String(heightAt(state,state.gi));
const top = topIndex(state);
if (move === 'push') return fillText(SHIELD_TEXTS.why.towerSkipped,{ g:glyph,top:heightAt(state,top) });
if (top === undefined) return fillText(SHIELD_TEXTS.why.towerEmpty,{ g:glyph });
const kept = heightAt(state,top);
const text = kept === heightAt(state,state.gi) ? SHIELD_TEXTS.why.towerEqual :SHIELD_TEXTS.why.towerTaller;
return fillText(text,{ g:glyph,top:kept });
}
function playWrong(state,move) {
const reason = move === 'push' ? 'skipped' :'waiting';
const why = wrongWhy(state,move) + SHIELD_TEXTS.why.hit;
state.wrong += 1;
state.combo = 0;
state.integrity -= 1;
outcome(state,{ kind:'wrong',reason,glyph:String(heightAt(state,state.gi)),move,answer:towersAnswer(state),why });
if (state.integrity <= 0) state.status = 'failed';
else closeRound(state,'cracked');
return state;
}
function towersApply(draft,move,play) {
draft.steps += 1;
return move === towersAnswer(draft) ? playRight(draft,move,play) :playWrong(draft,move);
}

export { towersBlank,towersAnswer,towersJudge,towersPar,towersStars,towersApply };
