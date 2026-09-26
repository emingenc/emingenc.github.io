import { NONE, PyTuple, pyType } from './value-types.js';
import { pySize } from './size.js';
import { PyError } from './errors.js';
import { SLICE_INDEX_TYPE_MESSAGE, SLICE_STEP_ZERO_MESSAGE } from './error-messages.js';

function sliceBound(value) {
if (value === NONE) return null;
const kind = pyType(value);
if (kind === 'int' || kind === 'bool') return Number(value);
throw new PyError('TypeError',SLICE_INDEX_TYPE_MESSAGE);
}
function sliceStep(value) {
const step = sliceBound(value);
if (step === 0) throw new PyError('ValueError',SLICE_STEP_ZERO_MESSAGE);
return step === null ? 1 :step;
}
function clamp(value,low,high) {
return Math.max(low,Math.min(value,high));
}
function boundsFor(geometry) {
return geometry.step < 0
? { low:-1,high:geometry.length - 1 }
:{ low:0,high:geometry.length };
}
function boundedIndex(value,geometry,bounds) {
const adjusted = value < 0 ? value + geometry.length :value;
return clamp(adjusted,bounds.low,bounds.high);
}
function normalizeBound(value,geometry,fallback) {
const bound = sliceBound(value);
return bound === null ? fallback :boundedIndex(bound,geometry,boundsFor(geometry));
}
function sliceWindow(pySlice,length) {
const step = sliceStep(pySlice.step);
const geometry = { length,step };
const start = normalizeBound(pySlice.start,geometry,step < 0 ? length - 1 :0);
const stop = normalizeBound(pySlice.stop,geometry,step < 0 ? -1 :length);
return { start,stop,step };
}
function ascendingIndices(window) {
const indices = [];
for (let index = window.start; index < window.stop; index += window.step) indices.push(index);
return indices;
}
function descendingIndices(window) {
const indices = [];
for (let index = window.start; index > window.stop; index += window.step) indices.push(index);
return indices;
}
function sliceIndexList(window) {
return window.step > 0 ? ascendingIndices(window) :descendingIndices(window);
}
const REBUILD_BY_TYPE = {
list:(object,indices) => indices.map((index) => object[index]),
tuple:(object,indices) => new PyTuple(indices.map((index) => object.items[index])),
str:(object,indices) => indices.map((index) => object[index]).join(''),
};
function sliceSequence(object,pySlice) {
const window = sliceWindow(pySlice,pySize(object));
const plainCopy = Array.isArray(object) || typeof object === 'string';
if (window.step === 1 && plainCopy) return object.slice(window.start,window.stop);
return REBUILD_BY_TYPE[pyType(object)](object,sliceIndexList(window));
}

export { sliceSequence, sliceWindow, sliceIndexList };
