import { ASSIST_PACE,BRUTE_MS_PER_READ,END_GLYPH,PACE_MAX,SCORE,SHIELD_W1 } from './data/shield-wave1.js';
import { SHIELD_TEXTS } from './data/shield-texts.js';
import { fillText } from './data/turret-texts.js';


const MAX_STARS = 3;
const MOVES = ['push','pop','breach','clear'];
const OPENERS = new Set(['(','[']);
const MATCH = { ')':'(',']':'[' };
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
return {
wave,assist:Boolean(options.assist),vi:0,gi:0,stack:[],integrity:SHIELD_W1.integrity,combo:0,maxCombo:0,score:0,
steps:0,wrong:0,missedBreach:0,falseBreach:0,slips:0,results:[],status:'running',last:null,
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
if (glyph === END_GLYPH) return state.stack.length === 0 ? 'clear' :'breach';
if (isOpener(glyph)) return 'push';
return MATCH[glyph] === state.stack[state.stack.length - 1] ? 'pop' :'breach';
}
function shieldPar(wave) {
return wave.reduce((sum,volley) => sum + judgeVolley(volley).at + 1,0);
}
function bruteReads(wave) {
return wave.reduce((sum,volley) => sum + (volley.length * (volley.length + 1)) / 2,0);
}
function shieldStars(state) {
if (state.status !== 'won') return 0;
if (state.missedBreach + state.falseBreach > 0) return 1;
return state.slips > 0 ? MAX_STARS - 1 :MAX_STARS;
}
function paceAt(elapsedMs,count,assist) {
if (assist) return ASSIST_PACE;
const ghostMs = bruteReads(Array(count).fill('x'.repeat(SHIELD_W1.length))) * BRUTE_MS_PER_READ;
const left = ghostMs > 0 ? Math.min(1,Math.max(0,1 - elapsedMs / ghostMs)) :0;
return ASSIST_PACE + (PACE_MAX - ASSIST_PACE) * left;
}
function waveClockOn(state) {
return state.steps > 0;
}
function shieldMoves(state) {
return state.status === 'running' ? MOVES.slice() :[];
}
function cloneState(state) {
return Object.assign({},state,{ stack:state.stack.slice(),results:state.results.slice() });
}
function endVolley(state,result) {
state.results.push(result);
state.vi += 1;
state.gi = 0;
state.stack = [];
if (state.vi >= state.wave.length) state.status = 'won';
}
function outcome(state,extra) {
state.last = Object.assign({ kind:'',glyph:'',points:0,depth:state.stack.length,why:'' },extra);
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
const points = Math.round(SCORE.block * Math.min(state.combo,SHIELD_W1.comboCap) * play.pace);
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
if (state.status !== 'running' || !MOVES.includes(move)) return state;
const draft = cloneState(state);
const glyph = glyphOf(draft);
const answer = answerFor(draft);
const play = state.assist ? DEFAULT_CTX :Object.assign({},DEFAULT_CTX,ctx);
draft.steps += 1;
if (move === answer) playRight({ state:draft,move,glyph,play });
else playWrong({ state:draft,move,glyph },answer);
return draft;
}

export { createShield,applyShield,shieldMoves,glyphOf,answerFor,judgeVolley,shieldPar,bruteReads,shieldStars,paceAt,waveClockOn,isOpener };
