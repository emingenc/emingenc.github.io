import { pyType } from './value-types.js';
import { dictEntries, setValues } from './containers.js';

const SINGLETON_LENGTH = 1;
function pyRepr(value) {
return REPR_BUILDERS[pyType(value)](value);
}
function reprList(value) {
return `[${value.map(pyRepr).join(', ')}]`;
}
function reprTuple(value) {
const inner = value.items.map(pyRepr).join(', ');
const trailing = value.items.length === SINGLETON_LENGTH ? ',' :'';
return `(${inner}${trailing})`;
}
function reprDict(value) {
const parts = dictEntries(value).map(([key,item]) => `${pyRepr(key)}: ${pyRepr(item)}`);
return `{${parts.join(', ')}}`;
}
function reprSet(value) {
const items = setValues(value).map(pyRepr).sort();
return items.length ? `{${items.join(', ')}}` :'set()';
}
function reprSlice(value) {
return `slice(${pyRepr(value.start)}, ${pyRepr(value.stop)}, ${pyRepr(value.step)})`;
}
const DEFAULT_RANGE_STEP = 1;
function reprRange(value) {
return value.step === DEFAULT_RANGE_STEP ? `range(${value.start}, ${value.stop})` :`range(${value.start}, ${value.stop}, ${value.step})`;
}
const HEX_RADIX = 16;
const CONTROL_CHAR_MAX = 0x20;
const DEL_CHAR_CODE = 0x7f;
const BACKSLASH_ESCAPES = { '\\':'\\\\','\n':'\\n','\r':'\\r','\t':'\\t' };
function quoteFor(text) {
return text.includes("'") && !text.includes('"') ? '"' :"'";
}
function hexEscape(code) {
return `\\x${code.toString(HEX_RADIX).padStart(2, '0')}`;
}
function escapeChar(ch,quote) {
if (BACKSLASH_ESCAPES[ch]) return BACKSLASH_ESCAPES[ch];
if (ch === quote) return `\\${quote}`;
const code = ch.codePointAt(0);
return code < CONTROL_CHAR_MAX || code === DEL_CHAR_CODE ? hexEscape(code) :ch;
}
function reprString(text) {
const quote = quoteFor(text);
const body = Array.from(text,(ch) => escapeChar(ch,quote)).join('');
return `${quote}${body}${quote}`;
}
const REPR_BUILDERS = {
NoneType:() => 'None',
bool:(value) => (value ? 'True' :'False'),
int:(value) => String(value),
str:reprString,
list:reprList,
tuple:reprTuple,
dict:reprDict,
set:reprSet,
slice:reprSlice,
range:reprRange,
};

export { pyRepr };
