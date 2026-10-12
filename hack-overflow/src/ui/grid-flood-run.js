import { hasBeat,withBeat,withHeld } from '../game/ext/ops.js';
import { lockName } from '../game/messages.js';
import { FLOOD_TEXTS,createBit,floodSpec,planFlood,stepBit,tallyFlood } from '../game/power/flood.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight,uiLiveFoes } from './grid-actors.js';
import { uiCastSleep } from './grid-cast-act.js';
import { uiPowerOf,uiPowerRefresh,uiPowerSay } from './grid-power.js';
import { uiShowToast } from './grid-toast.js';
import { uiPayRank } from './rank-pay.js';

const TICK_MS = 200;
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
if (run.spawned >= floodSpec.bits) return;
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
if (app.game.fight) app.game.fight.actors = app.game.fight.actors.filter((actor) => !uiIsBit(actor));
uiPowerRefresh(app);
}
function uiHeld(app,run,result) {
const owed = !app.game.ext.rank.paid.includes(result.source);
uiCommitExt(app,withHeld(app.game.ext,run.key));
uiPowerSay(app,{ text:owed ? FLOOD_TEXTS.HELD :PLAIN_HELD_TEXT,kind:'reward' });
if (owed) uiPayRank(app,result.source,result.reward).catch(console.error);
}
function uiFinish(app,run) {
const killed = uiActorsOf(app.game).filter((actor) => uiIsBit(actor) && actor.hp <= 0).length;
uiClear(app,run);
const result = tallyFlood({ killed,rewrites:run.rewrites });
if (result.outcome === 'held') uiHeld(app,run,result);
else uiPowerSay(app,{ text:FLOOD_TEXTS.LOST(lockName(run.key)) });
}
function uiStandDown(app) {
const run = uiFloodOf(app.game);
if (!run || !run.live) return;
uiClear(app,run);
uiPowerSay(app,{ text:FLOOD_TEXTS.STAND_DOWN });
}
function uiAway(app) {
return app.screen !== 'grid' || Boolean(app.game.save.ended) || !app.game.fight;
}
function uiParked(app) {
return Boolean(app.story) || Boolean(app.game.travelOpen) || Boolean(app.menuOpen);
}
function uiTick(app,run) {
if (uiAway(app)) return uiClear(app,run);
if (uiParked(app)) return;
const before = run.elapsed;
run.elapsed += TICK_MS;
if (uiCrossed(before,run.elapsed,floodSpec.stepMs)) uiStepBits(app,run);
if (uiCrossed(before,run.elapsed,floodSpec.bitEveryMs)) uiSpawn(app,run);
if (run.elapsed >= floodSpec.durationMs || run.rewrites > floodSpec.hold) uiFinish(app,run);
}
async function uiClock(app,run) {
while (run.live) {
await uiCastSleep(app,TICK_MS);
if (run.live) uiTick(app,run);
}
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
const run = { live:true,key,plan,elapsed:0,spawned:0,rewrites:0 };
uiPowerOf(app.game).flood = run;
uiSpawn(app,run);
uiTell(app,run);
uiClock(app,run).catch(console.error);
return true;
}

export { uiFloodLive,uiFloodOf,uiRunFlood,uiStandDown };
