import { RIG_CATALOG } from '../game/rig-catalog.js';
import { UI_ROOT_ID, uiAnnounce, uiEl, uiFindByFocusKey, uiQs } from './dom.js';
import { uiRigHostLeave } from './rig-host-common.js';

const ARENA_BACK = 'rig-back';
const ARENA_FOCUS_KEY = 'arena-root';
const ARENA_LEAVE_GUARD_MS = 600;
const ARENA_ASSIST_ACTION = 'arena-assist';
const ARENA_SOUND_ACTION = 'toggle-sound';
const ARENA_ASSIST_LABEL = 'ASSIST';
const ARENA_ASSIST_HINT = 'ASSIST: no fuses, no bonus score';
const ARENA_HEARTS_MAX = 3;
const ARENA_HEART_FULL = '♥';
const ARENA_HEART_EMPTY = '♡';
const ARENA_TOAST_MS = 2500;
const ARENA_TOAST_KINDS = { bad:'alert' };
const ARENA_TOAST_ROLE = 'status';

function uiArenaDefaultNow() {
return typeof performance !== 'undefined' ? performance.now() :Date.now();
}
let uiArenaNow = uiArenaDefaultNow;
function uiArenaSetClock(now) {
uiArenaNow = now || uiArenaDefaultNow;
}
function uiArenaButton(action,label,kind) {
return uiEl('button',{ className:'btn arena-btn ' + kind,text:label,attrs:{ type:'button','data-action':action,'data-focus-key':action } });
}
function uiArenaHearts(hearts) {
const full = Math.max(0,Math.min(ARENA_HEARTS_MAX,hearts));
const text = ARENA_HEART_FULL.repeat(full) + ARENA_HEART_EMPTY.repeat(ARENA_HEARTS_MAX - full);
return uiEl('span',{ className:'arena-hearts',text,attrs:{ 'aria-label':'Integrity ' + full + ' of ' + ARENA_HEARTS_MAX } });
}
function uiArenaMute(app) {
const button = uiArenaButton(ARENA_SOUND_ACTION,app.soundOn ? 'SND ON' :'SND OFF','arena-mute');
button.setAttribute('aria-pressed',String(!!app.soundOn));
return button;
}
function uiArenaAssist(assist) {
const button = uiArenaButton(ARENA_ASSIST_ACTION,ARENA_ASSIST_LABEL,'arena-assist');
button.setAttribute('aria-pressed',String(assist === true));
button.setAttribute('title',ARENA_ASSIST_HINT);
button.setAttribute('aria-label',ARENA_ASSIST_HINT);
return button;
}
function uiArenaHeader(app,view) {
const score = uiEl('span',{ className:'arena-score',text:String(view.score),attrs:{ 'aria-label':'Score ' + view.score } });
const top = uiEl('div',{ className:'arena-row',children:[uiArenaHearts(view.hearts),score,uiArenaMute(app)] });
const title = uiEl('span',{ className:'arena-title',text:view.title });
const bottom = uiEl('div',{ className:'arena-row',children:[uiArenaButton(ARENA_BACK,'LEAVE','arena-back'),title,uiArenaAssist(view.assist)] });
return uiEl('header',{ className:'arena-header',children:[top,bottom] });
}
function uiArenaRule(text) {
return uiEl('p',{ className:'arena-rule',text });
}
function uiArenaCoach(text) {
return uiEl('p',{ className:'arena-coach',text });
}


function uiArenaPaintToast(rig) {
const node = rig.toastNode;
if (!node) return;
const toast = rig.toast;
node.className = 'arena-toast' + (toast ? ' arena-toast-' + toast.kind :' arena-toast-off');
node.setAttribute('role',toast ? ARENA_TOAST_KINDS[toast.kind] || ARENA_TOAST_ROLE :ARENA_TOAST_ROLE);
node.textContent = toast ? toast.text :'';
}
function uiArenaClearToast(rig) {
if (rig.toastTimer) window.clearTimeout(rig.toastTimer);
rig.toastTimer = null;
rig.toast = null;
}
function uiArenaToastNode(app) {
app.rig.toastNode = uiEl('p',{ attrs:{ role:ARENA_TOAST_ROLE,'aria-live':'polite' } });
uiArenaPaintToast(app.rig);
return app.rig.toastNode;
}
function uiArenaToast(app,text,kind) {
const rig = app.rig;
if (!rig) return;
uiArenaClearToast(rig);
rig.toast = { text,kind:kind || 'info' };
uiArenaPaintToast(rig);
uiAnnounce(text);
rig.toastTimer = window.setTimeout(function () {
rig.toastTimer = null;
rig.toast = null;
uiArenaPaintToast(rig);
},ARENA_TOAST_MS);
}


function uiArenaCardButtons(actions) {
return uiEl('div',{ className:'arena-actions',children:actions.map(function (item) { return uiArenaButton(item.action,item.label,'arena-verb'); }) });
}
function uiArenaCard(app,result) {
const lines = (result.lines || []).map(function (line) { return uiEl('p',{ className:'arena-card-line',text:line }); });
return uiEl('section',{
className:'arena-card arena-scroll' + (result.tone ? ' arena-card-' + result.tone :''),
attrs:{ 'data-rig':app.rig ? app.rig.rigId :'' },
children:[uiEl('h2',{ className:'arena-card-title',text:result.title }),...lines,...(result.body || []),uiArenaCardButtons(result.actions)],
});
}
function uiArenaOpen(app,spec) {
if (app.rig) uiArenaClearToast(app.rig);
app.rig = { rigId:spec.rigId,view:'play',root:'play',levelIndex:0,xpNote:null,gained:0,toast:null,toastTimer:null,toastNode:null,arena:null,openedAt:uiArenaNow() };
app.rig.arena = spec.create(app);
app.screen = 'rig';
app.lastFocusKey = ARENA_FOCUS_KEY;
}
function uiArenaLeaveTooSoon(app) {
const root = uiQs(UI_ROOT_ID);
const onButton = Boolean(root) && uiFindByFocusKey(root,ARENA_BACK) === document.activeElement;
return onButton && Boolean(app.rig) && uiArenaNow() - app.rig.openedAt < ARENA_LEAVE_GUARD_MS;
}
function uiArenaLeave(app,note) {
const rig = RIG_CATALOG[app.rig.rigId];
uiArenaClearToast(app.rig);
app.rig = null;
uiRigHostLeave(app,note,rig ? rig.title :'');
}

export {
ARENA_FOCUS_KEY,uiArenaSetClock,uiArenaOpen,uiArenaHeader,uiArenaRule,uiArenaCoach,uiArenaToast,uiArenaClearToast,uiArenaToastNode,uiArenaCard,
uiArenaLeaveTooSoon,uiArenaLeave,
};
