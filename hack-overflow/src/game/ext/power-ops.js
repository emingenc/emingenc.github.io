import { EXT_FIELDS } from './index.js';

const TRIALS_LENT = 3;

function repairOf(key) {
return EXT_FIELDS.find((field) => field.KEY === key).repair;
}
function tableWith(ext,key,[id,value]) {
const next = repairOf(key)({ ...repairOf(key)(ext[key]),[id]:value });
return Object.hasOwn(next,id) ? next :null;
}
function tagsOf(ext) {
return repairOf('tags')(ext && ext.tags);
}
function withTag(ext,id,cell) {
const value = `${cell.col},${cell.row}`;
const tags = tagsOf(ext);
const next = tags[id] === value ? null :tableWith(ext,'tags',[id,value]);
return next && next[id] === value ? { ...ext,tags:next } :ext;
}
function trialsOf(ext,power) {
return repairOf('trials')(ext && ext.trials)[power] ?? 0;
}
function spendTrial(ext,power) {
const left = trialsOf(ext,power);
return left > 0 ? { ...ext,trials:{ ...repairOf('trials')(ext.trials),[power]:left - 1 } } :ext;
}
function lendsOf(ext,ally) {
return repairOf('lends')(ext && ext.lends)[ally] ?? 0;
}
function lendTrials(ext,power,ally) {
const trials = trialsOf(ext,power) === 0 ? tableWith(ext,'trials',[power,TRIALS_LENT]) :null;
const lends = trials && tableWith(ext,'lends',[ally,lendsOf(ext,ally) + 1]);
return lends ? { ...ext,trials,lends } :ext;
}

export { lendsOf,lendTrials,spendTrial,tagsOf,trialsOf,withTag };
