import { pyType, pyRangeValues } from './value-types.js';
import { dictEntries, setValues } from './containers.js';
import { PyError } from './errors.js';
import { notIterableMessage, starredNotIterableMessage } from './error-messages.js';

const ITERABLE_ITEMS = {
list:(value) => value,
tuple:(value) => value.items,
str:(value) => Array.from(value),
dict:(value) => dictEntries(value).map(([key]) => key),
set:(value) => setValues(value),
range:(value) => pyRangeValues(value),
};
function itemsOrThrow(value,buildMessage) {
const items = ITERABLE_ITEMS[pyType(value)];
if (!items) throw new PyError('TypeError',buildMessage(value));
return items(value);
}
function iterableItems(value) {
return itemsOrThrow(value,notIterableMessage);
}
/** `*expr` in a tuple/list display or a non-first call argument (run-expr.js's evalList/evalTuple, run-call.js's evalArgs): CPython's own wording for a non-iterable there. */
function starredItems(value) {
return itemsOrThrow(value,starredNotIterableMessage);
}

export { iterableItems, starredItems, itemsOrThrow };
