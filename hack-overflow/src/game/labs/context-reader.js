
const STATUS_BUILD = 'build';
const STATUS_WON = 'won';
const MOVE_RUN = 'run';
const MOVE_CLEAR = 'clear';
const MOVE_SEP = ':';
const STARS_FAIL = 0;
const STARS_OK = 1;
const STARS_UNCUT = 2;
const STARS_PAR = 3;
const KIND_ORDER = ['cut','summarize','stale','omitted'];
const PRNG_STEP = 0x6d2b79f5;
const PRNG_RANGE = 4294967296;
const PRNG_SHIFT_A = 15;
const PRNG_SHIFT_B = 7;
const PRNG_SHIFT_C = 14;
const PRNG_ODD = 1;
const PRNG_MIX = 61;

function chunkById(level,id) {
return level.chunks.find((chunk) => chunk.id === id);
}
function labelOf(level,id) {
const chunk = chunkById(level,id);
return chunk ? chunk.label :id;
}
function effective(chunk,summarized) {
return summarized && chunk.summary ? chunk.summary :chunk;
}
function entryView(level,entry) {
const chunk = chunkById(level,entry.id);
const eff = effective(chunk,entry.summarized);
const summarized = Boolean(entry.summarized && chunk.summary);
return { id:chunk.id,label:chunk.label,tokens:eff.tokens,summarized,cut:false };
}
function sumTokens(views) {
return views.reduce((total,view) => total + view.tokens,0);
}
function firstKeptIndex(views,budget) {
let left = sumTokens(views);
let index = 0;
while (index < views.length && left > budget) {
left -= views[index].tokens;
index += 1;
}
return index;
}
function factsOf(level,view) {
return effective(chunkById(level,view.id),view.summarized).facts;
}
function readFacts(level,kept) {
const facts = {};
const overridden = [];
kept.forEach((view) => {
Object.entries(factsOf(level,view)).forEach(([key,value]) => {
const prev = facts[key];
if (prev && prev.value !== value) {
overridden.push({ key,was:prev.from,by:view.id,wasValue:prev.value,byValue:value });
}
facts[key] = { value,from:view.id };
});
});
return { facts,overridden };
}
function read(level,window) {
const views = window.map((entry) => entryView(level,entry));
const keptFrom = firstKeptIndex(views,level.budget);
const entries = views.map((view,index) => ({ ...view,cut:index < keptFrom }));
const kept = entries.slice(keptFrom);
const cutIds = entries.slice(0,keptFrom).map((view) => view.id);
const { facts,overridden } = readFacts(level,kept);
return { entries,used:sumTokens(kept),total:sumTokens(views),budget:level.budget,cutIds,facts,overridden };
}

function sourceOf(level,key) {
return level.chunks.find((chunk) => chunk.facts[key] === level.expect[key]);
}
function sourceIdsOf(level) {
return new Set(Object.keys(level.expect).map((key) => sourceOf(level,key)).filter(Boolean).map((chunk) => chunk.id));
}
function isWrong(level,reading,key) {
const got = reading.facts[key];
return !got || got.value !== level.expect[key];
}
function pickPusher(ctx,cutIndex) {
const { entries } = ctx.reading;
const below = entries.slice(cutIndex + 1);
const others = entries.filter((view) => view.id !== entries[cutIndex].id);
const pool = below.length ? below :(others.length ? others :[entries[cutIndex]]);
const spare = pool.filter((view) => !ctx.sourceIds.has(view.id));
return (spare.length ? spare :pool).reduce((best,view) => view.tokens > best.tokens ? view :best);
}
function cutFailure(ctx,key) {
const { level,reading } = ctx;
const index = reading.entries.findIndex((view) => view.cut && factsOf(level,view)[key] === level.expect[key]);
if (index < 0) return null;
const victim = reading.entries[index];
const pusher = pickPusher(ctx,index);
const text = `${pusher.label} (${pusher.tokens}) pushed ${victim.label} out of the window.`;
return { kind:'cut',key,culprit:{ id:pusher.id,move:'add' },victim:victim.id,text,move:`ADDED ${pusher.label}` };
}
function summarizeFailure(ctx,key) {
const { level,reading } = ctx;
const source = sourceOf(level,key);
const view = source && reading.entries.find((entry) => entry.id === source.id);
if (!view || !view.summarized || factsOf(level,view)[key] === level.expect[key]) return null;
const text = `SUMMARIZE on ${source.label} dropped ${key}.`;
return { kind:'summarize',key,culprit:{ id:source.id,move:'sum' },text,move:`SUMMARIZED ${source.label}` };
}
function staleFailure(ctx,key) {
const { level,reading } = ctx;
const got = reading.facts[key];
if (!got) return null;
const stale = chunkById(level,got.from);
const source = sourceOf(level,key);
const staleAt = reading.entries.findIndex((view) => view.id === stale.id);
const freshAt = source ? reading.entries.findIndex((view) => view.id === source.id && !view.cut) :-1;
const text = freshAt >= 0 && freshAt < staleAt
? `${stale.label} sat below ${source.label} and overrode it.`
:`${stale.label} is out of date and nothing newer overrode it.`;
return { kind:'stale',key,culprit:{ id:stale.id,move:'add' },text,move:`ADDED ${stale.label}` };
}
function omittedFailure(ctx,key) {
const source = sourceOf(ctx.level,key);
const text = `No ${source.label}: the reader cannot find ${key}.`;
return { kind:'omitted',key,culprit:{ id:source.id,move:'omit' },text,move:`RAN WITHOUT ${source.label}` };
}
function classifyKey(ctx,key) {
return cutFailure(ctx,key) || summarizeFailure(ctx,key) || staleFailure(ctx,key) || omittedFailure(ctx,key);
}
function diagnose(level,reading) {
const ctx = { level,reading,sourceIds:sourceIdsOf(level) };
const found = Object.keys(level.expect)
.filter((key) => isWrong(level,reading,key))
.map((key) => classifyKey(ctx,key));
if (!found.length) return null;
const best = found.reduce((top,item) => KIND_ORDER.indexOf(item.kind) < KIND_ORDER.indexOf(top.kind) ? item :top);
return { ...best,practice:level.bridges[best.kind] };
}
function judge(level,window) {
const reading = read(level,window);
const failure = diagnose(level,reading);
return { ok:failure === null,reading,failure };
}
function movesUsed(window) {
return window.length + window.filter((entry) => entry.summarized).length;
}
function starsFor(level,window,fails) {
const { ok,reading } = judge(level,window);
if (!ok) return STARS_FAIL;
if (reading.cutIds.length) return STARS_OK;
return movesUsed(window) <= level.par && fails === 0 ? STARS_PAR :STARS_UNCUT;
}

function mulberry32(seed) {
let state = seed >>> 0;
return function next() {
state = (state + PRNG_STEP) >>> 0;
let mix = Math.imul(state ^ (state >>> PRNG_SHIFT_A),state | PRNG_ODD);
mix ^= mix + Math.imul(mix ^ (mix >>> PRNG_SHIFT_B),mix | PRNG_MIX);
return ((mix ^ (mix >>> PRNG_SHIFT_C)) >>> 0) / PRNG_RANGE;
};
}
function shuffled(ids,seed) {
const next = mulberry32(seed);
const out = ids.slice();
for (let i = out.length - 1; i > 0; i -= 1) {
const j = Math.floor(next() * (i + 1));
[out[i],out[j]] = [out[j],out[i]];
}
return out;
}
function createRun(level,seed) {
const tray = shuffled(level.chunks.map((chunk) => chunk.id),seed);
return { level,seed,tray,window:[],fails:0,status:STATUS_BUILD,stars:0,failure:null };
}
function moveId(kind,id) {
return kind + MOVE_SEP + id;
}
function windowMoves(run) {
const { level,window } = run;
const sums = window.filter((entry) => chunkById(level,entry.id).summary).map((entry) => ({
id:moveId('sum',entry.id),label:`${entry.summarized ? 'EXPAND' :'SUMMARIZE'} ${labelOf(level,entry.id)}` }));
const drops = window.map((entry) => ({ id:moveId('drop',entry.id),label:`DROP ${labelOf(level,entry.id)}` }));
return [...sums,...drops];
}
function moves(run) {
if (run.status === STATUS_WON) return [];
const placed = new Set(run.window.map((entry) => entry.id));
const adds = run.tray.filter((id) => !placed.has(id))
.map((id) => ({ id:moveId('add',id),label:`ADD ${labelOf(run.level,id)}` }));
const tail = run.window.length ? [{ id:MOVE_CLEAR,label:'CLEAR' },{ id:MOVE_RUN,label:'RUN' }] :[];
return [...adds,...windowMoves(run),...tail];
}
function nextWindow(window,id) {
const sep = id.indexOf(MOVE_SEP);
const kind = sep < 0 ? id :id.slice(0,sep);
const target = id.slice(sep + 1);
if (kind === MOVE_CLEAR) return [];
if (kind === 'add') return [...window,{ id:target,summarized:false }];
if (kind === 'drop') return window.filter((entry) => entry.id !== target);
return window.map((entry) => entry.id === target ? { ...entry,summarized:!entry.summarized } :entry);
}
function applyRun(run) {
const { ok,failure } = judge(run.level,run.window);
if (!ok) return { ...run,fails:run.fails + 1,failure };
return { ...run,status:STATUS_WON,stars:starsFor(run.level,run.window,run.fails),failure:null };
}
function apply(run,id) {
if (!moves(run).some((move) => move.id === id)) return run;
if (id === MOVE_RUN) return applyRun(run);
return { ...run,window:nextWindow(run.window,id),failure:null };
}

export { createRun,moves,apply,read,judge,starsFor,movesUsed,labelOf };
