import { VERDICT_WORDS } from '../logic/index.js';

function clampFilled(filled,capacity) {
const safe = Number.isFinite(filled) ? filled :0;
return Math.min(Math.max(safe,0),capacity - 1);
}
function createTrace(capacity,filled) {
return { capacity,filled:clampFilled(filled,capacity) };
}
function isTraced(trace) {
return trace.filled >= trace.capacity;
}
function traceAfterSubmit(trace,verdict) {
if (verdict === VERDICT_WORDS.P) return { trace,failed:false,traced:false };
const filled = Math.min(trace.filled + 1,trace.capacity);
return { trace:{ ...trace,filled },failed:true,traced:filled >= trace.capacity };
}

export { createTrace, isTraced, traceAfterSubmit };
