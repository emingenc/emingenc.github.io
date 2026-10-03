import { uiEl, uiAnnounce } from './dom.js';
import { uiRenderKeepingFocus } from './app.js';

const UI_TOAST_MS = { line:2500,sector:3500 };
const UI_TOAST_PENDING_MAX = 1;
function uiToastQueue(game) {
if (!game.toastQueue) game.toastQueue = [];
return game.toastQueue;
}
function uiStartToast(app,toast) {
const game = app.game;
const ms = UI_TOAST_MS[toast.kind] || UI_TOAST_MS.line;
game.toast = { ...toast,until:Date.now() + ms,shownAt:performance.now() };
game.toastTimer = window.setTimeout(function () { uiAdvanceToast(app); },ms);
}
function uiLastToastText(game) {
const queue = uiToastQueue(game);
return queue.length > 0 ? queue[queue.length - 1].text :game.toast && game.toast.text;
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
if (!game.toast) { window.clearTimeout(game.toastTimer); uiToastQueue(game).length = 0; uiStartToast(app,toast); return; }
if (toast.text === uiLastToastText(game)) return;
const queue = uiToastQueue(game);
queue.push(toast);
while (queue.length > UI_TOAST_PENDING_MAX) queue.shift();
}
function uiLiveToast(game) {
return game.toast && game.toast.until > Date.now() ? game.toast :null;
}
function uiToastBanner(toast) {
const line = uiEl('div',{
className:'grid-toast-line',
children:[uiEl('span',{ className:'grid-toast-name',text:toast.text }),uiEl('span',{ className:'grid-toast-detail',text:toast.detail })],
});
const banner = uiEl('div',{ className:'grid-toast-banner',children:[uiEl('span',{ className:'grid-toast-head',text:toast.head }),line] });
banner.style.setProperty('--toast-elapsed',(toast.shownAt - performance.now()) + 'ms');
return banner;
}
function uiGridToast(app) {
const toast = uiLiveToast(app.game);
const attrs = { 'aria-hidden':'true' };
if (!toast) return uiEl('div',{ className:'grid-toast grid-toast-empty',attrs });
const body = toast.head ? { children:[uiToastBanner(toast)] } :{ text:toast.text };
return uiEl('div',{ className:'grid-toast grid-toast-' + toast.kind,attrs,...body });
}

export { uiShowToast, uiGridToast };
