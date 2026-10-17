import { BEAM_TEXTS } from '../game/rooms/data/beam-texts.js';
import { fillText } from '../game/rooms/data/turret-texts.js';
import { beamPar,bruteShots } from '../game/rooms/beam.js';
import { uiArenaCard,uiArenaPaidLine } from './arena-shell.js';
import { uiBeamOtherModes } from './beam-modes.js';
import { uiEl } from './dom.js';


const MAX_STARS = 3;
const STAR_ON = '★';
const STAR_OFF = '☆';
const PERCENT = 100;
const MIN_BAR_PERCENT = 6;
const LESSON = 'Halving: 16 cells -> 8 -> 4 -> 2 -> 1';
const TITLES = { w1:BEAM_TEXTS.card.title,w2:'WAVE 2 CLEAR',w3:BEAM_TEXTS.card.title3 };
const BEST_LINE = 'BEST {score}';
const NEW_BEST_LINE = 'NEW BEST {score}';
const FAIL_RULES = { w1:'Each shot must halve the live range: select the middle, then FIRE.',w3:BEAM_TEXTS.card.failRule3 };
const STARS_RULES = { w1:BEAM_TEXTS.card.stars,w3:BEAM_TEXTS.card.stars3 };
const WHYS = { w1:BEAM_TEXTS.card.why,w3:BEAM_TEXTS.card.why3 };
const SWITCH_ACTIONS = { w1:'beam-wave1',w2:'beam-wave2',w3:'beam-wave3' };
const SWITCH_LABELS = { w1:'WAVE 1',w2:'WAVE 2',w3:'WAVE 3' };

function uiBeamActions(app,mode) {
const others = uiBeamOtherModes(app,mode).map((id) => ({ action:SWITCH_ACTIONS[id],label:SWITCH_LABELS[id] }));
return [{ action:'beam-replay',label:'REPLAY' },...others,{ action:'rig-back',label:'LEAVE' }];
}
function uiBeamStar(index,stars) {
const on = index < stars;
return uiEl('span',{ className:'turret-star' + (on ? ' is-on' :''),text:on ? STAR_ON :STAR_OFF });
}
function uiBeamStars(stars) {
const cells = Array.from({ length:MAX_STARS },(unused,index) => uiBeamStar(index,stars));
return uiEl('p',{ className:'beam-stars',children:cells,attrs:{ role:'img','aria-label':stars + ' of ' + MAX_STARS + ' stars' } });
}
function uiBeamBarRow(kind,label,share) {
const fill = uiEl('div',{ className:'turret-vs-fill turret-vs-' + kind });
if (fill.style && typeof fill.style.setProperty === 'function') fill.style.setProperty('--vs',share + '%');
const track = uiEl('div',{ className:'turret-vs-track',children:[fill] });
return uiEl('div',{ className:'turret-vs-row',children:[uiEl('span',{ className:'turret-vs-label',text:label }),track] });
}
function uiBeamVersus(state) {
const brute = bruteShots(state.wave);
const ratio = brute > 0 ? state.probes / brute :1;
const you = Math.min(PERCENT,Math.max(MIN_BAR_PERCENT,Math.round(ratio * PERCENT)));
const rows = [uiBeamBarRow('you','YOU ' + state.probes,you),uiBeamBarRow('brute','BRUTE ' + brute,PERCENT)];
return uiEl('div',{ className:'turret-vs',children:rows,attrs:{ 'aria-hidden':'true' } });
}
function uiBeamScore(state) {
return uiEl('p',{ className:'turret-final-score beam-final-score',text:'SCORE ' + state.score });
}
function uiBeamLine(className,text) {
return uiEl('p',{ className:'arena-card-line ' + className,text });
}
function uiBeamBestLine(result) {
const text = result.scoreImproved ? NEW_BEST_LINE :BEST_LINE;
return result.best && result.best.score > 0 ? [uiBeamLine('beam-best',fillText(text,{ score:result.best.score }))] :[];
}
function uiBeamHow(rule,why) {
const summary = uiEl('summary',{ className:'turret-how-summary',text:BEAM_TEXTS.card.how });
return uiEl('details',{ className:'turret-how',children:[summary,uiBeamLine('turret-rule',rule),uiBeamLine('turret-why',why)] });
}
function uiBeamWordsFor(table,mode) {
return table[mode] ?? table.w1;
}
function uiBeamLessonLines(state,result) {
const first = result.mode === 'w1' && result.firstClear ? [LESSON,BEAM_TEXTS.card.next] :[];
const lines = result.mode === 'w3' ? [BEAM_TEXTS.card.lesson3] :first;
return lines.map((line) => uiBeamLine('beam-lesson',line));
}
function uiBeamWinBody(state,result) {
const values = { shots:state.probes,n:bruteShots(state.wave),par:beamPar(state.wave) };
const head = [uiBeamStars(result.stars),uiBeamScore(state),...uiBeamBestLine(result),uiBeamLine('turret-used',fillText(BEAM_TEXTS.card.used,values))];
const lesson = uiBeamLessonLines(state,result);
return [...head,uiBeamVersus(state),...lesson,uiArenaPaidLine(result.rank,'beam-paid'),uiBeamHow(uiBeamWordsFor(STARS_RULES,result.mode),fillText(uiBeamWordsFor(WHYS,result.mode),values))].filter(Boolean);
}
function uiBeamCard(app,result) {
const state = app.rig.arena.state;
const actions = uiBeamActions(app,result.mode);
if (!result.won) {
const lines = [result.why || '',uiBeamWordsFor(FAIL_RULES,result.mode)].filter(Boolean);
return uiArenaCard(app,{ title:BEAM_TEXTS.card.failTitle,tone:'fail',lines,body:[uiBeamScore(state)],actions });
}
return uiArenaCard(app,{ title:TITLES[result.mode],lines:[],body:uiBeamWinBody(state,result),actions });
}

export { uiBeamCard };
