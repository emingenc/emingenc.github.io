import { toastCountRunning, toastCountText } from '../game/toast-fx.js';
import { uiSetVar } from './css-var.js';
import { uiEl, uiAnnounce, uiPrefersReducedMotion } from './dom.js';
import { uiRenderKeepingFocus } from './app.js';

const UI_TOAST_MS = { line:2500,sector:3500 };
const UI_TOAST_PENDING_MAX = 1;
const UI_REPLACEABLE = new Set(['info','reward']);
function uiReplaces(game,toast) {
return Boolean(toast.replace) && Boolean(game.toast) && UI_REPLACEABLE.has(game.toast.kind);
}
function uiToastQueue(game) {
if (!game.toastQueue) game.toastQueue = [];
return game.toastQueue;
}
function uiStartToast(app,toast) {
const game = app.game;
const ms = UI_TOAST_MS[toast.kind] || UI_TOAST_MS.line;
game.toast = { ...toast,ms,until:Date.now() + ms,shownAt:performance.now() };
game.toastTimer = window.setTimeout(function () { uiAdvanceToast(app); },ms);
}
function uiLastToastText(game) {
const queue = uiToastQueue(game);
return queue.length > 0 ? queue[queue.length - 1].text :game.toast?.text;
}
function uiAdvanceToast(app) {
const game = app.game;
game.toastTimer = null;
game.toast = null;
if (app.screen !== 'grid') { uiToastQueue(game).length = 0; return; }
const next = uiToastQueue(game).shift();
if (next) uiStartToast(app,next);
uiRenderKeepingFocus(app);
}
function uiShowToast(app,toast) {
const game = app.game;
if (!toast.announced) uiAnnounce(toast.text);
if (game.toastTap?.(toast)) return;
if (!game.toast || uiReplaces(game,toast)) { window.clearTimeout(game.toastTimer); uiToastQueue(game).length = 0; uiStartToast(app,toast); return; }
if (toast.text === uiLastToastText(game)) return;
const queue = uiToastQueue(game);
queue.push(toast);
while (queue.length > UI_TOAST_PENDING_MAX) queue.shift();
}
function uiLiveToast(game) {
return game.toast?.until > Date.now() ? game.toast :null;
}
function uiToastCountUp(node,toast) {
function step() {
const elapsed = performance.now() - toast.shownAt;
node.textContent = toastCountText(toast.detail,elapsed);
if (toastCountRunning(elapsed)) window.requestAnimationFrame(function () { if (node.isConnected) step(); });
}
step();
}
function uiToastDetail(toast) {
const node = uiEl('span',{ className:'grid-toast-detail',text:toast.detail });
if (!uiPrefersReducedMotion()) uiToastCountUp(node,toast);
return node;
}
function uiToastBanner(toast) {
const line = uiEl('div',{
className:'grid-toast-line',
children:[uiEl('span',{ className:'grid-toast-name',text:toast.text }),uiToastDetail(toast)],
});
const banner = uiEl('div',{ className:'grid-toast-banner',children:[uiEl('span',{ className:'grid-toast-head',text:toast.head }),line] });
return uiToastTiming(banner,toast);
}
function uiToastTiming(node,toast) {
uiSetVar(node,'--toast-elapsed',(toast.shownAt - performance.now()) + 'ms');
uiSetVar(node,'--toast-ms',toast.ms + 'ms');
return node;
}
function uiGridToast(app) {
const toast = uiLiveToast(app.game);
const attrs = { 'aria-hidden':'true' };
if (!toast) return uiEl('div',{ className:'grid-toast grid-toast-empty',attrs });
const body = toast.head ? { children:[uiToastBanner(toast)] } :{ text:toast.text };
const node = uiEl('div',{ className:'grid-toast grid-toast-' + toast.kind,attrs,...body });
return toast.head ? node :uiToastTiming(node,toast);
}

export { uiShowToast, uiGridToast };
