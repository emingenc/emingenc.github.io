import { uiEl } from './dom.js';
import { uiVerdictHeld } from './render-submit-panel.js';

const TRACE_SEGMENTS_LEFT_WARN = 1;
const TRACE_PULSE_MS = 420;
const TRACE_PULSE_CYCLE_MS = TRACE_PULSE_MS * 2;

function uiTraceLeft(trace) {
return trace.capacity - trace.filled;
}
function uiTraceFillDelayMs(anim) {
const jamAtMs = anim.plan.pins[anim.plan.jamIndex].atMs;
return jamAtMs - (performance.now() - anim.startedAt);
}
function uiTraceFreshIndex(breach) {
const anim = breach.anim;
if (!anim || (anim.kind !== 'fail' && anim.kind !== 'traced')) return null;
return breach.trace.filled - 1;
}
function uiTraceIsFresh(freshIndex,delayMs) {
return freshIndex !== null && delayMs > 0;
}
function uiTraceSegmentClass(spec) {
if (!spec.filled) return 'breach-trace-seg';
if (!spec.fresh) return 'breach-trace-seg breach-trace-seg-filled';
const warned = spec.warned ? ' breach-trace-seg-warned' :'';
return 'breach-trace-seg breach-trace-seg-filled breach-trace-seg-fresh' + warned;
}
function uiTraceSegmentNode(spec) {
const seg = uiEl('span',{ className:uiTraceSegmentClass(spec),attrs:{ 'aria-hidden':'true' } });
if (spec.fresh) seg.style.animationDelay = spec.warned ? spec.delayMs + 'ms, ' + spec.pulseAtMs + 'ms' :spec.delayMs + 'ms';
return seg;
}
function uiTraceSegments(spec) {
const segments = [];
for (let index = 0;index < spec.trace.capacity;index += 1) {
segments.push(uiTraceSegmentNode({
filled:index < spec.trace.filled,fresh:index === spec.freshIndex,
delayMs:spec.delayMs,warned:spec.warned,pulseAtMs:spec.pulseAtMs,
}));
}
return uiEl('span',{ className:'breach-trace-segments',attrs:{ 'aria-hidden':'true' },children:segments });
}
function uiTraceCountSpan(className,value) {
return uiEl('span',{ className,text:String(value) });
}
function uiTraceCountGroup(trace,fresh) {
const after = uiTraceCountSpan('breach-trace-count-after',trace.filled);
if (!fresh) return uiEl('span',{ className:'breach-trace-count',children:[after] });
const before = uiTraceCountSpan('breach-trace-count-before',Math.max(trace.filled - 1,0));
return uiEl('span',{ className:'breach-trace-count',children:[before,after] });
}
function uiTraceLabel(trace,fresh) {
return uiEl('span',{
className:'breach-trace-label',attrs:{ 'aria-hidden':'true' },
children:[
uiEl('span',{ className:'breach-trace-name',text:'TRACE ' }),
uiTraceCountGroup(trace,fresh),
uiEl('span',{ text:'/' + trace.capacity }),
],
});
}
function uiTraceWarning(trace,concealing) {
const warnOn = uiTraceLeft(trace) === TRACE_SEGMENTS_LEFT_WARN;
const off = warnOn ? '' :' breach-trace-warn-off' + (concealing ? ' breach-trace-warn-conceal' :'');
return uiEl('span',{
className:'breach-trace-warn' + off,
text:TRACE_SEGMENTS_LEFT_WARN + ' LEFT',attrs:{ 'aria-hidden':'true' },
});
}
function uiTraceValueText(trace) {
const warn = uiTraceLeft(trace) === TRACE_SEGMENTS_LEFT_WARN ? ', ' + TRACE_SEGMENTS_LEFT_WARN + ' left' :'';
return trace.filled + ' of ' + trace.capacity + warn;
}
function uiTraceSaid(app,freshIndex) {
const trace = app.game.breach.trace;
return uiVerdictHeld(app) && freshIndex !== null ? { ...trace,filled:freshIndex } :trace;
}
function uiTraceMeterAttrs(said) {
return {
role:'meter','aria-label':'TRACE','aria-valuemin':'0','aria-valuemax':String(said.capacity),
'aria-valuenow':String(said.filled),'aria-valuetext':uiTraceValueText(said),
};
}
function uiTraceClassName(trace,freshIndex,fresh) {
const hot = trace.filled > 0 ? ' breach-trace-hot' :'';
const heating = freshIndex === 0 ? ' breach-trace-heating' :'';
const warnOn = uiTraceLeft(trace) === TRACE_SEGMENTS_LEFT_WARN ? ' breach-trace-warn-on' :'';
const freshClass = fresh ? ' breach-trace-fresh' :'';
return 'breach-trace' + hot + heating + warnOn + freshClass;
}
function uiSetTracePulseVars(meter,delayMs,pulseAtMs) {
meter.style.setProperty('--trace-fill-at',delayMs + 'ms');
meter.style.setProperty('--trace-pulse-n',String(Math.max(0,(delayMs - pulseAtMs) / TRACE_PULSE_MS)));
meter.style.setProperty('--trace-pulse-at',pulseAtMs + 'ms');
meter.style.setProperty('--trace-pulse-ms',TRACE_PULSE_MS + 'ms');
}
function uiBreachTrace(app) {
const breach = app.game.breach;
const trace = breach.trace;
const freshIndex = uiTraceFreshIndex(breach);
const delayMs = freshIndex === null ? 0 :uiTraceFillDelayMs(breach.anim);
const fresh = uiTraceIsFresh(freshIndex,delayMs);
const concealing = fresh && breach.anim.kind === 'traced';
const warned = freshIndex !== null && breach.anim.kind === 'traced';
const pulseAtMs = -(performance.now() % TRACE_PULSE_CYCLE_MS);
const meter = uiEl('div',{
className:uiTraceClassName(trace,freshIndex,fresh),
attrs:uiTraceMeterAttrs(uiTraceSaid(app,freshIndex)),
children:[uiTraceLabel(trace,fresh),uiTraceSegments({ trace,freshIndex,delayMs,warned,pulseAtMs }),uiTraceWarning(trace,concealing)],
});
uiSetTracePulseVars(meter,delayMs,pulseAtMs);
return meter;
}

export { uiBreachTrace };
