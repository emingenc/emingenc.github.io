import { LEDGER } from './data/ledger-levels.js';

const STATUS_PLAY = 'play';
const STATUS_WON = 'won';
const STATUS_FAILED = 'failed';
const INTEGRITY = 3;
const FIRST_SLOT = 1;
const MOVE_SEP = ':';
const NO_STARS = 0;
const STAR = 1;
const POINTS = 10;
const CHAIN_CAP = 4;
const BOUNTY_TIMES = 3;
const SHORT = 'short';
const TEXTS = LEDGER.texts;
const VERB_LABELS = { pair:'PAIR',store:'STORE',drop:'DROP',evict:'EVICT' };
const MISS_REASONS = ['miss-self','no-partner','wrong-slot'];
const STORE_MOVE = { id:'store',label:'STORE',code:'seen[x] += 1',enabled:true };
const DROP_MOVE = { id:'drop',label:'DROP',code:'continue',enabled:true };

function fill(template,values) {
return template.replace(/\{(\w+)\}/g,(match,key) => key in values ? String(values[key]) :match);
}
function countOf(seen,value) {
return seen[value] || 0;
}
function packet(state) {
return state.stream[state.i];
}
function needOf(state) {
return state.target - packet(state);
}
function hasVerb(state,verb) {
return state.level.verbs.includes(verb);
}
function variantOf(state) {
return state.level.variants[state.variant];
}
function isBounty(state,at) {
return state.bounty.includes(at);
}
function evictCode(seen,slot) {
return countOf(seen,slot) > 1 ? `seen[${slot}] -= 1` :`del seen[${slot}]`;
}
function countsOf(held) {
return held.reduce((seen,copy) => ({ ...seen,[copy.x]:countOf(seen,copy.x) + 1 }),{});
}
function heldAs(held) {
return { held,seen:countsOf(held),stored:held.length };
}
function oldestOf(held,value) {
return held.findIndex((copy) => copy.x === value);
}
function withoutAt(list,index) {
return [...list.slice(0,index),...list.slice(index + 1)];
}
function create(level,variant) {
const { stream,bounty = [] } = level.variants[variant];
return { level,variant,target:level.target,stream,bounty,i:0,...heldAs([]),cap:level.cap,ttl:level.ttl || 0,
pairs:0,score:0,chain:0,integrity:INTEGRITY,misses:0,skipped:[],expired:[],log:[],status:STATUS_PLAY,failure:null };
}
function slotsOf(state) {
return Array.from({ length:state.target - FIRST_SLOT },(_,i) => i + FIRST_SLOT);
}
function pairMove(slot) {
return { id:'pair' + MOVE_SEP + slot,label:'PAIR ' + slot,code:`seen[${slot}] -= 1`,enabled:true,arg:slot };
}
function evictMoves(state) {
if (!hasVerb(state,'evict') || state.stored < state.cap) return [];
return Object.keys(state.seen).map(Number).map((slot) => ({
id:'evict' + MOVE_SEP + slot,label:'EVICT ' + slot,code:evictCode(state.seen,slot),enabled:true,arg:slot }));
}
function moves(state) {
if (state.status !== STATUS_PLAY) return [];
const drop = hasVerb(state,'drop') ? [{ ...DROP_MOVE }] :[];
return [{ ...STORE_MOVE },...drop,...evictMoves(state),...slotsOf(state).map(pairMove)];
}

function entryOf(state,id,verb) {
return { n:state.log.length + 1,id,verb,at:state.i,p:state.i + 1,x:packet(state),need:needOf(state),bounty:isBounty(state,state.i) };
}
function logged(state,entry) {
return [...state.log,entry];
}
function alive(state,copy) {
return !state.ttl || state.i - copy.at <= state.ttl;
}
function expire(state) {
const stale = state.held.filter((copy) => !alive(state,copy));
if (!stale.length) return state;
const kept = state.held.filter((copy) => alive(state,copy));
const gone = stale.map((copy,index) => ({ ...copy,gone:state.i,after:state.log.length,code:evictCode(countsOf([...stale.slice(index),...kept]),copy.x) }));
return { ...state,...heldAs(kept),expired:[...state.expired,...gone] };
}
function advanced(state,changes) {
const next = expire({ ...state,...changes,i:state.i + 1 });
return next.i >= next.stream.length ? { ...next,status:STATUS_WON } :next;
}
function failed(state,failure) {
return { ...state,status:STATUS_FAILED,failure };
}
function operand(entry) {
return entry.verb === 'pair' || entry.verb === 'evict' ? entry.k :entry.x;
}
function failureOf(state,entry,key) {
const verb = VERB_LABELS[entry.verb];
const values = { ...entry,verb,cap:state.cap,T:state.target,max:variantOf(state).max,best:variantOf(state).best,score:state.score,tip:tipOf(state) };
const reason = key.startsWith(SHORT) ? SHORT :key;
return { reason,key,text:fill(TEXTS[key],values),move:entry.n,packet:entry.p,verb,value:operand(entry),code:entry.code,bridge:state.level.bridge };
}
function tipOf(state) {
if (hasVerb(state,'evict')) return TEXTS['tip-evict'];
return hasVerb(state,'drop') ? TEXTS['tip-drop'] :TEXTS['tip-pair'];
}


function pairPoints(state,bounty) {
return POINTS * Math.min(state.chain + 1,CHAIN_CAP) * (bounty ? BOUNTY_TIMES :1);
}
function missReason(state,slot) {
if (slot !== needOf(state)) return 'wrong-slot';
return slot === packet(state) ? 'miss-self' :'no-partner';
}
function commonestMiss(misses) {
const tally = (reason) => misses.filter((entry) => entry.reason === reason).length;
return MISS_REASONS.reduce((top,reason) => tally(reason) > tally(top) ? reason :top);
}
function packetsLabel(misses) {
const packets = [...new Set(misses.map((entry) => entry.p))];
return (packets.length > 1 ? 'packets ' :'packet ') + packets.join(', ');
}
function tracedFailure(state) {
const misses = state.log.filter((entry) => entry.verb === 'pair' && !entry.ok);
const cited = misses.filter((entry) => entry.reason === commonestMiss(misses)).pop();
const why = fill(TEXTS['why-' + cited.reason],cited);
return failureOf(state,{ ...cited,packets:packetsLabel(misses),why },'traced');
}
function choiceOf(state) {
return hasVerb(state,'drop') ? 'STORE or DROP' :'STORE';
}
function wrongPair(state,entry) {
const reason = missReason(state,entry.k);
const note = fill(TEXTS[reason],{ ...entry,T:state.target,choice:choiceOf(state) });
const lost = !state.level.retry;
const next = { ...state,integrity:state.integrity - 1,misses:state.misses + 1,chain:0,log:logged(state,{ ...entry,ok:false,reason,note,lost }) };
if (next.integrity <= 0) return failed(next,tracedFailure(next));
return lost ? advanced(next,{}) :next;
}
function applyPair(state,slot) {
const entry = { ...entryOf(state,'pair' + MOVE_SEP + slot,'pair'),k:slot,code:`seen[${slot}] -= 1` };
const at = slot === entry.need ? oldestOf(state.held,slot) :-1;
if (at < 0) return wrongPair(state,entry);
const partner = state.held[at];
const bounty = entry.bounty || partner.bounty;
const points = pairPoints(state,bounty);
const chain = state.chain + 1;
const done = { ...entry,ok:true,bounty,points,mult:Math.min(chain,CHAIN_CAP),partner:partner.at };
return advanced(state,{ ...heldAs(withoutAt(state.held,at)),pairs:state.pairs + 1,score:state.score + points,chain,log:logged(state,done) });
}


function partnerWaits(state) {
return countOf(state.seen,needOf(state)) > 0;
}
function skipChanges(state,entry) {
return entry.skipped ? { skipped:[...state.skipped,entry.n],chain:0 } :{};
}
function comingFor(state,copy) {
const last = state.ttl ? copy.at + state.ttl :state.stream.length - 1;
const need = state.target - copy.x;
return state.stream.slice(state.i,last + 1).filter((value) => value === need).length;
}
function hoardedCopy(state) {
const claimed = {};
return state.held.find((copy) => {
claimed[copy.x] = countOf(claimed,copy.x) + 1;
return claimed[copy.x] > comingFor(state,copy);
});
}
function storeEntryOf(state,copy) {
return state.log.find((entry) => entry.verb === 'store' && entry.ok && entry.at === copy.at);
}
function stillHeld(state,entry) {
return state.held.some((copy) => copy.at === entry.at);
}
function overflowFailure(state) {
const last = state.log[state.log.length - 1];
if (last.skipped) return failureOf(state,last,'overflow-self-skip');
const skip = state.log.find((entry) => entry.verb === 'store' && entry.skipped && stillHeld(state,entry));
if (skip) return failureOf(state,skip,'overflow-skip');
const hoard = hasVerb(state,'drop') ? hoardedCopy(state) :null;
if (hoard) return failureOf(state,storeEntryOf(state,hoard),'overflow-hoard');
return failureOf(state,last,'overflow-full');
}
function applyStore(state) {
const value = packet(state);
const entry = { ...entryOf(state,'store','store'),skipped:partnerWaits(state),code:`seen[${value}] += 1` };
if (state.stored >= state.cap) {
const next = { ...state,log:logged(state,{ ...entry,ok:false,reason:'overflow' }) };
return failed(next,overflowFailure(next));
}
const copy = { x:value,at:state.i,bounty:entry.bounty };
return advanced(state,{ ...heldAs([...state.held,copy]),...skipChanges(state,entry),log:logged(state,{ ...entry,ok:true }) });
}
function applyDrop(state) {
const entry = { ...entryOf(state,'drop','drop'),skipped:partnerWaits(state),code:'continue',ok:true };
return advanced(state,{ ...skipChanges(state,entry),log:logged(state,entry) });
}
function applyEvict(state,slot) {
const at = oldestOf(state.held,slot);
const copy = state.held[at];
const entry = { ...entryOf(state,'evict' + MOVE_SEP + slot,'evict'),k:slot,ok:true,code:evictCode(state.seen,slot),from:copy.at,lostBounty:copy.bounty };
return { ...state,...heldAs(withoutAt(state.held,at)),log:logged(state,entry) };
}
const APPLY = { pair:applyPair,store:applyStore,drop:applyDrop,evict:applyEvict };
function apply(state,id) {
if (!moves(state).some((move) => move.id === id)) return state;
const [verb,arg] = id.split(MOVE_SEP);
return APPLY[verb](state,Number(arg));
}
function status(state) {
return state.status;
}


function arrive(game,node) {
return game.ttl ? { ...node,held:node.held.filter((at) => node.i - at <= game.ttl) } :node;
}
function pairOption(game,node) {
const need = game.target - game.stream[node.i];
const at = node.held.find((j) => game.stream[j] === need);
if (at === undefined) return [];
const chain = Math.min(node.chain + 1,CHAIN_CAP);
const bounty = game.bounty.includes(node.i) || game.bounty.includes(at);
return [[game.gain(chain,bounty),arrive(game,{ i:node.i + 1,chain,held:node.held.filter((j) => j !== at) })]];
}
function passOptions(game,node,skip) {
const chain = skip ? 0 :node.chain;
const store = node.held.length < game.cap ? [[0,arrive(game,{ i:node.i + 1,chain,held:[...node.held,node.i] })]] :[];
const drop = game.drop ? [[0,arrive(game,{ i:node.i + 1,chain,held:node.held })]] :[];
return [...store,...drop];
}
function evictOptions(game,node) {
if (!game.evict || node.held.length < game.cap) return [];
const oldest = node.held.filter((at,index) => node.held.findIndex((j) => game.stream[j] === game.stream[at]) === index);
return oldest.map((at) => [0,{ ...node,held:node.held.filter((j) => j !== at) }]);
}
function optionsAt(game,node) {
const pair = pairOption(game,node);
return [...pair,...passOptions(game,node,pair.length > 0),...evictOptions(game,node)];
}
function bestFrom(game,node) {
if (node.i === game.stream.length) return 0;
const key = node.i + MOVE_SEP + node.chain + MOVE_SEP + node.held;
if (!game.memo.has(key)) {
const lines = optionsAt(game,node).map(([gain,next]) => gain + bestFrom(game,next));
game.memo.set(key,Math.max(-Infinity,...lines));
}
return game.memo.get(key);
}
function searchFrom(state,gain) {
if (state.status === STATUS_WON) return 0;
if (state.status === STATUS_FAILED) return -Infinity;
const game = { stream:state.stream,target:state.target,cap:state.cap,ttl:state.ttl,bounty:state.bounty,
drop:hasVerb(state,'drop'),evict:hasVerb(state,'evict'),gain,memo:new Map() };
return bestFrom(game,{ i:state.i,chain:Math.min(state.chain,CHAIN_CAP),held:state.held.map((copy) => copy.at) });
}
function bestPairsFrom(state) {
return searchFrom(state,() => 1);
}
function bestScoreFrom(state) {
return searchFrom(state,(mult,bounty) => POINTS * mult * (bounty ? BOUNTY_TIMES :1));
}


function reachLog(state) {
let replay = create(state.level,state.variant);
return state.log.map((entry) => {
replay = apply(replay,entry.id);
return { entry,reach:replay.score + bestScoreFrom(replay) };
});
}
function firstLoss(state) {
const best = variantOf(state).best;
return reachLog(state).find((step) => step.reach < best).entry;
}
function partnerCame(state,entry) {
const last = state.ttl ? entry.at + state.ttl :state.stream.length - 1;
return state.stream.slice(entry.at + 1,last + 1).includes(entry.need);
}
function shortKey(state,entry) {
if (entry.verb === 'pair') return entry.ok ? 'short-pair' :'short-wrong';
if (entry.skipped) return 'short-skip';
if (entry.verb === 'drop') return 'short-drop';
if (entry.verb === 'evict') return 'short-evict';
return partnerCame(state,entry) ? 'short-crowd' :'short-hoard';
}
function shortFailure(state) {
const entry = firstLoss(state);
const cited = entry.verb === 'evict' ? { ...entry,need:state.target - entry.k } :entry;
return failureOf(state,cited,shortKey(state,entry));
}
function marksOf(state) {
return variantOf(state).marks;
}
function starsOf(state) {
if (state.status !== STATUS_WON) return NO_STARS;
const [mark2,mark3] = marksOf(state);
return STAR + (state.score >= mark2 ? STAR :NO_STARS) + (state.score >= mark3 ? STAR :NO_STARS);
}
function failureNow(state) {
if (state.status === STATUS_FAILED) return state.failure;
if (state.status !== STATUS_WON || starsOf(state) > STAR + STAR) return null;
return shortFailure(state);
}
function noteOf(state) {
if (state.status !== STATUS_WON) return null;
let before = variantOf(state).best;
const free = reachLog(state).find(({ entry,reach }) => {
const lucky = entry.skipped && reach === before;
before = reach;
return lucky;
});
return free ? fill(TEXTS['skip-note'],{ ...free.entry,verb:VERB_LABELS[free.entry.verb] }) :null;
}

const LINE_TAILS = {
pair:(entry) => entry.ok ? `${entry.k} in seen -> pair, ${entry.code}` :`tapped ${entry.k} -> wrong pair`,
store:(entry) => `${entry.need} ${entry.skipped ? 'in seen, skipped' :'not in seen'} -> ${entry.code}${entry.ok ? '' :' -> overflow'}`,
drop:(entry) => `${entry.need} ${entry.skipped ? 'in seen, skipped' :'not in seen'} -> ${entry.code}`,
};
function moveLine(state,entry) {
if (entry.verb === 'evict') return entry.code;
return `need = ${state.target} - ${entry.x} = ${entry.need} -> ${LINE_TAILS[entry.verb](entry)}`;
}
function staleLines(state,count) {
return state.expired.filter((copy) => copy.after === count).map((copy) => `${copy.code}  # stale`);
}
function codeLog(state) {
return state.log.flatMap((entry,index) => [moveLine(state,entry),...staleLines(state,index + 1)]);
}
function result(state) {
const failure = failureNow(state);
const { max,best } = variantOf(state);
return { status:state.status,stars:starsOf(state),score:state.score,best,marks:marksOf(state),pairs:state.pairs,max,misses:state.misses,
failure,note:noteOf(state),bridge:state.level.bridge,codeLog:codeLog(state) };
}


function copyView(state,copy) {
const age = state.i - copy.at;
return { x:copy.x,at:copy.at,bounty:copy.bounty,age,left:state.ttl ? state.ttl - age + 1 :null };
}
function slotView(held,slot) {
const copies = held.filter((copy) => copy.x === slot);
const lefts = copies.map((copy) => copy.left).filter((left) => left !== null);
return { k:slot,count:copies.length,bounty:copies.some((copy) => copy.bounty),left:lefts.length ? Math.min(...lefts) :null };
}
function packetView(state,at) {
return { x:state.stream[at],at,bounty:isBounty(state,at) };
}
function currentView(state) {
if (state.status !== STATUS_PLAY) return null;
return { ...packetView(state,state.i),need:needOf(state) };
}
function previewView(state) {
const first = state.i + 1;
const last = Math.min(first + state.level.preview,state.stream.length);
return Array.from({ length:Math.max(0,last - first) },(_,j) => packetView(state,first + j));
}
function view(state) {
const { max,best } = variantOf(state);
const held = state.held.map((copy) => copyView(state,copy));
const total = state.stream.length;
return { score:state.score,marks:marksOf(state),best,max,pairs:state.pairs,chain:state.chain,multiplier:Math.min(state.chain,CHAIN_CAP),nextPoints:pairPoints(state,false),
integrity:state.integrity,stored:state.stored,cap:state.cap,ttl:state.ttl,total,packetNo:Math.min(state.i + 1,total),packetsLeft:Math.max(0,total - state.i),
packet:currentView(state),preview:previewView(state),held,slots:slotsOf(state).map((slot) => slotView(held,slot)),
stale:state.expired.filter((copy) => copy.after === state.log.length).map((copy) => copy.x) };
}

export { create,moves,apply,status,result,codeLog,view,bestPairsFrom,bestScoreFrom };
