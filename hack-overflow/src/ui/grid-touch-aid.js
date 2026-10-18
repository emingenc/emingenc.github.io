import { BOLT_RANGE, nearestAwakeFoe } from '../game/actors.js';
import { hasBeat, withBeat } from '../game/ext/ops.js';
import { createExt } from '../game/save-ext.js';
import { SHOT_COOLDOWN_MS, SHOT_RANGE } from '../game/sentry-lanes.js';
import { uiEl, uiPointerIsCoarse } from './dom.js';
import { uiCommitExt } from './ext-storage.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiGridShot, uiLiveFoes } from './grid-actors.js';
import { uiFireButton } from './grid-fire.js';
import { uiShowToast } from './grid-toast.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-touch-aid.css';
const TIP_BEAT = 'tap-walk-tip';
const TIP_TEXT = 'Tap a tile to walk there';
const MAX_PIPS = 3;
const QUEUED_CLASS = 'grid-fire-queued';
const BUMP_CLASS = 'grid-fire-bump';
const BUMP_MS = 220;
const TIMER_SLACK_MS = 20;

function uiReach(foe,pos) {
return Math.max(Math.abs(foe.col - pos.col),Math.abs(foe.row - pos.row));
}
function uiPips() {
return Array.from({ length:MAX_PIPS },() => uiEl('span',{ className:'grid-aim-pip' }));
}
function uiMakeReticle() {
const pips = uiEl('span',{ className:'grid-aim-pips',children:uiPips() });
return uiEl('div',{ className:'grid-aim-reticle',attrs:{ 'aria-hidden':'true' },children:[pips] });
}
function uiReticleFor(app,state) {
const layer = app.game.touch?.node;
if (!layer) return null;
if (!state.reticle) state.reticle = uiMakeReticle();
if (state.reticle.parentNode !== layer) layer.appendChild(state.reticle);
return state.reticle;
}
function uiPipCount(foe,state) {
state.max = Math.max(state.max,foe.maxHp || foe.hp);
return Math.min(MAX_PIPS,state.max);
}
function uiDrawPips(reticle,foe,state) {
const pips = uiPipCount(foe,state);
const lit = Math.ceil(foe.hp * pips / state.max);
const key = pips + ':' + lit;
if (state.pipKey === key) return;
state.pipKey = key;
Array.from(reticle.children[0].children).forEach((pip,index) => {
pip.className = 'grid-aim-pip' + (index < pips ? ' is-shown' :'') + (index < lit ? ' is-on' :'');
});
}
function uiPlaceReticle(app,state,foe) {
const reticle = uiReticleFor(app,state);
const view = app.game.view;
if (!reticle) return;
if (!foe || !view) { reticle.className = 'grid-aim-reticle'; return; }
const far = uiReach(foe,app.game.avatar.pos) > state.range;
reticle.className = 'grid-aim-reticle is-on' + (far ? ' is-far' :'');
Object.assign(reticle.style,{
left:(foe.col - view.camera.col) * view.tile + 'px',top:(foe.row - view.camera.row) * view.tile + 'px',
width:view.tile + 'px',height:view.tile + 'px',
});
uiDrawPips(reticle,foe,state);
}
function uiTargetFoe(app,state) {
const target = app.screen === 'grid' ? state.target :null;
const foe = target ? uiLiveFoes(app.game).find((live) => live.id === target) :null;
if (state.target && !foe) state.target = null;
return foe || null;
}
function uiSyncQueued(state) {
const button = uiFireButton();
if (!button || !button.classList) return;
const queued = Boolean(state.queue);
if (queued && !button.classList.contains(QUEUED_CLASS)) {
button.style.setProperty('--aid-recharge-delay',(state.queue.until - SHOT_COOLDOWN_MS - performance.now()) + 'ms');
}
button.classList.toggle(QUEUED_CLASS,queued);
}
function uiFrame(app,state) {
window.cancelAnimationFrame?.(state.frame);
state.frame = 0;
uiPlaceReticle(app,state,uiTargetFoe(app,state));
uiSyncQueued(state);
if (state.target || state.queue) state.frame = window.requestAnimationFrame?.(() => uiFrame(app,state)) || 0;
}
function uiStartFrames(app,state) {
if (!state.frame) uiFrame(app,state);
}
function uiTouchPointer(event) {
return event.pointerType ? event.pointerType !== 'mouse' :Boolean(uiPointerIsCoarse());
}
function uiTap(app,state,pick) {
const already = state.target === pick.actor.id;
state.target = pick.actor.id;
if (!already) { state.max = 0; state.pipKey = ''; }
uiFrame(app,state);
return pick.touch && !already && !app.game.opening;
}
function uiPick(app,state,foes) {
const foe = foes.find((live) => live.id === state.target);
return foe ? nearestAwakeFoe([foe],app.game.avatar.pos) :null;
}
function uiCooling(app,foe) {
const fight = app.game.fight;
if (!fight || foe.kind !== 'mite' || uiReach(foe,app.game.avatar.pos) > SHOT_RANGE) return false;
return performance.now() - (fight.shotAt ?? -Infinity) < SHOT_COOLDOWN_MS;
}
function uiBump(state) {
const button = uiFireButton();
if (!button || !button.classList) return;
button.classList.add(BUMP_CLASS);
window.clearTimeout(state.bumpTimer);
state.bumpTimer = window.setTimeout(() => { if (uiFireButton() === button) button.classList.remove(BUMP_CLASS); },BUMP_MS);
}
function uiFireQueued(app,state) {
const queued = state.queue;
state.queue = null;
uiSyncQueued(state);
if (!queued || app.game.gen !== state.gen || app.screen !== 'grid' || app.game.travelOpen || app.menuOpen || app.story) return;
if (uiLiveFoes(app.game).some((live) => live.id === queued.id)) uiGridShot(app,queued.id,queued.dmg);
}
function uiQueue(app,state,shot) {
if (!uiCooling(app,shot.foe)) return false;
if (state.queue) { uiBump(state); return true; }
const wait = SHOT_COOLDOWN_MS - (performance.now() - app.game.fight.shotAt);
state.queue = { id:shot.foe.id,dmg:shot.dmg,until:performance.now() + wait };
window.setTimeout(() => uiFireQueued(app,state),wait + TIMER_SLACK_MS);
uiStartFrames(app,state);
uiSyncQueued(state);
return true;
}
function uiTip(app,walked) {
const ext = app.game.ext || createExt();
if (hasBeat(ext,TIP_BEAT)) return;
if (!walked) {
if (!uiPointerIsCoarse()) return;
uiShowToast(app,{ text:TIP_TEXT,kind:'info' });
uiRenderKeepingFocus(app);
}
uiCommitExt(app,withBeat(ext,TIP_BEAT));
}
function uiInstallTouchAid(app) {
if (app.game.touchAid) return;
uiLinkStyle(STYLE_HREF);
app.game.touch?.node.querySelector?.('.grid-aim-reticle')?.remove();
const state = { gen:app.game.gen,target:null,max:0,pipKey:'',queue:null,reticle:null,frame:0,bumpTimer:0,range:BOLT_RANGE };
app.game.touchAid = {
state,
tap:(ignored,actor,event) => uiTap(app,state,{ actor,touch:uiTouchPointer(event) }),
pick:(ignored,foes) => uiPick(app,state,foes),
queue:(ignored,dmg,foe) => uiQueue(app,state,{ dmg,foe }),
tip:(ignored,walked) => uiTip(app,walked),
};
}

export { uiInstallTouchAid };
