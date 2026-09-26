import { pyType } from '../py/value-types.js';
import { pyEquals } from '../py/compare.js';
import { pyRepr } from '../py/repr.js';

const PAIR_LENGTH = 2;
function sameValue(got,wanted) {
if (pyType(got) !== pyType(wanted)) return false;
if (Array.isArray(wanted)) {
return got.length === wanted.length && got.every((item,i) => sameValue(item,wanted[i]));
}
return pyEquals(got,wanted);
}
function isIntPair(got) {
return Array.isArray(got) && got.length === PAIR_LENGTH && got.every((item) => pyType(item) === 'int');
}
function numericSort(values) {
return [...values].sort((left,right) => left - right);
}
function pairAnyOrder(got,wanted) {
return isIntPair(got) && pyEquals(numericSort(got),numericSort(wanted));
}
function reprSorted(values) {
return values.map((value) => pyRepr(value)).sort();
}
function unordered(got,wanted) {
if (!Array.isArray(got) || !Array.isArray(wanted) || got.length !== wanted.length) return false;
const gotSorted = reprSorted(got);
const wantedSorted = reprSorted(wanted);
return gotSorted.every((repr,i) => repr === wantedSorted[i]);
}
const COMPARATORS = { pair_any_order:pairAnyOrder,unordered };
function matches(compare,got,wanted) {
const comparator = COMPARATORS[compare];
return comparator ? comparator(got,wanted) :sameValue(got,wanted);
}

export { sameValue, matches };
