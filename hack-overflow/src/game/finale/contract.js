import { hasBeat,withBeat,withGhost } from '../ext/ops.js';

const BEATS = Object.freeze({
ordeal:'ordeal',home:'ordeal-home',m4:'m4',m5:'m5',roadback:'roadback',kernel:Object.freeze(['k-1','k-2','k-3','k-4','k-5']),reveal:'root-reveal',halted:'halted',fan:'fan-done',
});
const WRONG_EVERY = 3;
const SKIPPED = Object.freeze([BEATS.ordeal,BEATS.m4,BEATS.m5]);

function flagOf(ext) {
const flag = ext && ext.ghost && ext.ghost.flag;
return flag === 'reviewed' || flag === 'merged' ? flag :null;
}
function offerIndex(ext) {
const ghost = ext.ghost || {};
return Math.max(1,(ghost.offered || 0) - (ghost.base || 0) + 1);
}
function offerIsWrong(ext) {
return flagOf(ext) === 'merged' && (offerIndex(ext) - 1) % WRONG_EVERY === 0;
}
function offerShowsWork(ext) {
return flagOf(ext) === 'reviewed';
}
function hintText(ext,truth) {
if (offerShowsWork(ext)) return truth.from + ' - ' + truth.minus + ' = ' + truth.value + ': slot ' + truth.value;
return 'slot ' + (offerIsWrong(ext) ? truth.value + 1 :truth.value);
}
function finalePhase(ext,save,left) {
if (save.ended || left > 0) return 'legacy';
if (!hasBeat(ext,BEATS.roadback)) return 'roadback';
return BEATS.kernel.every((id) => hasBeat(ext,id)) ? 'review' :'kernel';
}
function roadBackDue(ext,left,save) {
return left === 0 && !hasBeat(ext,BEATS.roadback) && !(save && save.ended);
}
function ordealSkipFixture() {
return [...SKIPPED];
}
function withBeats(ext,ids) {
return ids.reduce((told,id) => withBeat(told,id),ext);
}
function resolveOrdeal(ext,flag = null) {
const told = withBeat(ext,BEATS.ordeal);
return withGhost(told,{ flag,base:(told.ghost && told.ghost.offered) || 0 });
}
function skipOrdeal(ext) {
return withBeats(resolveOrdeal(ext),ordealSkipFixture());
}

export { BEATS,flagOf,offerIndex,offerIsWrong,offerShowsWork,hintText,finalePhase,roadBackDue,ordealSkipFixture,withBeats,resolveOrdeal,skipOrdeal };
