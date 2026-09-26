import { pyType } from './value-types.js';
import { PyError } from './errors.js';
import { noLenMessage } from './error-messages.js';

const SIZE_OF = {
str:(value) => value.length,
list:(value) => value.length,
tuple:(value) => value.items.length,
dict:(value) => value.entries.size,
set:(value) => value.items.size,
range:(value) => value.length,
};
function hasPySize(value) {
return Boolean(SIZE_OF[pyType(value)]);
}
function pySize(value) {
const measure = SIZE_OF[pyType(value)];
if (!measure) throw new PyError('TypeError',noLenMessage(value));
return measure(value);
}

export { pySize, hasPySize };
