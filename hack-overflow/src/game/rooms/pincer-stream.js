import { PINCER_POOL,PINCER_W1 } from './data/pincer-w1.js';
import { collectPool } from './pool-util.js';


const MIN_PAR = 5;
const MAX_PAR = 8;
const MIN_NEAR_PAIRS = 2;
const NEAR = 1;
const FIRST = 0;
const LAST = PINCER_W1.n - 1;

function pairSums(pillars) {
return pillars.flatMap((first,index) => pillars.slice(index + 1).map((second) => first + second));
}
function isPillar(value) {
return Number.isInteger(value) && value >= PINCER_W1.minValue && value <= PINCER_W1.maxValue;
}
function isShape(layout) {
const { pillars } = layout;
if (!Array.isArray(pillars) || pillars.length !== PINCER_W1.n || !pillars.every(isPillar)) return false;
return pillars.every((value,index) => index === FIRST || value > pillars[index - 1]);
}
function meeting(layout) {
const { pillars,target } = layout;
let low = FIRST;
let high = LAST;
while (low < high) {
const sum = pillars[low] + pillars[high];
if (sum === target) return { low,high };
if (sum < target) low += 1;
else high -= 1;
}
return null;
}
function pairsWhy(layout) {
const sums = pairSums(layout.pillars);
if (sums.filter((sum) => sum === layout.target).length !== 1) return 'pairs';
const near = sums.filter((sum) => Math.abs(sum - layout.target) === NEAR);
return near.length < MIN_NEAR_PAIRS ? 'near pairs' :'';
}
function lineWhy(layout) {
const { low,high } = meeting(layout);
if (low === FIRST || high === LAST) return 'one cannon';
const par = low + (LAST - high) + 1;
if (par < MIN_PAR || par > MAX_PAR) return 'par';
return layout.plank === low + 1 ? '' :'plank';
}
function streamWhy(layout) {
if (!isShape(layout)) return 'shape';
return pairsWhy(layout) || lineWhy(layout);
}

function pick(next,count) {
return Math.floor(next() * count);
}
function distinctPillars(next) {
const values = new Set();
while (values.size < PINCER_W1.n) values.add(PINCER_W1.minValue + pick(next,PINCER_W1.maxValue));
return [...values];
}
function candidatePillars(next) {
return distinctPillars(next).sort((first,second) => first - second);
}
function candidate(next) {
const pillars = candidatePillars(next);
const left = pick(next,PINCER_W1.n - 1);
const right = left + 1 + pick(next,PINCER_W1.n - 1 - left);
return { pillars,target:pillars[left] + pillars[right],plank:left + 1 };
}
function buildPool(seed = PINCER_POOL.seed,size = PINCER_POOL.size) {
const id = (layout) => layout.pillars.join(',') + '/' + layout.target;
return collectPool({ tag:'pincer-w1',seed,size },{ candidate,why:streamWhy,id });
}
function pickStream(pool,lastIndex,next) {
const choices = pool.map((_,index) => index).filter((index) => index !== lastIndex);
const index = choices[pick(next,choices.length)];
return { stream:pool[index],index };
}

export { buildPool,pickStream,streamWhy,pairsWhy,meeting,pick,distinctPillars,MIN_PAR,MAX_PAR };
