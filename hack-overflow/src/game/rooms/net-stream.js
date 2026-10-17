import { NET_WAVES } from './data/net-waves.js';
import { applyNet,createNet,netLine } from './net.js';
import { extendSpamBot,playBot,rawJumpBot,rebuildBot } from './net-solver.js';
import { prng } from './turret-stream.js';


const GENERATE_LIMIT = 300000;
const NO_GOLD = -1;
const NOT_SEEN = -1;
const ALPHABET = [...'abcdefghijklmnopqrstuvwxyz'];
const FIRST = 0;
const RANGE_MIN = 0;
const RANGE_MAX = 1;

function rulesOf(wave) {
return typeof wave === 'string' ? NET_WAVES[wave] :wave;
}
function inRange(value,range) {
return Number.isInteger(value) && value >= range[RANGE_MIN] && value <= range[RANGE_MAX];
}
function total(items) {
return items.reduce((sum,item) => sum + item,0);
}
function hasRepeat(items) {
return new Set(items).size !== items.length;
}
function isUnique(items,item) {
return items.filter((other) => other === item).length === 1;
}

const ADMITS = {
distinct:(window,item) => !window.includes(item),
sum:(window,item,stream) => total(window) + item <= stream.k,
};
const ITEMS = {
distinct:(item,rules) => ALPHABET.indexOf(item) >= FIRST && ALPHABET.indexOf(item) < rules.alphabet,
sum:(item,rules,stream) => inRange(item,rules.weights) && item <= stream.k,
};
function runFrom(stream,rules,start) {
const window = [];
const admits = ADMITS[rules.judge];
for (let at = start; at < stream.items.length && admits(window,stream.items[at],stream); at += 1) window.push(stream.items[at]);
return window.length;
}
function longestRun(stream,rules) {
return stream.items.reduce(function (best,_,start) {
const length = runFrom(stream,rules,start);
return length > best.length ? { start,length } :best;
},{ start:FIRST,length:0 });
}
function inRun(run,index) {
return Number.isInteger(index) && index >= run.start && index < run.start + run.length;
}
function pickGold(stream,rules) {
const run = longestRun(stream,rules);
const offset = stream.items.slice(run.start,run.start + run.length).findIndex((item) => isUnique(stream.items,item));
return offset < FIRST ? NO_GOLD :run.start + offset;
}

function isShape(stream,rules) {
const { items } = stream;
if (!Array.isArray(items) || items.length !== rules.n) return false;
if (rules.kRange && !inRange(stream.k,rules.kRange)) return false;
return items.every((item) => ITEMS[rules.judge](item,rules,stream));
}
function parWhy(plan) {
const [min,max] = plan.rules.parOver;
const over = plan.line.length - plan.rules.n;
return over >= min && over <= max ? '' :'par';
}
function goldWhy(stream,run) {
return inRun(run,stream.gold) && isUnique(stream.items,stream.items[stream.gold]) ? '' :'gold';
}

function lineStates({ stream,rules,line }) {
return line.reduce((states,move) => states.concat(applyNet(states[states.length - 1],move)),[createNet(stream,{ wave:rules })]);
}
function rawTarget(state) {
const seen = state.r > FIRST ? state.stream.items.lastIndexOf(state.stream.items[state.r],state.r - 1) :NOT_SEEN;
return seen === NOT_SEEN ? null :seen + 1;
}
function isTrap(state) {
const target = rawTarget(state);
return target !== null && target < state.l && hasRepeat(state.stream.items.slice(target,state.r));
}
function trapWhy(plan) {
return lineStates(plan).some(isTrap) ? '' :'trap';
}
function jumpWhy({ line }) {
return line.includes('jump') ? '' :'jump';
}
function shrinksWhy({ line }) {
return line.join(' ').includes('shrink shrink') ? '' :'shrinks';
}
function play({ stream,rules },bot) {
return playBot(createNet(stream,{ wave:rules }),bot);
}
function spamWhy(plan) {
return play(plan,extendSpamBot).status === 'failed' ? '' :'spam';
}
function rawJumpWhy(plan) {
const raw = Object.assign({},plan.rules,{ jump:'raw' });
return play({ stream:plan.stream,rules:raw },rawJumpBot).status === 'failed' ? '' :'raw jump';
}
function rebuildWhy(extra) {
return function check(plan) {
const state = play(plan,rebuildBot);
return state.status === 'won' && state.steps >= plan.line.length + extra ? '' :'rebuild';
};
}
const W1_REBUILD_EXTRA = 2;
const W2_RESTART_EXTRA = 3;
const JUDGE_CHECKS = {
distinct:[trapWhy,jumpWhy,spamWhy,rawJumpWhy,rebuildWhy(W1_REBUILD_EXTRA)],
sum:[shrinksWhy,spamWhy,rebuildWhy(W2_RESTART_EXTRA)],
};
function firstWhy(checks,plan) {
return checks.map((check) => check(plan)).find(Boolean) ?? '';
}
function streamWhy(stream,wave = 'w1') {
const rules = rulesOf(wave);
if (!isShape(stream,rules)) return 'shape';
const run = longestRun(stream,rules);
if (!inRange(run.length,rules.run)) return 'run';
if (goldWhy(stream,run)) return 'gold';
const plan = { stream,rules,run,line:netLine(stream,rules) };
return firstWhy([parWhy,...JUDGE_CHECKS[rules.judge]],plan);
}

function pick(next,count) {
return Math.floor(next() * count);
}
function pickInRange(next,range) {
return range[RANGE_MIN] + pick(next,range[RANGE_MAX] - range[RANGE_MIN] + 1);
}
const LIGHT_TAIL = 7;
const LIGHT_WEIGHTS = [1,2];
const GOLD_WEIGHT_MIN = 3;
const GOLD_WEIGHT_MAX = 5;
const GOLD_WEIGHTS = [GOLD_WEIGHT_MIN,GOLD_WEIGHT_MAX];
function weightsOf(next,rules) {
const gold = pickInRange(next,GOLD_WEIGHTS);
const [min,max] = rules.weights;
const heavy = Array.from({ length:max - min + 1 },(_,offset) => min + offset).filter((weight) => weight !== gold);
const head = Array.from({ length:rules.n - LIGHT_TAIL },() => heavy[pick(next,heavy.length)]);
const tail = Array.from({ length:LIGHT_TAIL },() => pickInRange(next,LIGHT_WEIGHTS));
tail[pick(next,LIGHT_TAIL)] = gold;
return head.concat(tail);
}
const MAKE = {
distinct:(next,rules) => ({ items:Array.from({ length:rules.n },() => ALPHABET[pick(next,rules.alphabet)]) }),
sum:(next,rules) => ({
items:weightsOf(next,rules),
k:pickInRange(next,rules.kRange),
}),
};
function candidate(next,rules) {
const stream = MAKE[rules.judge](next,rules);
return Object.assign(stream,{ gold:pickGold(stream,rules) });
}
function idOf(stream) {
return stream.items.join(',') + '/' + stream.k;
}
const poolCache = new Map();
function buildPool(wave,seed = rulesOf(wave).seed,size = rulesOf(wave).pool) {
const rules = rulesOf(wave);
const key = rules.id + ':' + seed + ':' + size;
if (poolCache.has(key)) return poolCache.get(key);
const next = prng(seed);
const seen = new Set();
const out = [];
for (let tries = 0; out.length < size && tries < GENERATE_LIMIT; tries += 1) {
const stream = candidate(next,rules);
if (!seen.has(idOf(stream)) && !streamWhy(stream,rules)) {
seen.add(idOf(stream));
out.push(stream);
}
}
poolCache.set(key,out);
return out;
}
function pickStream(pool,lastIndex,next) {
const choices = pool.map((_,index) => index).filter((index) => index !== lastIndex);
const index = choices[pick(next,choices.length)];
return { stream:pool[index],index };
}

export { buildPool,pickStream,streamWhy };
