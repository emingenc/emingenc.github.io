import { flagOf } from './contract.js';

const FLOOD = Object.freeze({ tiles:8,hero:7,start:1 });
const HOLD_MS = 600;
const CONFIRM_TOAST = 'Tap it again to stamp it.';
const FLAG_OF_STAMP = Object.freeze({ REVIEWED:'reviewed',MERGED:'merged' });

function pressureOf(spec) {
return { ...FLOOD,...spec.pressure };
}
function still(state) {
return { state,tick:false,hit:false };
}
function ticked(state,spec) {
const { hero } = pressureOf(spec);
const flood = Math.min(hero,state.flood + 1);
return { state:{ ...state,flood,ticks:state.ticks + 1 },tick:true,hit:flood >= hero || (spec.chip || 0) > 0 };
}

function createReview(spec,ext) {
return {
kind:spec.kind,stage:'read',selected:null,stamp:null,picked:null,typed:0,ticks:0,flood:pressureOf(spec).start,
hint:null,toast:null,log:[],flag:flagOf(ext),
};
}
function stampedReview(step,spec,pick) {
const state = { ...step.state,stamp:pick.stamp,hint:null };
if (spec.drafts) return { ...step,state:{ ...state,stage:'drafts',log:[...state.log,...spec.afterStamp] } };
const flag = FLAG_OF_STAMP[pick.stamp] || null;
return { ...step,state:{ ...state,stage:'done' },result:{ stamp:pick.stamp,pick:null,flag } };
}
function tapLine(state,spec,line,clocked = false) {
if (state.stage !== 'read' || spec.lockLines === true || !spec.listing.some((row) => row.n === line)) return still(state);
const pick = spec.onPick(line);
const step = clocked ? still(state) :ticked(state,spec);
if (pick.stamp && state.selected === line) return stampedReview(step,spec,pick);
return { ...step,state:{ ...step.state,selected:line,hint:pick.stamp ? CONFIRM_TOAST :pick.hint } };
}
function typeDraft(state,spec) {
if (state.stage !== 'drafts' || state.typed >= spec.drafts.list.length) return state;
const typed = state.typed + 1;
const done = typed === spec.drafts.list.length;
return { ...state,typed,log:done ? [...state.log,...spec.drafts.bonus] :state.log };
}
function pickDraft(state,spec,id) {
if (state.stage !== 'drafts') return still(state);
const at = spec.drafts.list.findIndex((draft) => draft.id === id);
if (at < 0 || at >= state.typed) return still(state);
const step = ticked(state,spec);
return { ...step,state:{ ...step.state,picked:id,hint:null,toast:null } };
}
function approve(state,spec) {
if (state.stage !== 'drafts' || !state.picked) return { outcome:'idle',state,hit:false };
const { picked } = state;
const toast = spec.drafts.reasons[picked];
if (picked !== spec.drafts.accept) return { outcome:'lunge',state:{ ...state,picked:null,toast },hit:true };
const done = { ...state,stage:'done',stamp:'LGTM',toast,log:[...state.log,...spec.drafts.closing] };
return { outcome:'accept',state:done,hit:false,result:{ stamp:'LGTM',pick:picked,flag:state.flag } };
}
function mergeNow(state,spec) {
if (!spec.merge || state.stage !== 'read') return still(state);
return { ...still({ ...state,stage:'done',stamp:'MERGED' }),result:{ stamp:'MERGED',pick:null,flag:'merged' } };
}
function tickClock(state,spec) {
return state.stage === 'read' ? ticked(state,spec) :still(state);
}
function clockDue(spec,mode) {
const { assist,reduced } = mode || {};
return spec.clockMs > 0 && assist !== true && !reduced ? spec.clockMs :null;
}
function heartsAfterTick(hearts,spec) {
return Math.min(hearts,Math.max(spec.floor || 0,hearts - (spec.chip || 0)));
}
function revived(state,spec) {
return { ...state,flood:pressureOf(spec).start };
}
function watchText(state,spec,view) {
if (spec && spec.watch) return spec.watch(state,view);
return 'reviewed 24/24 · limit 24 · rewrites ' + state.ticks;
}

export { FLOOD,HOLD_MS,CONFIRM_TOAST,pressureOf,createReview,tapLine,typeDraft,pickDraft,approve,mergeNow,tickClock,clockDue,heartsAfterTick,revived,watchText };
