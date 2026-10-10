import { CHARGED_DMG, nearestAwakeFoe } from '../game/actors.js';
import { uiEl, uiPointerIsCoarse } from './dom.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiShowToast } from './grid-toast.js';
import { uiFoeAlive, uiLiveFoes, uiGridPing } from './grid-actors.js';
import { isOpen } from '../game/world.js';

const FIRE_CHARGE_MS = 450;
const FIRE_GHOST_MS = 500;
const FIRE_SELECTOR = '[data-fire]';
const FIRE_BASE_CLASS = 'grid-fire grid-fire-pulse';
const FIRE_CHARGING_CLASS = 'grid-fire-charging';
const FIRE_LIT_CLASS = 'grid-fire-lit';
const FIRE_IDLE_CLASS = 'grid-fire-idle';
const NO_FOE_TEXT = 'Nothing in range.';

function uiIsFirePressed(app) {
return app.game.fireDownAt !== null && app.game.fireDownAt !== undefined;
}
function uiFireButton() {
return typeof document !== 'undefined' && document.querySelector ? document.querySelector(FIRE_SELECTOR) :null;
}
function uiFireCharging(on) {
const button = uiFireButton();
if (button && button.classList) button.classList.toggle(FIRE_CHARGING_CLASS,on);
if (!on && button && button.classList) button.classList.toggle(FIRE_LIT_CLASS,false);
}
function uiFireLit(app) {
const button = uiFireButton();
if (uiIsFirePressed(app) && button && button.classList) button.classList.toggle(FIRE_LIT_CLASS,true);
}
function uiFireNodeClass(app) {
if (!uiFoeAlive(app)) return FIRE_BASE_CLASS + ' ' + FIRE_IDLE_CLASS;
if (!uiIsFirePressed(app)) return FIRE_BASE_CLASS;
const charged = performance.now() - app.game.fireDownAt >= FIRE_CHARGE_MS;
return FIRE_BASE_CLASS + ' ' + FIRE_CHARGING_CLASS + (charged ? ' ' + FIRE_LIT_CLASS :'');
}
function uiFireSlot(app) {
const game = app.game;
const barrier = game.world.barriers.sentry;
return Boolean(game.fight) || (Boolean(barrier) && !isOpen(game.world,game.progress,barrier.id));
}
function uiGridFireNode(app) {
return uiEl('button',{
className:uiFireNodeClass(app),text:'A',
attrs:{ type:'button','data-fire':'1','data-focus-key':'grid-fire','aria-label':'Fire' },
});
}
function uiGridFire(app) {
if (!uiPointerIsCoarse() || !(uiFoeAlive(app) || uiFireSlot(app))) return null;
return uiGridFireNode(app);
}
function uiFireShot(app,dmg) {
const foe = nearestAwakeFoe(uiLiveFoes(app.game),app.game.avatar.pos);
if (!foe) {
uiShowToast(app,{ text:NO_FOE_TEXT,kind:'info' });
uiRenderKeepingFocus(app);
return;
}
uiGridPing(app,foe.id,dmg);
}
function uiFireDown(app,now) {
const first = !uiIsFirePressed(app);
app.game.fireDownAt = app.game.fireDownAt ?? now;
if (first) app.game.fireLitTimer = window.setTimeout(function () { uiFireLit(app); },FIRE_CHARGE_MS);
uiFireCharging(true);
}
function uiFireUp(app,now) {
const downAt = app.game.fireDownAt;
app.game.fireDownAt = null;
window.clearTimeout(app.game.fireLitTimer);
if (downAt === null || downAt === undefined) return false;
uiFireCharging(false);
uiFireShot(app,now - downAt >= FIRE_CHARGE_MS ? CHARGED_DMG :1);
return true;
}
function uiFireCancel(app) {
const waiting = uiIsFirePressed(app);
if (!waiting) return false;
app.game.fireDownAt = null;
window.clearTimeout(app.game.fireLitTimer);
uiFireCharging(false);
return true;
}
function uiFireKey(app,event) {
if (!uiFoeAlive(app) || app.game.travelOpen) return false;
if (!event.repeat) uiFireDown(app,performance.now());
return true;
}
function uiFireKeyUp(app) {
return uiFireUp(app,performance.now());
}
function uiIsFireTarget(target) {
return Boolean(target && target.closest && target.closest(FIRE_SELECTOR));
}
function uiFireTouchDown(app,event) {
if (!uiIsFireTarget(event.target)) return false;
uiFireDown(app,performance.now());
return true;
}
function uiFireTouchUp(app) {
const fired = uiFireUp(app,performance.now());
if (fired) app.game.fireGhostUntil = Date.now() + FIRE_GHOST_MS;
return fired;
}
function uiFireClick(app,event) {
if (!uiIsFireTarget(event.target)) return false;
event.stopPropagation();
if (Date.now() >= (app.game.fireGhostUntil || 0) && uiFoeAlive(app)) uiFireShot(app,1);
return true;
}

export { FIRE_CHARGE_MS,uiGridFire,uiFireDown,uiFireUp,uiFireCancel,uiFireKey,uiFireKeyUp,uiFireTouchDown,uiFireTouchUp,uiFireClick };
