import { uiEl, uiPrefersReducedMotion } from './dom.js';

const AUTO_STEP_MS = 120;
const HOLD_REPEAT_HZ = 6;
const MS_PER_SECOND = 1000;
const HOLD_REPEAT_MS = Math.round(MS_PER_SECOND / HOLD_REPEAT_HZ);
const MAX_FORCED_MOVES = 1000;
const STATES = { idle:'idle',running:'running',paused:'paused',decision:'decision' };
const REASONS = { call:'call',manual:'manual',stalled:'stalled' };
const BADGE_TEXT = { idle:'',running:'AUTO',paused:'PAUSED',decision:'YOUR CALL' };
const MANUAL_BADGE = 'MANUAL';
const UNHELD = 0;

function uiAutoNoop() {}
function uiAutoClear(timer) {
if (timer) window.clearTimeout(timer);
return 0;
}
function uiAutoCreate(port) {
return {
port,
intervalMs:port.intervalMs ?? AUTO_STEP_MS,
onChange:port.onChange ?? uiAutoNoop,
state:STATES.idle,
timer:0,
holdTimer:UNHELD,
resumeAfterHold:false,
moves:0,
manual:Boolean(port.isManual && port.isManual()),
parked:false,
destroyed:false,
epoch:0,
watchers:[],
};
}
function uiAutoView(ctx) {
return { state:ctx.state,manual:ctx.manual,holding:ctx.holdTimer !== UNHELD };
}
function uiAutoEmit(ctx) {
const view = uiAutoView(ctx);
ctx.onChange(view);
ctx.watchers.forEach(function (watcher) { watcher(view); });
}
function uiAutoReduced(ctx) {
return ctx.port.reduced ?? Boolean(uiPrefersReducedMotion());
}
function uiAutoActive(ctx) {
return ctx.state === STATES.running || ctx.state === STATES.paused;
}
function uiAutoSettle(ctx,state,reason) {
ctx.timer = uiAutoClear(ctx.timer);
ctx.holdTimer = uiAutoClear(ctx.holdTimer);
ctx.state = state;
ctx.parked = reason === REASONS.manual;
uiAutoEmit(ctx);
if (reason) ctx.port.onDecision(reason);
}
function uiAutoForcedMove(ctx) {
if (!ctx.port.isForced()) {
uiAutoSettle(ctx,STATES.decision,REASONS.call);
return false;
}
ctx.moves += 1;
if (ctx.moves <= MAX_FORCED_MOVES && ctx.port.step() !== false) return true;
uiAutoSettle(ctx,STATES.decision,REASONS.stalled);
return false;
}
function uiAutoAfterMove(ctx,again) {
if (ctx.port.isForced()) again();
else uiAutoSettle(ctx,STATES.decision,REASONS.call);
}
function uiAutoTick(ctx) {
ctx.timer = 0;
if (ctx.destroyed || ctx.state !== STATES.running || !uiAutoForcedMove(ctx)) return;
uiAutoAfterMove(ctx,function () { ctx.timer = window.setTimeout(function () { uiAutoTick(ctx); },ctx.intervalMs); });
}
function uiAutoInstant(ctx) {
const epoch = ctx.epoch;
while (ctx.epoch === epoch && ctx.state === STATES.running && uiAutoForcedMove(ctx)) {
if (ctx.epoch === epoch && !ctx.port.isForced()) uiAutoSettle(ctx,STATES.decision,REASONS.call);
}
}
function uiAutoLaunch(ctx) {
if (!ctx.port.isForced()) return uiAutoSettle(ctx,STATES.decision,REASONS.call);
ctx.state = STATES.running;
uiAutoEmit(ctx);
if (uiAutoReduced(ctx)) uiAutoInstant(ctx);
else ctx.timer = window.setTimeout(function () { uiAutoTick(ctx); },ctx.intervalMs);
}
function uiAutoGo(ctx) {
if (ctx.destroyed) return;
ctx.epoch += 1;
ctx.timer = uiAutoClear(ctx.timer);
ctx.moves = 0;
ctx.parked = false;
if (ctx.holdTimer) {
ctx.resumeAfterHold = true;
ctx.state = STATES.paused;
uiAutoEmit(ctx);
return;
}
if (ctx.manual) uiAutoSettle(ctx,STATES.decision,REASONS.manual);
else uiAutoLaunch(ctx);
}
function uiAutoPause(ctx) {
if (ctx.state !== STATES.running) return;
ctx.timer = uiAutoClear(ctx.timer);
ctx.state = STATES.paused;
uiAutoEmit(ctx);
}
function uiAutoResume(ctx) {
if (ctx.state === STATES.paused && !ctx.destroyed && !ctx.holdTimer) uiAutoLaunch(ctx);
}
function uiAutoSkip(ctx) {
if (ctx.destroyed || !uiAutoActive(ctx)) return false;
ctx.timer = uiAutoClear(ctx.timer);
ctx.state = STATES.running;
uiAutoInstant(ctx);
return true;
}
function uiAutoPress(ctx) {
if (ctx.destroyed || (!ctx.port.isForced() && !uiAutoActive(ctx))) return false;
if (!uiAutoActive(ctx)) ctx.moves = 0;
const moved = uiAutoForcedMove(ctx);
if (moved && !ctx.port.isForced()) uiAutoSettle(ctx,STATES.decision,REASONS.call);
return moved;
}
function uiAutoHoldTick(ctx) {
ctx.holdTimer = UNHELD;
if (ctx.destroyed || !uiAutoPress(ctx)) return;
if (ctx.port.isForced()) ctx.holdTimer = window.setTimeout(function () { uiAutoHoldTick(ctx); },HOLD_REPEAT_MS);
}
function uiAutoHoldBegin(ctx) {
if (ctx.holdTimer || ctx.destroyed) return;
ctx.resumeAfterHold = ctx.state === STATES.running;
uiAutoPause(ctx);
ctx.moves = 0;
if (!uiAutoPress(ctx) || !ctx.port.isForced()) return;
ctx.holdTimer = window.setTimeout(function () { uiAutoHoldTick(ctx); },HOLD_REPEAT_MS);
uiAutoEmit(ctx);
}
function uiAutoHoldEnd(ctx) {
if (!ctx.holdTimer && !ctx.resumeAfterHold) return;
ctx.holdTimer = uiAutoClear(ctx.holdTimer);
const again = ctx.resumeAfterHold && ctx.state === STATES.paused;
ctx.resumeAfterHold = false;
uiAutoEmit(ctx);
if (again) uiAutoResume(ctx);
}
function uiAutoSetManual(ctx,manual) {
if (ctx.destroyed) return;
const parked = ctx.parked;
ctx.manual = Boolean(manual);
if (ctx.port.onManualChange) ctx.port.onManualChange(ctx.manual);
if (ctx.manual && uiAutoActive(ctx)) uiAutoSettle(ctx,STATES.decision,REASONS.manual);
else if (parked && !ctx.manual) uiAutoGo(ctx);
else uiAutoEmit(ctx);
}
function uiAutoKey(ctx,event) {
if (event.key !== 'Escape' || !uiAutoSkip(ctx)) return false;
if (event.preventDefault) event.preventDefault();
return true;
}
function uiAutoDestroy(ctx) {
ctx.destroyed = true;
ctx.timer = uiAutoClear(ctx.timer);
ctx.holdTimer = uiAutoClear(ctx.holdTimer);
ctx.state = STATES.idle;
uiAutoEmit(ctx);
}
function runToDecision(port) {
const ctx = uiAutoCreate(port);
return {
go:() => uiAutoGo(ctx),
pause:() => uiAutoPause(ctx),
resume:() => uiAutoResume(ctx),
togglePause:() => (ctx.state === STATES.paused ? uiAutoResume(ctx) :uiAutoPause(ctx)),
skip:() => uiAutoSkip(ctx),
press:() => uiAutoPress(ctx),
holdBegin:() => uiAutoHoldBegin(ctx),
holdEnd:() => uiAutoHoldEnd(ctx),
setManual:(manual) => uiAutoSetManual(ctx,manual),
handleKey:(event) => uiAutoKey(ctx,event),
destroy:() => uiAutoDestroy(ctx),
snapshot:() => uiAutoView(ctx),
watch:(watcher) => { ctx.watchers.push(watcher); },
};
}

function uiAutoButton(kind,label,hint) {
return uiEl('button',{ className:'btn auto-run-btn auto-run-' + kind,text:label,attrs:{ type:'button','data-focus-key':'auto-run-' + kind,title:hint } });
}
function uiAutoCallLit(view) {
return view.state === STATES.decision && !view.manual;
}
function uiAutoBadge(view) {
if (view.manual && (view.state === STATES.idle || view.state === STATES.decision)) return MANUAL_BADGE;
return BADGE_TEXT[view.state];
}
function uiAutoSetDisabled(button,off) {
button.disabled = off;
if (off) button.setAttribute('disabled','');
else if (button.removeAttribute) button.removeAttribute('disabled');
}
function uiAutoPaintBadge(badge,view) {
badge.textContent = uiAutoBadge(view);
badge.className = 'auto-run-badge' + (uiAutoCallLit(view) ? ' is-call' :'') + (view.state === STATES.running ? ' is-auto' :'');
}
function uiAutoPaintPause(pause,view) {
pause.textContent = view.state === STATES.paused ? 'RESUME' :'PAUSE';
uiAutoSetDisabled(pause,(view.state !== STATES.running && view.state !== STATES.paused) || view.holding);
}
function uiAutoPaintStep(step,view) {
const shown = view.state !== STATES.running || view.holding;
step.className = 'btn auto-run-btn auto-run-step' + (shown ? '' :' is-hidden');
}
function uiAutoWire(run,parts) {
parts.pause.addEventListener('click',run.togglePause);
parts.manual.addEventListener('click',function () { run.setManual(!run.snapshot().manual); });
parts.step.addEventListener('pointerdown',function (event) { if (!event.button) run.holdBegin(); });
['pointerup','pointercancel','pointerleave','blur'].forEach(function (type) { parts.step.addEventListener(type,run.holdEnd); });
parts.step.addEventListener('click',function (event) { if (event.detail === 0) run.press(); });
}
function uiAutoRunControls(run) {
const parts = {
badge:uiEl('span',{ className:'auto-run-badge',attrs:{ role:'status','aria-live':'polite' } }),
pause:uiAutoButton('pause','PAUSE','Pause or resume the automatic moves'),
manual:uiAutoButton('manual','MANUAL','Do every move yourself, no automatic moves'),
step:uiAutoButton('step','STEP','One forced move; hold to repeat'),
};
const node = uiEl('div',{ className:'auto-run',attrs:{ role:'group','aria-label':'Automatic moves' },children:[parts.badge,parts.pause,parts.manual,parts.step] });
uiAutoWire(run,parts);
const paint = function (view) {
uiAutoPaintBadge(parts.badge,view);
uiAutoPaintPause(parts.pause,view);
parts.manual.setAttribute('aria-pressed',String(view.manual));
uiAutoPaintStep(parts.step,view);
};
run.watch(paint);
paint(run.snapshot());
return { node,paint };
}

export { runToDecision,uiAutoRunControls,AUTO_STEP_MS,HOLD_REPEAT_MS,MAX_FORCED_MOVES };
