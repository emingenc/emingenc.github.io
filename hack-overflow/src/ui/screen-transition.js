import { screenTransitionPlan,shakeOffsets,ENTRY_BEAT,entryBeatOrigin } from '../game/screen-transition.js';
import { uiPrefersReducedMotion } from './dom.js';

const SCRIM_ID = 'screen-scrim';
const ENTER_EASING = 'cubic-bezier(0.2,0.7,0.2,1)';
const BEAT_EASING = 'cubic-bezier(0.5,0,0.9,0.6)';
const GRID_CANVAS = '.grid-stage .grid-canvas';
const NO_BEAT = { done:Promise.resolve(),cancel() {} };

function uiCanAnimate(node) {
return Boolean(node) && typeof node.animate === 'function' && !uiPrefersReducedMotion();
}
function uiScrimNode() {
let scrim = document.getElementById(SCRIM_ID);
if (scrim) return scrim;
scrim = document.createElement('div');
scrim.id = SCRIM_ID;
scrim.setAttribute('aria-hidden','true');
document.body.appendChild(scrim);
return scrim;
}
function uiPlayScrim(plan) {
const scrim = uiScrimNode();
if (typeof scrim.animate !== 'function') return;
scrim.className = 'screen-scrim is-' + plan.kind;
scrim.animate([{ opacity:plan.scrimFrom,transform:'scale(1)' },{ opacity:0,transform:'scale(' + plan.scale + ')' }],{ duration:plan.scrimMs,easing:'ease-out' });
}
function uiEnterFrames(plan) {
const rise = plan.riseY > 0 ? { transform:'translateY(' + plan.riseY + 'px)' } :{};
return [{ opacity:0,...rise },{ opacity:1,transform:'none' }];
}
function uiPlayScreenChange(section,change) {
if (section && change.from === change.to && change.to === 'title') section.setAttribute('data-remount','yes');
const plan = screenTransitionPlan(change.from,change.to);
if (!plan || !uiCanAnimate(section)) return;
section.animate(uiEnterFrames(plan),{ duration:plan.enterMs,easing:ENTER_EASING });
uiPlayScrim(plan);
}
function uiBeatCanvas() {
return typeof document.querySelector === 'function' ? document.querySelector(GRID_CANVAS) :null;
}
function uiBeatFrames() {
return [{ transform:'scale(1)',filter:'brightness(1)' },{ transform:'scale(' + ENTRY_BEAT.scale + ')',filter:'brightness(' + ENTRY_BEAT.brightness + ')' }];
}
function uiBeatOrigin(app,canvas) {
const view = app.game.view;
if (!view || !view.avatar) return;
const origin = entryBeatOrigin(view);
canvas.style.transformOrigin = origin.x + 'px ' + origin.y + 'px';
}
function uiStartEntryBeat(app) {
const canvas = uiBeatCanvas();
if (!uiCanAnimate(canvas)) return NO_BEAT;
uiBeatOrigin(app,canvas);
const animation = canvas.animate(uiBeatFrames(),{ duration:ENTRY_BEAT.ms,easing:BEAT_EASING,fill:'forwards' });
const done = new Promise(function (resolve) { window.setTimeout(resolve,ENTRY_BEAT.ms); });
return { done,cancel() { animation.cancel(); canvas.style.transformOrigin = ''; } };
}

function uiShakeFrame(offset) {
return { transform:'translate(' + offset.x.toFixed(1) + 'px,' + offset.y.toFixed(1) + 'px)' };
}
function uiShakeGrid(shake) {
const canvas = uiBeatCanvas();
if (!uiCanAnimate(canvas)) return;
const frames = [{ transform:'translate(0,0)' },...shakeOffsets(shake).map(uiShakeFrame),{ transform:'translate(0,0)' }];
canvas.animate(frames,{ duration:shake.ms,easing:'ease-out' });
}

export { uiPlayScreenChange,uiStartEntryBeat,uiShakeGrid };
