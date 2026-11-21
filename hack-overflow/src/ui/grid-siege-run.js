import { withBeat } from '../game/ext/ops.js';
import {
  SIEGE_SPEC,SIEGE_TOASTS,siegeBits,siegeHeldLine,siegePlan,siegeSpawnAt,siegeVerdict,
} from '../game/finale/siege.js';
import { clockEndHead } from '../game/power/event-text.js';
import { createBit,stepBit } from '../game/power/flood.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight,uiDefenceHeld,uiLiveFoes } from './grid-actors.js';
import { CLOCK_MS,uiCastClock } from './grid-cast-act.js';
import { uiFloodLive } from './grid-flood-run.js';
import { uiPowerRefresh,uiPowerSay } from './grid-power.js';
import { uiHangSiegeStrip } from './grid-siege-strip.js';
import { uiShowToast } from './grid-toast.js';
import { uiPayRank } from './rank-pay.js';

const TICK_MS = CLOCK_MS;
const BIT_PREFIX = 'siege-';

function uiSiegeOf(game) {
return game.siege && game.siege.gen === game.gen ? game.siege :null;
}
function uiIsMine(actor) {
return actor.kind === 'flood' && actor.id.startsWith(BIT_PREFIX);
}
function uiLiveMine(game) {
return uiLiveFoes(game).filter(uiIsMine);
}
function uiSiegeLive(app) {
const state = uiSiegeOf(app.game);
return Boolean(state && state.run && state.run.live);
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
if (run.spawned >= siegeBits() || run.elapsed < siegeSpawnAt(run.spawned)) return;
const cell = uiFreeSpawn(app.game,run);
if (!cell) return;
const fight = ensureFight(app.game);
fight.actors = [...fight.actors,createBit({ id:BIT_PREFIX + run.spawned,col:cell.col,row:cell.row })];
if (run.spawned === SIEGE_SPEC.perWave) uiPowerSay(app,{ text:SIEGE_TOASTS.wave });
run.spawned += 1;
uiPowerRefresh(app);
}
function uiStepBits(app,run) {
const fight = app.game.fight;
const steps = fight.actors.map((actor) => (uiIsMine(actor) && actor.hp > 0 ? stepBit(app.game.world,actor,run.plan.approach) :{ bit:actor,arrived:false }));
const arrived = steps.filter((step) => step.arrived).length;
fight.actors = steps.filter((step) => !step.arrived).map((step) => step.bit);
run.rewrites += arrived;
if (arrived > 0) uiPowerRefresh(app);
}
function uiClear(app,run) {
run.live = false;
if (app.game.fight) app.game.fight.actors = app.game.fight.actors.filter((actor) => !uiIsMine(actor));
uiPowerRefresh(app);
}
function uiHeld(app,verdict,head) {
uiCommitExt(app,withBeat(app.game.ext,SIEGE_SPEC.beat));
uiPowerSay(app,{ text:siegeHeldLine(app.game.ext),kind:'reward' });
uiShowToast(app,{ text:head + ' ' + SIEGE_TOASTS.held,kind:'reward' });
uiPayRank(app,verdict.source,verdict.reward).catch(console.error);
}
function uiEndHead(run) {
return clockEndHead(run.rewrites > SIEGE_SPEC.hold ? 'rewrites' :'spent',{ name:'Siege',rewrites:run.rewrites });
}
function uiFinish(app,run) {
uiClear(app,run);
const verdict = siegeVerdict(run.rewrites);
if (verdict.held) uiHeld(app,verdict,uiEndHead(run));
else uiPowerSay(app,{ text:uiEndHead(run) + ' ' + SIEGE_TOASTS.scribbled });
}
function uiSiegeStandDown(app) {
const state = uiSiegeOf(app.game);
if (!state || !state.run || !state.run.live) return;
uiClear(app,state.run);
uiPowerSay(app,{ text:SIEGE_TOASTS.standDown });
}
function uiSpent(app,run) {
return run.spawned >= siegeBits() && uiLiveMine(app.game).length === 0;
}
function uiTick(app,run) {
if (uiDefenceHeld(app,run,uiClear)) return;
const before = run.elapsed;
run.elapsed += TICK_MS;
if (uiCrossed(before,run.elapsed,SIEGE_SPEC.stepMs)) uiStepBits(app,run);
uiSpawn(app,run);
if (run.rewrites > SIEGE_SPEC.hold || uiSpent(app,run)) uiFinish(app,run);
}
function uiStartSiege(app) {
const state = uiSiegeOf(app.game);
const plan = siegePlan(app.game.world);
if (!state || uiSiegeLive(app) || uiFloodLive(app) || !plan || plan.spawns.length === 0) return false;
const run = { live:true,plan,elapsed:0,spawned:0,rewrites:0 };
state.run = run;
ensureFight(app.game);
uiHangSiegeStrip(app.game,{ live:uiSiegeLive,standDown:uiSiegeStandDown });
uiSpawn(app,run);
uiPowerSay(app,{ text:SIEGE_TOASTS.start });
uiCastClock(app,run,uiTick).catch(console.error);
return true;
}

export { uiSiegeLive,uiSiegeOf,uiSiegeStandDown,uiStartSiege };
