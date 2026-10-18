import { hasBeat } from '../game/ext/ops.js';
import { approve,clockDue,createReview,heartsAfterTick,mergeNow,pickDraft,pressureOf,revived,tapLine,tickClock,typeDraft,watchText } from '../game/finale/review.js';
import { KERNEL_FRONT } from '../game/finale/roadback.js';
import { rootSpec } from '../game/finale/root-review.js';
import { uiAnnounce,uiEl,uiPrefersReducedMotion } from './dom.js';
import { ensureFight,uiHurt } from './grid-actors.js';
import { uiRenderApp,uiRenderKeepingFocus } from './app.js';
import { uiLinkStyles } from './lazy-style.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { createHold,uiHoldBegin,uiHoldEnd } from './review-hold.js';
import { uiEnterGrid } from './screen-grid.js';
import { uiHaltRoot,uiRenderHalt,uiSyncHalt } from './screen-halt.js';
import { sheetGuardDown,sheetGuardPress,sheetGuardShow,sheetGuardTap } from './sheet-guard.js';

const REVIEW_ID = 'review';
const REVIEW_SHEET = 'styles/lazy/review.css';
const FIRST_KEY = 'review-line-1';
const TYPE_MS = 700;
const SETTLE_MS = 900;
const LOG_SHOWN = 4;
const LINE_ACTION = /^review-line-(\d+)$/;
const DRAFT_ACTION = /^review-draft-([A-Z])$/;
const HELD_ACTIONS = new Set(['review-approve','review-merge']);
const LOCKED_ANNOUNCE = 'REVIEW. Hold MERGE to merge the patch.';
const KERNEL_REVIVE_NOTICE = 'Rebooted at the kernel door. Your reading is kept.';
const BENCH_REVIVE_NOTICE = 'Rebooted at the bench. Your reading is kept.';
const FULL_HEART = '♥';
const EMPTY_HEART = '♡';

function uiResumeHalt(app) {
if (!hasBeat(app.game.ext,'halted')) return false;
uiHaltRoot(app);
return true;
}
function uiRootSpec(ext) {
return {
...rootSpec(ext),settleMs:SETTLE_MS,onConfirm:uiHaltRoot,
resume:uiResumeHalt,
};
}
function uiReviewFor(app,spec) {
const old = app.game.review;
if (old && old.spec.kind === spec.kind) return Object.assign(old,{ spec });
return { spec,state:createReview(spec,app.game.ext),guard:sheetGuardShow(0),hold:createHold(),mode:'read',sheet:true,notice:null,halt:null,typing:false,clock:null,clockMs:null,pressed:false };
}
function uiReviewStale(app,review) {
return app.game.review !== review || app.screen !== REVIEW_ID;
}
function uiTypeNext(app,review) {
if (uiReviewStale(app,review) || review.state.stage !== 'drafts') { review.typing = false; return; }
review.state = typeDraft(review.state,review.spec);
uiRenderKeepingFocus(app);
if (review.state.typed >= review.spec.drafts.list.length) { review.typing = false; return; }
window.setTimeout(function () { uiTypeNext(app,review); },TYPE_MS);
}
function uiTypeDrafts(app,review) {
if (review.typing || review.state.stage !== 'drafts' || !review.spec.drafts) return;
if (uiPrefersReducedMotion()) {
while (review.state.typed < review.spec.drafts.list.length) review.state = typeDraft(review.state,review.spec);
return;
}
review.typing = true;
window.setTimeout(function () { uiTypeNext(app,review); },TYPE_MS);
}
async function uiReviewEnter(app,given) {
await uiLinkStyles([REVIEW_SHEET]);
const game = app.game;
const review = uiReviewFor(app,given || uiRootSpec(game.ext));
game.review = review;
game.reviveAt = { ...KERNEL_FRONT };
ensureFight(game);
uiWalkReleaseAll(app);
game.walk.plan = null;
uiHoldEnd(review.hold);
review.guard = sheetGuardShow(performance.now());
app.screen = REVIEW_ID;
app.lastFocusKey = uiReviewFocusKey(app);
if (review.mode === 'read' && review.spec.resume && review.spec.resume(app)) return;
uiTypeDrafts(app,review);
uiRenderApp(app);
review.clockMs = clockDue(review.spec,{ assist:game.ext.assist === true,reduced:uiPrefersReducedMotion() });
uiClockStart(app,review);
}
function uiReviewLeave(app) {
uiClockStop(app.game.review);
app.game.review = null;
app.game.reviveAt = null;
uiEnterGrid(app);
}
function uiReviewBack(app,review) {
if (review.mode !== 'read') return true;
if (review.state.stage === 'drafts' && review.sheet) {
review.sheet = false;
return true;
}
if (review.spec.canLeave === false) return true;
uiClockStop(review);
uiHoldEnd(review.hold);
app.game.reviveAt = null;
uiEnterGrid(app);
return true;
}
function uiReviveNotice(game) {
const at = game.reviveAt;
return at && at.col === KERNEL_FRONT.col && at.row === KERNEL_FRONT.row ? KERNEL_REVIVE_NOTICE :BENCH_REVIVE_NOTICE;
}
function uiReviewBlow(app,spec) {
const hearts = ensureFight(app.game).hp.hearts;
return spec.floor > 0 ? hearts - heartsAfterTick(hearts,spec) :1;
}
function uiReviewHurt(app,review) {
const blow = uiReviewBlow(app,review.spec);
if (blow === 0) {
review.notice = null;
return;
}
if (uiHurt(app,blow,'flood')) {
review.notice = null;
return;
}
review.state = revived(review.state,review.spec);
review.notice = uiReviveNotice(app.game);
}
function uiStopRoot(game) {
['kernel','finale'].forEach(function (key) {
if (game[key] && game[key].root) game[key].root.stopped = true;
});
}
function uiClockStop(review) {
if (review && review.clock !== null) window.clearTimeout(review.clock);
if (review) review.clock = null;
}
function uiClockBeat(app,review) {
review.clock = null;
if (uiReviewStale(app,review) || review.mode !== 'read' || review.clockMs === null) return;
const step = tickClock(review.state,review.spec);
if (!step.tick) return;
review.state = step.state;
review.notice = null;
if (step.hit) uiReviewHurt(app,review);
if (!review.pressed) uiRenderKeepingFocus(app);
uiClockStart(app,review);
}
function uiClockStart(app,review) {
if (review.mode !== 'read' || review.clockMs === null || review.clock !== null) return;
review.clock = window.setTimeout(function () { uiClockBeat(app,review); },review.clockMs);
}
async function uiReviewConfirm(app,review,result) {
if (uiReviewStale(app,review)) return;
try {
await review.spec.onConfirm(app,result);
} catch (error) {
uiReviewLeave(app);
}
if (!uiReviewStale(app,review) && review.mode === 'read') uiReviewLeave(app);
uiRenderKeepingFocus(app);
}
function uiReviewSettle(app,review,result) {
uiClockStop(review);
if (result.stamp === 'LGTM') uiStopRoot(app.game);
const wait = review.spec.settleMs || 0;
if (!wait) { uiReviewConfirm(app,review,result); return; }
window.setTimeout(function () { uiReviewConfirm(app,review,result); },wait);
}
function uiReviewStep(app,review,step) {
review.state = step.state;
review.notice = null;
uiAnnounce(step.state.hint);
if (step.hit) uiReviewHurt(app,review);
if (step.result) uiReviewSettle(app,review,step.result);
uiTypeDrafts(app,review);
}
function uiReviewArmed(app,review) {
const now = performance.now();
const verdict = app.clickByPointer ? sheetGuardTap(review.guard,now) :sheetGuardPress(review.guard,now);
review.guard = verdict.guard;
return verdict.armed;
}
function uiReviewReading(app,review,actionId) {
const line = LINE_ACTION.exec(actionId);
const draft = DRAFT_ACTION.exec(actionId);
if (!line && !draft) return false;
if (line && review.spec.lockLines) return true;
if (!uiReviewArmed(app,review)) return true;
const step = line ? tapLine(review.state,review.spec,Number(line[1]),review.clockMs !== null) :pickDraft(review.state,review.spec,draft[1]);
uiReviewStep(app,review,step);
return true;
}
function uiReviewApply(app,actionId) {
const review = app.game.review;
if (!review) return false;
if (actionId === 'review-back') return uiReviewBack(app,review);
if (review.mode !== 'read') return actionId.startsWith('review-');
if (actionId === 'review-drafts') review.sheet = true;
if (actionId === 'review-drafts' || HELD_ACTIONS.has(actionId)) return true;
return uiReviewReading(app,review,actionId);
}
function uiReviewHeld(app,review,actionId) {
if (uiReviewStale(app,review) || review.mode !== 'read') return;
const decided = actionId === 'review-merge' ? mergeNow(review.state,review.spec) :approve(review.state,review.spec);
review.state = decided.state;
review.notice = null;
uiAnnounce(decided.state.toast);
if (decided.hit) uiReviewHurt(app,review);
if (decided.result) uiReviewSettle(app,review,decided.result);
uiRenderKeepingFocus(app);
}
function uiActionOf(event) {
const target = event.target && event.target.closest ? event.target.closest('[data-action]') :null;
return target ? { id:target.getAttribute('data-action'),node:target } :{ id:null,node:null };
}
function uiBeginHeld(app,review,held) {
if (review.mode !== 'read' || !HELD_ACTIONS.has(held.id)) return;
uiHoldBegin(review.hold,held.node,function () { uiReviewHeld(app,review,held.id); });
}
function uiReviewPointerDown(event,app) {
const review = app.game.review;
if (!review) return false;
review.guard = sheetGuardDown(review.guard,performance.now());
review.pressed = true;
uiBeginHeld(app,review,uiActionOf(event));
return false;
}
function uiReviewLetGo(review) {
uiHoldEnd(review.hold);
review.pressed = false;
}
function uiReviewPointerUp(event,app) {
if (app.game.review) uiReviewLetGo(app.game.review);
return false;
}
function uiReviewRelease(app) {
if (app.game.review) uiReviewLetGo(app.game.review);
}
function uiFocusedHeld() {
const node = document.activeElement;
const id = node && node.getAttribute ? node.getAttribute('data-action') :null;
return HELD_ACTIONS.has(id) ? { id,node } :null;
}
function uiReviewKey(event,app) {
if (event.key === 'Escape') return { type:'action',id:'review-back' };
const held = uiFocusedHeld();
if (!held || (event.key !== 'Enter' && event.key !== ' ')) return null;
event.preventDefault();
if (!event.repeat && app.game.review) uiBeginHeld(app,app.game.review,held);
return { type:'handled' };
}
function uiReviewKeyUp(event,app) {
if (event.key !== 'Enter' && event.key !== ' ') return false;
uiReviewRelease(app);
return false;
}

function uiButton(id,label,className) {
return uiEl('button',{ className:'btn review-act ' + className,text:label,attrs:{ type:'button','data-action':id,'data-focus-key':id } });
}
function uiHeartsText(game) {
const hp = game.fight.hp;
return FULL_HEART.repeat(hp.hearts) + EMPTY_HEART.repeat(hp.max - hp.hearts);
}
function uiReviewHead(spec,state) {
const prompts = spec.prompts || {};
const prompt = (state.stage === 'drafts' && prompts.drafts) || prompts.read || spec.prompt || '';
return uiEl('header',{ className:'review-head',children:[uiEl('h1',{ className:'review-title',text:spec.title || 'REVIEW' }),uiEl('p',{ className:'review-prompt',text:prompt })] });
}
function uiFloodTile(index,review) {
const { state } = review;
const { hero } = pressureOf(review.spec);
const names = ['review-tile'];
if (index <= state.flood) names.push('is-flood');
if (index === hero) names.push('is-hero');
if (index === hero && state.flood >= hero) names.push('is-hit');
return uiEl('span',{ className:names.join(' ') });
}
function uiReviewWatch(app,review) {
const { tiles } = pressureOf(review.spec);
const flood = uiEl('div',{
className:'review-flood',
attrs:{ role:'img','aria-label':'ROOT flood at tile ' + (review.state.flood + 1) + ' of ' + tiles },
children:Array.from({ length:tiles },(blank,index) => uiFloodTile(index,review)),
});
return uiEl('div',{
className:'review-watch',
children:[
uiEl('p',{ className:'review-watch-text',text:watchText(review.state,review.spec,{ hearts:app.game.fight.hp.hearts }) }),
flood,
uiEl('p',{ className:'review-hearts',text:uiHeartsText(app.game),attrs:{ 'aria-label':'Hearts ' + app.game.fight.hp.hearts + ' of ' + app.game.fight.hp.max } }),
],
});
}
function uiLineRow(row,review) {
const { state } = review;
const names = ['review-line'];
const locked = review.spec.lockLines === true;
if (locked) names.push('is-locked');
if (state.selected === row.n) names.push('is-selected');
if (state.stamp && row.n === review.spec.answer) names.push('is-stamped');
const button = uiEl('button',{
className:names.join(' '),
attrs:{ type:'button','data-action':'review-line-' + row.n,'data-focus-key':'review-line-' + row.n,'aria-pressed':String(state.selected === row.n),...(locked ? { disabled:'disabled' } :{}) },
children:[uiEl('span',{ className:'review-num',text:String(row.n) }),uiEl('span',{ className:'review-code',text:row.text })],
});
return uiEl('li',{ className:'review-row',children:[button] });
}
function uiDraftButton(draft,review) {
const { state } = review;
const typed = review.spec.drafts.list.indexOf(draft) < state.typed;
const names = 'review-draft' + (state.picked === draft.id ? ' is-picked' :'') + (typed ? '' :' is-typing');
return uiEl('button',{
className:names,
attrs:{ type:'button','data-action':'review-draft-' + draft.id,'data-focus-key':'review-draft-' + draft.id,'aria-pressed':String(state.picked === draft.id),...(typed ? {} :{ disabled:'disabled' }) },
children:[uiEl('span',{ className:'review-num',text:draft.id }),uiEl('span',{ className:'review-code',text:typed ? draft.code :'...' })],
});
}
function uiReviewBody(review) {
if (review.state.stage === 'drafts' && review.sheet) {
return uiEl('div',{ className:'review-drafts',attrs:{ role:'group','aria-label':'Drafts' },children:review.spec.drafts.list.map((draft) => uiDraftButton(draft,review)) });
}
return uiEl('ol',{ className:'review-listing',attrs:{ 'aria-label':'Code to review' },children:review.spec.listing.map((row) => uiLineRow(row,review)) });
}
function uiReviewNotes(review) {
const { state } = review;
const toast = review.notice || state.toast || state.hint;
return uiEl('div',{
className:'review-notes',
children:[
state.stamp ? uiEl('p',{ className:'review-stamp',text:state.stamp }) :null,
uiEl('p',{ className:'review-hint',attrs:{ role:'status' },text:toast || '' }),
],
});
}
function uiHoldButton(id,label,enabled) {
const attrs = { type:'button','data-action':id,'data-focus-key':id,'aria-label':label + ', hold to confirm',...(enabled ? {} :{ disabled:'disabled' }) };
return uiEl('button',{
className:'btn review-act review-hold ' + (id === 'review-merge' ? 'btn-warn' :'btn-primary'),attrs,
children:[
uiEl('span',{ className:'review-ring',attrs:{ 'aria-hidden':'true' } }),
uiEl('span',{ className:'review-hold-label',text:label }),
uiEl('span',{ className:'review-hold-tag',text:'HOLD',attrs:{ 'aria-hidden':'true' } }),
],
});
}
function uiReviewActions(review) {
const { state,spec } = review;
const drafting = state.stage === 'drafts';
return uiEl('div',{
className:'review-actions',
children:[
drafting && review.sheet ? uiHoldButton('review-approve','APPROVE',Boolean(state.picked)) :null,
spec.merge && state.stage === 'read' ? uiHoldButton('review-merge','MERGE',true) :null,
drafting && !review.sheet ? uiButton('review-drafts','DRAFTS','btn-ghost') :null,
spec.canLeave !== false ? uiButton('review-back','BACK','btn-ghost') :null,
],
});
}
function uiReviewLog(state) {
const lines = state.log.slice(-LOG_SHOWN).map((line) => uiEl('li',{ className:'review-log-line',children:[uiEl('span',{ className:'review-who',text:line.who }),' ' + line.text] }));
return uiEl('ul',{ className:'review-log',attrs:{ 'aria-label':'Transcript' },children:lines });
}
function uiRenderReview(app) {
const review = app.game.review;
if (!review) return uiEl('section',{ className:'screen screen-card review-screen',attrs:{ 'data-screen':REVIEW_ID } });
if (review.mode === 'halt') return uiRenderHalt(app);
return uiEl('section',{
className:'screen screen-card review-screen',
attrs:{ 'data-screen':REVIEW_ID,'data-mode':'read','data-stage':review.state.stage },
children:[uiReviewHead(review.spec,review.state),uiReviewWatch(app,review),uiReviewBody(review),uiReviewNotes(review),uiReviewActions(review),uiReviewLog(review.state)],
});
}
function uiReviewAnnounce(app) {
const review = app.game.review;
if (review && review.spec.lockLines) return LOCKED_ANNOUNCE;
return 'REVIEW. ' + (review && review.spec.prompts ? review.spec.prompts.read : 'Read the code.') + ' Tap a line, then tap it again to stamp it.';
}
function uiReviewFocusKey(app) {
const review = app.game.review;
return review && review.spec.lockLines ? 'review-merge' :FIRST_KEY;
}
function uiSyncReview(app,active,root) {
if (!active) uiReviewRelease(app);
uiSyncHalt(app,active,root);
}
function uiReviewScreen() {
return {
id:REVIEW_ID,render:uiRenderReview,focusKey:uiReviewFocusKey,announce:uiReviewAnnounce,keyAction:uiReviewKey,keyUp:uiReviewKeyUp,
applyAction:uiReviewApply,pointerDown:uiReviewPointerDown,pointerUp:uiReviewPointerUp,pointerCancel:uiReviewPointerUp,
release:uiReviewRelease,sync:uiSyncReview,
};
}

export { uiReviewScreen,uiReviewEnter,uiRootSpec };
