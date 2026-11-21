import { hasBeat,withBeat,withHeld } from '../game/ext/ops.js';
import { lockName } from '../game/messages.js';
import { clockEndHead } from '../game/power/event-text.js';
import { FLOOD_TEXTS,createBit,floodOffer,floodSpec,floodSpecFor,planFlood,stepBit,tallyFlood } from '../game/power/flood.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight,uiDefenceHeld,uiLiveFoes,uiTimeHeld } from './grid-actors.js';
import { CLOCK_MS,uiCastClock,uiCastSleep } from './grid-cast-act.js';
import { uiPowerOf,uiPowerRefresh,uiPowerSay } from './grid-power.js';
import { uiShowToast } from './grid-toast.js';
import { uiPayRank } from './rank-pay.js';

const TICK_MS = CLOCK_MS;
const MS_PER_SECOND = 1000;
const BIT_KIND = 'flood';
const BIT_PREFIX = 'flood-';
const INTRO_TEXT = 'ROOT: Every lock you close, I try to rewrite. Shoot my bits.';
const PLAIN_HELD_TEXT = FLOOD_TEXTS.HELD.replace(' +' + floodSpec.reward + ' R.','');

function uiActorsOf(game) {
return game.fight ? game.fight.actors :[];
}
function uiIsBit(actor) {
return actor.kind === BIT_KIND;
}
function uiIsLiveBit(actor) {
return uiIsBit(actor) && actor.hp > 0;
}
function uiFloodOf(game) {
return game.power && game.power.gen === game.gen && game.power.flood ? game.power.flood :null;
}
function uiFloodLive(app) {
const run = uiFloodOf(app.game);
return Boolean(run) && run.live;
}
function uiFloodOffered(app) {
const run = uiFloodOf(app.game);
return Boolean(run) && Boolean(run.offer);
}
function uiFloodBusy(app) {
return uiFloodLive(app) || uiFloodOffered(app);
}
function uiGap(one,other) {
return Math.abs(one.col - other.col) + Math.abs(one.row - other.row);
}
function uiFloodRing(app) {
const run = uiFloodOf(app.game);
if (!run || !run.live || !(run.freeze > 0)) return null;
const pos = app.game.avatar.pos;
const bits = uiLiveFoes(app.game).filter(uiIsBit);
return bits.length > 0 ? bits.reduce((best,bit) => (uiGap(bit,pos) < uiGap(best,pos) ? bit :best)) :null;
}
function uiObjective(app) {
const run = uiFloodOf(app.game);
if (!run || !(run.live || run.offer)) return null;
const name = lockName(run.key);
return { text:run.offer ? FLOOD_TEXTS.OFFER(name) :FLOOD_TEXTS.RULE(name),targetId:null };
}
function uiLineUnder(app) {
const line = app.game.objectiveOverride;
return line === uiObjective ? uiFloodOf(app.game)?.under || null :line || null;
}
function uiDropObjective(app,run) {
if (app.game.objectiveOverride === uiObjective) app.game.objectiveOverride = run.under || null;
}
function uiCrossed(before,after,every) {
return Math.floor(after / every) > Math.floor(before / every);
}
function uiOccupied(game,cell) {
return uiLiveFoes(game).some((foe) => foe.col === cell.col && foe.row === cell.row);
}
function uiFreeSpawn(game,run) {
const spawns = run.plan.spawns;
return spawns.map((_,at) => spawns[(run.spawned + at) % spawns.length]).find((cell) => !uiOccupied(game,cell));
}
function uiSpawn(app,run) {
if (run.spawned >= run.spec.bits) return;
const fight = ensureFight(app.game);
const cell = uiFreeSpawn(app.game,run);
if (!cell) return;
fight.actors = [...fight.actors,createBit({ id:BIT_PREFIX + run.spawned,col:cell.col,row:cell.row })];
run.spawned += 1;
uiPowerRefresh(app);
}
function uiStepBits(app,run) {
const fight = app.game.fight;
const steps = fight.actors.map((actor) => (uiIsLiveBit(actor) ? stepBit(app.game.world,actor,run.plan.approach) :{ bit:actor,arrived:false }));
const arrived = steps.filter((step) => step.arrived).length;
fight.actors = steps.filter((step) => !step.arrived).map((step) => step.bit);
run.rewrites += arrived;
if (arrived > 0) uiPowerRefresh(app);
}
function uiClear(app,run) {
run.live = false;
uiDropObjective(app,run);
if (app.game.fight) app.game.fight.actors = app.game.fight.actors.filter((actor) => !uiIsBit(actor));
uiPowerRefresh(app);
}
function uiHeld(app,run,result) {
const owed = !app.game.ext.rank.paid.includes(result.source);
uiCommitExt(app,withHeld(app.game.ext,run.key));
uiPowerSay(app,{ text:uiEndHead(run) + ' ' + (owed ? FLOOD_TEXTS.HELD :PLAIN_HELD_TEXT),kind:'reward' });
if (owed) uiPayRank(app,result.source,result.reward).catch(console.error);
}
function uiEndHead(run) {
const cause = run.rewrites > run.spec.hold ? 'rewrites' :run.elapsed >= run.spec.durationMs ? 'time' :'spent';
return clockEndHead(cause,{ name:'Flood',seconds:run.spec.durationMs / MS_PER_SECOND,rewrites:run.rewrites });
}
function uiFinish(app,run) {
const killed = uiActorsOf(app.game).filter((actor) => uiIsBit(actor) && actor.hp <= 0).length;
uiClear(app,run);
const result = tallyFlood({ killed,rewrites:run.rewrites });
if (result.outcome === 'held') uiHeld(app,run,result);
else uiPowerSay(app,{ text:uiEndHead(run) + ' ' + FLOOD_TEXTS.LOST(lockName(run.key)) });
}
function uiStandDown(app) {
const run = uiFloodOf(app.game);
if (!run || !run.live) return;
uiClear(app,run);
uiPowerSay(app,{ text:FLOOD_TEXTS.STAND_DOWN });
}
function uiGone(app) {
return app.screen !== 'grid' || Boolean(app.game.save.ended);
}
function uiSpent(app,run) {
return run.tutorial && run.spawned >= run.spec.bits && !uiLiveFoes(app.game).some(uiIsBit);
}
function uiTick(app,run) {
if (uiDefenceHeld(app,run,uiClear)) return;
if (run.freeze > 0) {
run.freeze -= TICK_MS;
return;
}
const before = run.elapsed;
run.elapsed += TICK_MS;
if (uiCrossed(before,run.elapsed,run.spec.stepMs)) uiStepBits(app,run);
if (uiCrossed(before,run.elapsed,run.spec.bitEveryMs)) uiSpawn(app,run);
if (run.elapsed >= run.spec.durationMs || run.rewrites > run.spec.hold || uiSpent(app,run)) uiFinish(app,run);
}
function uiTell(app,run) {
uiPowerSay(app,{ text:FLOOD_TEXTS.START(lockName(run.key)) });
if (hasBeat(app.game.ext,floodSpec.beat)) return;
uiCommitExt(app,withBeat(app.game.ext,floodSpec.beat));
uiShowToast(app,{ text:INTRO_TEXT,kind:'info' });
}
function uiRunFlood(app,key) {
const plan = planFlood(app.game.world,key);
if (!plan || plan.spawns.length === 0) return false;
const spec = floodSpecFor(hasBeat(app.game.ext,floodSpec.beat));
const run = { live:true,offer:false,key,plan,spec,tutorial:spec !== floodSpec,freeze:spec.freezeMs || 0,elapsed:0,spawned:0,rewrites:0,under:uiLineUnder(app) };
uiPowerOf(app.game).flood = run;
app.game.objectiveOverride = uiObjective;
uiSpawn(app,run);
uiTell(app,run);
uiCastClock(app,run,uiTick).catch(console.error);
return true;
}

function uiCloseOffer(app,run) {
run.offer = false;
uiDropObjective(app,run);
uiPowerRefresh(app);
}
function uiLetIt(app) {
const run = uiFloodOf(app.game);
if (!run || !run.offer) return;
uiCloseOffer(app,run);
uiPowerSay(app,{ text:FLOOD_TEXTS.LOST(lockName(run.key)) });
}
function uiHold(app) {
const run = uiFloodOf(app.game);
if (!run || !run.offer) return;
run.offer = false;
if (!uiRunFlood(app,run.key)) uiCloseOffer(app,run);
}
function uiOfferTick(app,run) {
if (uiGone(app)) return uiCloseOffer(app,run);
if (uiTimeHeld(app)) return;
run.left -= TICK_MS;
if (run.left <= 0) uiLetIt(app);
}
async function uiOfferClock(app,run) {
while (run.offer) {
await uiCastSleep(app,TICK_MS);
if (run.offer) uiOfferTick(app,run);
}
}
function uiOfferFlood(app,key) {
const plan = planFlood(app.game.world,key);
if (!plan || plan.spawns.length === 0) return false;
const run = { live:false,offer:true,key,plan,left:floodOffer.waitMs,elapsed:0,spawned:0,rewrites:0,under:uiLineUnder(app) };
uiPowerOf(app.game).flood = run;
app.game.objectiveOverride = uiObjective;
uiPowerRefresh(app);
uiOfferClock(app,run).catch(console.error);
return true;
}

export { uiFloodBusy,uiFloodLive,uiFloodOf,uiFloodOffered,uiFloodRing,uiHold,uiLetIt,uiOfferFlood,uiRunFlood,uiStandDown };
