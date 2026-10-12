import { ASSIST_PACE,BRUTE_MS_PER_READ,END_GLYPH,SCORE,SHIELD_W1 } from './data/shield-wave1.js';
import { W1_SPEC } from './data/shield-waves.js';
import { SHIELD_TEXTS } from './data/shield-texts.js';
import { fillText } from './fill-text.js';
import { paceFor } from './pace.js';
import { cloneState,endVolley,outcome } from './shield-round.js';
import { towersAnswer,towersApply,towersBlank,towersPar,towersStars } from './shield-towers.js';


const MAX_STARS = 3;
const MOVES = ['push','pop','breach','clear'];
const TOWER_MOVES = ['push','pop'];
const OPENERS = new Set(['(','[','{']);
const MATCH = { ')':'(',']':'[','}':'{' };
const DEFAULT_CTX = { pace:ASSIST_PACE };

function isOpener(glyph) {
return OPENERS.has(glyph);
}
function judgeVolley(volley) {
const stack = [];
for (let at = 0; at < volley.length; at += 1) {
const glyph = volley[at];
if (isOpener(glyph)) stack.push(glyph);
else if (stack.length === 0) return { valid:false,at,reason:'empty',stack:'' };
else if (MATCH[glyph] !== stack[stack.length - 1]) return { valid:false,at,reason:'mismatch',stack:stack.join('') };
else stack.pop();
}
const valid = stack.length === 0;
return { valid,at:volley.length,reason:valid ? '' :'leftover',stack:stack.join('') };
}
function createShield(wave,options = {}) {
const spec = options.spec || W1_SPEC;
return {
wave,spec,assist:Boolean(options.assist),vi:0,gi:0,stack:[],integrity:spec.integrity,combo:0,maxCombo:0,score:0,
steps:0,wrong:0,missedBreach:0,falseBreach:0,slips:0,results:[],status:'running',last:null,
ans:spec.towers ? towersBlank(wave[0]) :[],answers:[],
};
}
function glyphOf(state) {
const volley = state.wave[state.vi];
if (volley === undefined) return '';
return state.gi < volley.length ? volley[state.gi] :END_GLYPH;
}
function answerFor(state) {
const glyph = glyphOf(state);
if (!glyph) return '';
if (state.spec.towers) return towersAnswer(state);
if (glyph === END_GLYPH) return state.stack.length === 0 ? 'clear' :'breach';
if (isOpener(glyph)) return 'push';
return MATCH[glyph] === state.stack[state.stack.length - 1] ? 'pop' :'breach';
}
function shieldPar(wave,spec = W1_SPEC) {
if (spec.towers) return towersPar(wave);
return wave.reduce((sum,volley) => sum + judgeVolley(volley).at + 1,0);
}
function bruteReads(wave) {
return wave.reduce((sum,volley) => sum + (volley.length * (volley.length + 1)) / 2,0);
}
function shieldStars(state) {
if (state.status !== 'won') return 0;
if (state.spec.towers) return towersStars(state);
if (state.missedBreach + state.falseBreach > 0) return 1;
return state.slips > 0 ? MAX_STARS - 1 :MAX_STARS;
}
function paceAt(elapsedMs,count,assist) {
return paceFrom(elapsedMs,bruteReads(Array(count).fill('x'.repeat(SHIELD_W1.length))),assist);
}
function shieldPace(elapsedMs,state) {
return paceFrom(elapsedMs,bruteReads(state.wave),state.assist);
}
function paceFrom(elapsedMs,reads,assist) {
return paceFor(elapsedMs,reads * BRUTE_MS_PER_READ,assist);
}
function waveClockOn(state) {
return state.steps > 0;
}
function shieldMoves(state) {
if (state.status !== 'running') return [];
return state.spec.towers ? TOWER_MOVES.slice() :MOVES.slice();
}
function playRight(turn) {
const { state,move,glyph,play } = turn;
if (move === 'push') state.stack.push(glyph);
if (move === 'pop') state.stack.pop();
if (move === 'push' || move === 'pop') {
state.gi += 1;
state.score += SCORE.glyph;
return outcome(state,{ kind:move,glyph,points:SCORE.glyph });
}
state.combo += 1;
state.maxCombo = Math.max(state.maxCombo,state.combo);
const points = Math.round(SCORE.block * Math.min(state.combo,state.spec.comboCap) * play.pace);
state.score += points;
outcome(state,{ kind:move,glyph,points,combo:state.combo,blocked:true });
return endVolley(state,'blocked');
}
function missedWhy(state,glyph) {
const top = state.stack[state.stack.length - 1];
if (glyph === END_GLYPH) return fillText(SHIELD_TEXTS.why.missedEnd,{ left:state.stack.join('') });
if (top === undefined) return fillText(SHIELD_TEXTS.why.missedEmpty,{ g:glyph });
return fillText(SHIELD_TEXTS.why.missedTop,{ g:glyph,top });
}
function slipWhy(state,glyph) {
if (glyph === END_GLYPH) return SHIELD_TEXTS.why.slipEnd;
if (isOpener(glyph)) return fillText(SHIELD_TEXTS.why.slipOpen,{ g:glyph });
return fillText(SHIELD_TEXTS.why.slipClose,{ g:glyph,top:state.stack[state.stack.length - 1] });
}
function wrongReason(move,answer) {
if (answer === 'breach') return 'missed';
return move === 'breach' ? 'false' :'slip';
}
const WRONG_COUNTERS = { missed:'missedBreach',false:'falseBreach',slip:'slips' };
const WRONG_WHY = {
missed:(state,glyph) => missedWhy(state,glyph),
false:(state,glyph) => fillText(SHIELD_TEXTS.why.falseBreach,{ g:glyph }),
slip:(state,glyph) => slipWhy(state,glyph),
};
function playWrong(turn,answer) {
const { state,move,glyph } = turn;
const reason = wrongReason(move,answer);
state.wrong += 1;
state[WRONG_COUNTERS[reason]] += 1;
state.combo = 0;
state.integrity -= 1;
outcome(state,{ kind:'wrong',reason,glyph,move,answer,why:WRONG_WHY[reason](state,glyph) + SHIELD_TEXTS.why.hit });
if (state.integrity <= 0) state.status = 'failed';
else endVolley(state,'cracked');
}
function applyShield(state,move,ctx = DEFAULT_CTX) {
if (!shieldMoves(state).includes(move)) return state;
const draft = cloneState(state);
const play = state.assist ? DEFAULT_CTX :Object.assign({},DEFAULT_CTX,ctx);
if (draft.spec.towers) return towersApply(draft,move,play);
const glyph = glyphOf(draft);
const answer = answerFor(draft);
draft.steps += 1;
if (move === answer) playRight({ state:draft,move,glyph,play });
else playWrong({ state:draft,move,glyph },answer);
return draft;
}

export { createShield,applyShield,shieldMoves,glyphOf,answerFor,judgeVolley,shieldPar,bruteReads,shieldStars,paceAt,shieldPace,waveClockOn,isOpener };
