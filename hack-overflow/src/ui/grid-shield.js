import { DRONE_ARM,createDrone } from '../game/actors.js';
import { trialsOf } from '../game/ext/power-ops.js';
import { applyBridge,createBridge } from '../game/power/bridge.js';
import { isSealed,lockerById,lockersFor } from '../game/power/lockers.js';
import { usablePowers } from '../game/power/powers.js';
import { LANE_TEXT,puzzleFor } from '../game/power/shield-lane.js';
import { uiGridHook } from './bus.js';
import { ensureFight,uiActorsTick } from './grid-actors.js';
import { uiGuardDown } from './grid-locker.js';
import { uiAddChips,uiPowerOf,uiPowerRefresh,uiPowerSay as uiSay } from './grid-power.js';
import { uiBridgeInReach } from './grid-power-bridge.js';
import { uiSpendTrial } from './grid-power-lend.js';
import { uiPaintShields } from './grid-shield-draw.js';
import { uiShotCells } from './shot-fx.js';

const POWER_ID = 'pincer';
const SPAWN_NEAR = 5;
const DROP_FAR = 9;
const CHIP_NEAR = 5;
const ID_PREFIX = 'shield-';
const STAND_DOWN = { id:'shield-stand-down',label:'STAND DOWN',aria:'Stand down the shield drone',tone:'warn' };
const DOCK = [
{ id:'shield-l',label:'L>',aria:'Move the left pointer right',tone:'dock',move:'l' },
{ id:'shield-fire',label:'FIRE',aria:'Fire at the sum',tone:'dock-fire',move:'fire' },
{ id:'shield-r',label:'<R',aria:'Move the right pointer left',tone:'dock',move:'r' },
];
const FIRE_LABEL = { text:'FIRE',aria:'Fire at the sum' };

function uiShieldOf(app) {
const power = app.game.power;
return power && power.gen === app.game.gen && power.shield ? power.shield :null;
}
function uiUsable(game) {
return usablePowers(game.progress.won,game.ext).includes(POWER_ID);
}
function uiReach(cell,pos) {
return Math.max(Math.abs(cell.col - pos.col),Math.abs(cell.row - pos.row));
}
function uiDroneId(lockerId) {
return ID_PREFIX + lockerId;
}
function uiRemoveDrone(game,lockerId) {
if (!game.fight) return;
game.fight.actors = game.fight.actors.filter((actor) => actor.id !== uiDroneId(lockerId) || actor.hp <= 0);
}
function uiOweTrial(app,shield) {
const left = trialsOf(app.game.ext,POWER_ID);
if (left > 1) uiSpendTrial(app,POWER_ID);
else shield.owes = left === 1;
}
function uiBegin(app,shield,locker) {
const fight = ensureFight(app.game);
const id = uiDroneId(locker.id);
fight.actors = [...fight.actors.filter((actor) => actor.id !== id),{ ...createDrone({ id,...locker.drone }),harmless:true }];
Object.assign(shield,{ live:locker.id,state:createBridge(puzzleFor(locker.id)),revives:fight.revives || 0 });
uiOweTrial(app,shield);
}
function uiEnd(app,shield) {
Object.assign(shield,{ live:'',state:null });
if (!shield.owes) return;
shield.owes = false;
uiSpendTrial(app,POWER_ID);
}
function uiBreakOff(app,shield) {
uiRemoveDrone(app.game,shield.live);
uiEnd(app,shield);
}
function uiDismiss(shield,lockerId) {
shield.here.delete(lockerId);
shield.stood.add(lockerId);
}
function uiGone(game,locker) {
return !uiUsable(game) || !isSealed(game.ext,locker.id) || uiReach(locker,game.avatar.pos) > DROP_FAR;
}
function uiSettle(app,shield,locker) {
const id = locker.id;
if (uiReach(locker,app.game.avatar.pos) > DROP_FAR || !isSealed(app.game.ext,id)) shield.stood.delete(id);
if (uiGone(app.game,locker)) {
if (shield.here.delete(id) && shield.live === id) uiBreakOff(app,shield);
return false;
}
if (uiReach(locker,app.game.avatar.pos) > SPAWN_NEAR || shield.stood.has(id) || shield.here.has(id)) return false;
shield.here.add(id);
return true;
}
function uiArrivals(app,shield) {
return lockersFor(POWER_ID).map((id) => lockerById(id)).filter((locker) => uiSettle(app,shield,locker));
}
function uiStanding(app,shield) {
uiArrivals(app,shield);
return lockersFor(POWER_ID).filter((id) => shield.here.has(id));
}
function uiNearest(app,shield) {
const here = app.game.avatar.pos;
const near = uiStanding(app,shield).map((id) => lockerById(id)).filter((locker) => uiReach(locker.drone,here) <= CHIP_NEAR);
return near.reduce((best,locker) => (!best || uiReach(locker.drone,here) < uiReach(best.drone,here) ? locker :best),null);
}
function uiShieldInReach(app) {
const shield = uiShieldOf(app);
return Boolean(shield) && app.screen === 'grid' && !uiBridgeInReach(app) && uiNearest(app,shield) !== null;
}
function uiWin(app,shield,locker) {
const id = uiDroneId(locker.id);
app.game.fight.actors = app.game.fight.actors.map((actor) => (actor.id === id ? { ...actor,hp:0 } :actor));
uiEnd(app,shield);
uiDismiss(shield,locker.id);
uiGuardDown(app,locker.id).catch(console.error);
}
function uiSafeTick(app,lockerId) {
const fight = app.game.fight;
const id = uiDroneId(lockerId);
fight.actors = fight.actors.map((actor) => (actor.id === id ? { ...actor,arm:DRONE_ARM } :actor));
uiActorsTick(app);
}
function uiShieldPress(app,move) {
const shield = uiShieldOf(app);
const locker = shield && uiNearest(app,shield);
if (!locker || uiBridgeInReach(app)) return;
if (shield.live && shield.live !== locker.id) uiBreakOff(app,shield);
if (!shield.live) uiBegin(app,shield,locker);
const result = applyBridge(shield.state,move,puzzleFor(locker.id));
shield.state = result.state;
if (move === 'fire' && result.kind !== 'none') uiShotCells(app.game.avatar.pos,locker.drone,{ hit:result.kind === 'win',kill:result.kind === 'win',heavy:false });
uiSay(app,{ text:result.note,kind:result.kind === 'win' ? 'reward' :'info' });
if (result.kind === 'win') uiWin(app,shield,locker);
uiSafeTick(app,locker.id);
uiPowerRefresh(app);
}
function uiStandDown(app) {
const shield = uiShieldOf(app);
const locker = shield && uiNearest(app,shield);
if (!locker) return;
if (shield.live) {
const live = shield.live;
uiBreakOff(app,shield);
uiDismiss(shield,live);
}
uiDismiss(shield,locker.id);
uiSay(app,{ text:LANE_TEXT.stand });
uiPowerRefresh(app);
}
function uiDisarm(game) {
if (!game.fight) return;
game.fight.actors = game.fight.actors.map((actor) => (actor.id.startsWith(ID_PREFIX) && actor.hp > 0 && actor.arm < 2 ? { ...actor,arm:DRONE_ARM } :actor));
}
function uiOnTick(info) {
uiDisarm(info.app.game);
const shield = uiShieldOf(info.app);
if (!shield || !shield.live) return;
const fight = info.app.game.fight;
const drone = fight && fight.actors.find((actor) => actor.id === uiDroneId(shield.live));
if (!drone || drone.hp <= 0 || (fight.revives || 0) > shield.revives) {
uiBreakOff(info.app,shield);
uiPowerRefresh(info.app);
}
}
function uiOnEnterCell(info) {
const app = info.app;
const shield = uiShieldOf(app);
if (!shield || app.screen !== 'grid') return;
const before = [...shield.here].join();
const arrived = uiArrivals(app,shield).filter((locker) => !shield.told.has(locker.id));
arrived.forEach((locker) => shield.told.add(locker.id));
if (arrived.length > 0) uiSay(app,{ text:LANE_TEXT.start });
if ([...shield.here].join() !== before) uiPowerRefresh(app);
}
function uiWrapMode(mode) {
if (mode.isShield) return mode;
const inner = mode.aimLabel || (() => '');
return {
...mode,isShield:true,
aimLabel:(app) => inner(app) || (uiShieldInReach(app) ? FIRE_LABEL :''),
fire:(app,dmg) => {
if (inner(app) || !uiShieldInReach(app)) return mode.fire(app,dmg);
uiShieldPress(app,'fire');
return true;
},
};
}
function uiHookMode(app) {
const modes = uiPowerOf(app.game).modes;
if (modes.pincer) modes.pincer = uiWrapMode(modes.pincer);
}
function uiShieldChips(app) {
uiHookMode(app);
const shield = uiShieldOf(app);
if (!shield || uiBridgeInReach(app) || !uiNearest(app,shield)) return [];
return [...DOCK.map((chip) => ({ ...chip,run:() => uiShieldPress(app,chip.move) })),{ ...STAND_DOWN,run:uiStandDown }];
}
function uiDroneView(locker,shield) {
return { lane:locker.lane,drone:locker.drone,live:shield.live === locker.id };
}
function uiReadoutOf(shield,locker) {
const puzzle = puzzleFor(locker.id);
const pointers = shield.live === locker.id ? shield.state :createBridge(puzzle);
return { plates:puzzle.plates,target:puzzle.target,l:pointers.l,r:pointers.r };
}
function uiShieldView(app,shield) {
const near = uiNearest(app,shield);
return {
drones:uiStanding(app,shield).map((id) => uiDroneView(lockerById(id),shield)),
readout:near ? uiReadoutOf(shield,near) :null,
};
}
function uiPaintShield(ctx,app,frame) {
const shield = uiShieldOf(app);
if (shield && uiUsable(app.game)) uiPaintShields(ctx,frame,uiShieldView(app,shield));
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isShield) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiPaintShield(ctx,app,frame);
};
paint.isShield = true;
game.drawCast = paint;
}
let uiHooked = false;
function uiHook() {
if (uiHooked) return;
uiHooked = true;
uiGridHook('tick',uiOnTick);
uiGridHook('enter-cell',uiOnEnterCell);
}
function uiInstallShield(app) {
const game = app.game;
if (!game.cast || game.cast.inert || uiShieldOf(app)) return;
uiPowerOf(game).shield = { here:new Set(),stood:new Set(),told:new Set(),live:'',state:null,owes:false,revives:0 };
if (game.fight) game.fight.actors = game.fight.actors.filter((actor) => !actor.id.startsWith(ID_PREFIX));
uiAddChips(game,uiShieldChips);
uiWrapPaint(game);
uiHook();
}

export { uiInstallShield,uiShieldInReach,uiShieldPress };
