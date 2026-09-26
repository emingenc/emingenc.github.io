import { PyTuple, PyRange, pyRangeItem, pyType } from './value-types.js';
import { dictEntries } from './containers.js';
import { evaluateExpr } from './run-expr.js';
import { storeTarget } from './run-assign.js';
import { PyEnumerate } from './run-builtins.js';
import { execBody, headerTest } from './run-stmt.js';
import { PyError } from './errors.js';
import { notIterableMessage } from './error-messages.js';

function listCursor(list) {
return { length:() => list.length,item:(at) => list[at] };
}
function tupleCursor(tuple) {
return { length:() => tuple.items.length,item:(at) => tuple.items[at] };
}
function strCursor(text) {
return { length:() => text.length,item:(at) => text[at] };
}
function rangeCursor(range) {
return { length:() => range.length,item:(at) => pyRangeItem(range,at) };
}
function enumerateCursor(en) {
const inner = sourceCursor(en.target);
return { length:inner.length,item:(at) => new PyTuple([at,inner.item(at)]) };
}
const DICT_MUTATED_MESSAGE = 'dictionary changed size during iteration';
/**
 * A dict's `for` cursor. `length()` re-checks the live size against the
 * size captured at loop start every time it is called (once per iteration
 * attempt, including the final one that discovers exhaustion) so a size
 * change is reported even on what would otherwise be the last iteration -
 * the same order CPython's dict iterator uses.
 */
function dictCursor(dict) {
const keys = dictEntries(dict).map(([key]) => key);
const initialSize = dict.entries.size;
const length = () => {
if (dict.entries.size !== initialSize) throw new PyError('RuntimeError',DICT_MUTATED_MESSAGE);
return keys.length;
};
return { length,item:(at) => keys[at] };
}
const SEQUENCE_CURSORS = { list:listCursor,tuple:tupleCursor,str:strCursor,dict:dictCursor };
function refuseSetIteration() {
throw new PyError('InternalError','iterating a set is not supported');
}
function sourceCursor(value) {
if (value instanceof PyRange) return rangeCursor(value);
if (value instanceof PyEnumerate) return enumerateCursor(value);
const type = pyType(value);
if (type === 'set') return refuseSetIteration();
const cursor = SEQUENCE_CURSORS[type];
if (!cursor) throw new PyError('TypeError',notIterableMessage(value));
return cursor(value);
}
function runIterations(node,cursor,ctx) {
for (let at = 0; at < cursor.length(); at += 1) {
ctx.meter.charge(1);
storeTarget(node.target,cursor.item(at),ctx);
execBody(node.body,ctx);
}
}
function execFor(node,ctx) {
const source = evaluateExpr(node.iterable,ctx);
runIterations(node,sourceCursor(source),ctx);
execBody(node.orelse,ctx);
}
function execWhile(node,ctx) {
while (headerTest(node,ctx)) {
ctx.meter.charge(1);
execBody(node.body,ctx);
}
execBody(node.orelse,ctx);
}

export { execFor, execWhile };
