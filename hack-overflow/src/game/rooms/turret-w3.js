import { TURRET_TEXTS, fillText } from './data/turret-texts.js';
import { WAVES } from './data/turret-waves.js';
import { targetAt } from './turret-stream.js';


const FIRST_SLOT = 1;
const NEVER = Infinity;
const BAY_PLACE = 0;
const W3 = WAVES.w3;

function litSlots(model) {
  return model.board.map((count, slot) => (slot >= FIRST_SLOT && count > 0 ? slot : 0)).filter(Boolean);
}
function needsRoom(model, spec, value) {
  return spec.cap > 0 && model.board[value] === 0 && litSlots(model).length >= spec.cap;
}
function clearSlot(model, slot) {
  model.board[slot] = 0;
  model.born[slot] = [];
  model.ttl[slot] = 0;
}
function ageTags(model) {
  const lapsed = [];
  litSlots(model).forEach(function (slot) {
    model.ttl[slot] -= 1;
    if (model.ttl[slot] > 0) return;
    clearSlot(model, slot);
    lapsed.push(slot);
  });
  return lapsed;
}
function planOf(state) {
  return planAt(state.stream, state.spec, state.next);
}
function planAt(stream, spec, number) {
  return { spec, target: targetAt(spec, number), ahead: stream.slice(number, number + spec.fog), future: stream.slice(number) };
}
function lifeOf(model, slot) {
  return Math.max(0, model.ttl[slot] - 1);
}
function inBay(model, plan, slot) {
  return model.bay?.[0]?.v === plan.target - slot;
}
function placeIn(key) {
  return function place(model, plan, slot) {
    if (inBay(model, plan, slot)) return BAY_PLACE;
    const at = plan[key].slice(0, lifeOf(model, slot)).indexOf(plan.target - slot);
    return at < 0 ? NEVER : at + 1;
  };
}
const reachOf = placeIn('ahead');
const dueOf = placeIn('future');
function adviceFor(model, plan, slot) {
  const reach = reachOf(model, plan, slot);
  const window = Math.min(lifeOf(model, slot), plan.spec.fog);
  const safe = reach === NEVER && lifeOf(model, slot) <= plan.spec.fog;
  return { slot, ttl: model.ttl[slot], want: plan.target - slot, window, reach, safe, due: dueOf(model, plan, slot) };
}
function loseFirst(best, other) {
  if (other.safe !== best.safe) return other.safe ? other : best;
  if (other.reach !== best.reach) return other.reach > best.reach ? other : best;
  return other.ttl > best.ttl ? other : best;
}
function evictAdvice(model, plan) {
  const options = litSlots(model).map((slot) => adviceFor(model, plan, slot));
  return options.length === 0 ? null : options.reduce(loseFirst);
}
function judgeEvict(model, plan, slot) {
  const mine = adviceFor(model, plan, slot);
  const best = evictAdvice(model, plan);
  return { thrown: mine.due === BAY_PLACE || (best.safe && mine.due !== NEVER), mine, best };
}
function adviceClause(advice) {
  const toast = TURRET_TEXTS.toast;
  if (!advice.safe) return fillText(toast.fog, advice);
  return fillText(advice.window > 0 ? toast.free : toast.gone, advice);
}
function lightSlot(model, drone, life) {
  model.board[drone.v] += 1;
  model.born[drone.v].push(drone.n);
  model.ttl[drone.v] = life;
}


function newModel(spec) {
  const size = spec.slots + 1;
  return { board: Array(size).fill(0), ttl: Array(size).fill(0), born: Array.from({ length: size }, () => []) };
}
function oraclePick(model, plan) {
  return evictAdvice(model, plan).slot;
}
function takePartner(model, slot) {
  model.board[slot] -= 1;
  model.born[slot].shift();
  if (model.board[slot] === 0) model.ttl[slot] = 0;
}
function makeRoom(tally, run) {
  const { model, plan, pick } = run;
  const verdict = judgeEvict(model, plan, pick(model, plan));
  tally.forced += 1;
  if (verdict.thrown) tally.thrown += 1;
  if (!verdict.best.safe) tally.blind += 1;
  clearSlot(model, verdict.mine.slot);
}
function playDrone(tally, run) {
  const { model, plan, drone } = run;
  const need = plan.target - drone.v;
  if (model.board[need] > 0) {
    takePartner(model, need);
    tally.pairs += 1;
    ageTags(model);
    return;
  }
  if (needsRoom(model, plan.spec, drone.v)) makeRoom(tally, run);
  ageTags(model);
  lightSlot(model, drone, plan.spec.ttl);
}
function playOut(stream, pick = oraclePick, spec = W3) {
  const model = newModel(spec);
  const tally = { forced: 0, thrown: 0, blind: 0, pairs: 0 };
  stream.forEach((value, index) => playDrone(tally, { model, plan: planAt(stream, spec, index + 1), pick, drone: { n: index + 1, v: value } }));
  return tally;
}
const forcedCache = new Map();
function forcedEvictions(stream) {
  const key = stream.join(',');
  if (!forcedCache.has(key)) forcedCache.set(key, playOut(stream).forced);
  return forcedCache.get(key);
}

export {
  NEVER, BAY_PLACE, litSlots, needsRoom, ageTags, planOf, planAt, newModel, takePartner, evictAdvice, judgeEvict, adviceClause, clearSlot, lightSlot, playOut, forcedEvictions,
};
