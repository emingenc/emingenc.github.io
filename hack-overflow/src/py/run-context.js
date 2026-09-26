import { PyError } from './errors.js';
import { nameErrorMessage, unboundLocalMessage, freeVariableMessage } from './error-messages.js';

class RunContext {
constructor(meter,slot,localNames = new Set()) {
this.meter = meter;
this.slotLine = slot.line;
this.slotKind = slot.kind;
this.scope = new Map();
this.onSlotLine = false;
this.localNames = localNames;
this.inChainThunk = false;
}
isSlotLine(node) {
return node.line === this.slotLine;
}
withSlot(fn) {
this.onSlotLine = true;
try {
return fn();
} finally {
this.onSlotLine = false;
}
}
/**
 * CPython's op-cost model evaluates each operand of a slot-line comparison
 * chain of 2+ operators that includes `in`/`not in` inside its own nested
 * closure (a lambda per operand, used to charge membership cost once each).
 * A not-yet-assigned local read from inside that closure is therefore a free
 * variable to CPython, not a plain local - `getVar` reports it accordingly
 * while this flag is set.
 */
withChainThunk(fn) {
const previous = this.inChainThunk;
this.inChainThunk = true;
try {
return fn();
} finally {
this.inChainThunk = previous;
}
}
chargeSlot(amount) {
if (this.onSlotLine) this.meter.charge(amount);
}
}
function unassignedLocalError(ctx,name) {
if (ctx.inChainThunk) return new PyError('NameError',freeVariableMessage(name));
return new PyError('UnboundLocalError',unboundLocalMessage(name));
}
function getVar(ctx,name) {
if (ctx.scope.has(name)) return ctx.scope.get(name);
if (ctx.localNames.has(name)) throw unassignedLocalError(ctx,name);
throw new PyError('NameError',nameErrorMessage(name));
}
function setVar(ctx,name,value) {
ctx.scope.set(name,value);
}

export { RunContext, getVar, setVar };
