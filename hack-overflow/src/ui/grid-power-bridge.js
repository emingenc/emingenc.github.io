import { BOLT_RANGE,DRONE_ARM,createDrone } from '../game/actors.js';
import { hasBeat,hasFind,withFind } from '../game/ext/ops.js';
import { trialsOf } from '../game/ext/power-ops.js';
import { cellToward } from '../game/move.js';
import { BRIDGE,applyBridge,bridgeStandDown,createBridge } from '../game/power/bridge.js';
import { MIRROR,createMirror,mirrorPairs,mirrorText,pairLabel,revealPair } from '../game/power/mirror.js';
import { usablePowers } from '../game/power/powers.js';
import { uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { ensureFight,uiActorsTick } from './grid-actors.js';
import { uiAddChips,uiPowerOf,uiPowerRefresh } from './grid-power.js';
import { uiLend,uiSpendTrial } from './grid-power-lend.js';
import { uiPaintHall } from './grid-power-pincer-draw.js';
import { uiShowToast } from './grid-toast.js';
import { uiPayRank } from './rank-pay.js';

const POWER_ID = 'pincer';
const SIGN_NEAR = 3;
const TWIN_LINES = {
lend:['Take three trials of the cannons. I will lend them.','3 PINCER trials lent.'],
again:['Out already? Here are three more.','3 PINCER trials lent.'],
owned:'You already hold the cannons.',
};
const STAND_DOWN = { id:'bridge-stand-down',label:'STAND DOWN',aria:'Stand down',tone:'warn' };
const DOCK = [
{ id:'bridge-l',label:'L>',aria:'Move the left pointer right',tone:'dock',move:'l' },
{ id:'bridge-fire',label:'FIRE',aria:'Fire at the sum',tone:'dock-fire',move:'fire' },
{ id:'bridge-r',label:'<R',aria:'Move the right pointer left',tone:'dock',move:'r' },
];
let uiHooked = false;

function uiBridgeOf(app) {
const power = app.game.power;
return power && power.gen === app.game.gen && power.bridge ? power.bridge :null;
}
function uiUsable(game) {
return usablePowers(game.progress.won,game.ext).includes(POWER_ID);
}
function uiSay(app,toast) {
if (toast.text) uiShowToast(app,{ kind:'info',replace:true,...toast });
}
function uiReach(cell,pos) {
return Math.max(Math.abs(cell.col - pos.col),Math.abs(cell.row - pos.row));
}
function uiNearDrone(game) {
const here = game.avatar.pos;
return here.row >= BRIDGE.hall.top && here.row <= BRIDGE.hall.bottom && uiReach(BRIDGE.drone,here) <= BOLT_RANGE;
}
function uiBridgeInReach(app) {
const bridge = uiBridgeOf(app);
return Boolean(bridge) && app.screen === 'grid' && uiUsable(app.game) && (bridge.live || uiNearDrone(app.game));
}
function uiRemoveDrone(game) {
if (!game.fight) return;
game.fight.actors = game.fight.actors.filter((actor) => actor.id !== BRIDGE.droneId || actor.hp <= 0);
}
function uiOweTrial(app,bridge) {
const left = trialsOf(app.game.ext,POWER_ID);
if (left > 1) uiSpendTrial(app,POWER_ID);
else bridge.owes = left === 1;
}
function uiBegin(app,bridge) {
const fight = ensureFight(app.game);
fight.actors = [...fight.actors.filter((actor) => actor.id !== BRIDGE.droneId),createDrone({ id:BRIDGE.droneId,...BRIDGE.drone })];
Object.assign(bridge,{ live:true,state:createBridge(),revives:fight.revives || 0 });
uiOweTrial(app,bridge);
if (hasBeat(app.game.ext,'ordeal')) import('./finale-offer.js').then((module) => module.uiGhostOffer(app,{ kind:'bridge',once:'hint-bridge' })).catch(console.error);
}
function uiEnd(app,bridge) {
Object.assign(bridge,{ live:false,state:createBridge() });
if (!bridge.owes) return;
bridge.owes = false;
uiSpendTrial(app,POWER_ID);
}
function uiWin(app,bridge) {
const game = app.game;
game.fight.actors = game.fight.actors.map((actor) => (actor.id === BRIDGE.droneId ? { ...actor,hp:0 } :actor));
uiEnd(app,bridge);
uiPayRank(app,BRIDGE.source,BRIDGE.reward).catch(console.error);
}
function uiSafeTick(app) {
const fight = app.game.fight;
fight.actors = fight.actors.map((actor) => (actor.id === BRIDGE.droneId ? { ...actor,arm:DRONE_ARM } :actor));
uiActorsTick(app);
}
function uiBridgePress(app,move) {
const bridge = uiBridgeOf(app);
if (!bridge) return;
if (!bridge.live) uiBegin(app,bridge);
const result = applyBridge(bridge.state,move);
bridge.state = result.state;
uiSay(app,{ text:result.note,kind:result.kind === 'win' ? 'reward' :'info' });
if (result.kind === 'win') uiWin(app,bridge);
uiSafeTick(app);
uiPowerRefresh(app);
}
function uiBreakOff(app,bridge) {
uiRemoveDrone(app.game);
uiEnd(app,bridge);
uiPowerRefresh(app);
}
function uiOnTick(info) {
const bridge = uiBridgeOf(info.app);
if (!bridge || !bridge.live) return;
const fight = info.app.game.fight;
const drone = fight && fight.actors.find((actor) => actor.id === BRIDGE.droneId);
if (!drone || drone.hp <= 0 || (fight.revives || 0) > bridge.revives) uiBreakOff(info.app,bridge);
}
function uiStandDown(app) {
const bridge = uiBridgeOf(app);
if (!bridge) return;
const text = bridge.live ? bridgeStandDown() :mirrorText().stand;
if (bridge.live) uiBreakOff(app,bridge);
bridge.sign = { state:createMirror(),open:false };
uiSay(app,{ text });
uiPowerRefresh(app);
}
function uiMirrorSeam(app,kind) {
import('./quest-mirror.js').then((module) => module.uiMirrorQuest(app,kind)).catch(console.error);
}
function uiPair(app,index) {
const bridge = uiBridgeOf(app);
if (!bridge || !bridge.sign.open) return;
const result = revealPair(bridge.sign.state,index);
bridge.sign.state = result.state;
uiSay(app,{ text:result.note,kind:result.kind === 'mismatch' ? 'reward' :'info' });
if (result.kind === 'mismatch') {
bridge.sign.open = false;
uiCommitExt(app,withFind(app.game.ext,MIRROR.find));
}
uiMirrorSeam(app,result.kind);
uiPowerRefresh(app);
}
function uiDockChips(app,bridge) {
if (!bridge.live && !uiNearDrone(app.game)) return [];
return DOCK.map((chip) => ({ ...chip,run:() => uiBridgePress(app,chip.move) }));
}
function uiPairChips(app,bridge) {
if (!bridge.sign.open) return [];
const state = bridge.sign.state;
return mirrorPairs(MIRROR.plates).map((pair,index) => ({
id:'pair-' + index,label:pairLabel(state,index),aria:'Pair ' + (index + 1) + ': ' + pairLabel(state,index),
tone:'pair',selected:index < state.shown,run:() => uiPair(app,index),
}));
}
function uiHallChips(app) {
const bridge = uiBridgeOf(app);
if (!bridge || !uiUsable(app.game)) return [];
const stand = bridge.live || bridge.sign.open ? [{ ...STAND_DOWN,run:uiStandDown }] :[];
return [...uiDockChips(app,bridge),...uiPairChips(app,bridge),...stand];
}
function uiShowPincer(app) {
const power = uiPowerOf(app.game);
if (power.modes[POWER_ID]) Object.assign(power,{ mode:POWER_ID,aim:false,pick:null });
uiPowerRefresh(app);
}
async function uiTalk(app,bridge) {
if (bridge.talking) return;
bridge.talking = true;
try {
const lent = await uiLend(app,{ ally:'twins',power:POWER_ID,lines:TWIN_LINES });
if (lent && uiBridgeOf(app) === bridge) uiShowPincer(app);
} finally {
bridge.talking = false;
}
}
function uiSignBumped(game) {
const here = game.avatar.pos;
const faced = cellToward(here,game.avatar.facing);
return here.col === MIRROR.from.col && here.row === MIRROR.from.row && faced.col === MIRROR.cell.col && faced.row === MIRROR.cell.row;
}
function uiReadSign(app,bridge) {
const game = app.game;
if (!uiSignBumped(game)) return;
const text = mirrorText();
if (hasFind(game.ext,MIRROR.find)) uiSay(app,{ text:text.solved });
else if (!uiUsable(game)) uiSay(app,{ text:text.locked });
else {
if (!bridge.sign.open) bridge.sign = { state:createMirror(),open:true };
uiSay(app,{ text:text.start });
uiMirrorSeam(app,'open');
}
uiPowerRefresh(app);
}
function uiTwinBumped(game) {
const faced = cellToward(game.avatar.pos,game.avatar.facing);
return BRIDGE.twins.some((twin) => twin.col === faced.col && twin.row === faced.row);
}
function uiOnBump(info) {
const app = info.app;
const bridge = uiBridgeOf(app);
if (!bridge || app.screen !== 'grid' || (info.event && info.event.prop)) return;
if (uiTwinBumped(app.game)) uiTalk(app,bridge).catch(console.error);
else uiReadSign(app,bridge);
}
function uiOnEnterCell(info) {
const bridge = uiBridgeOf(info.app);
if (!bridge || !bridge.sign.open || uiReach(MIRROR.from,info.pos) <= SIGN_NEAR) return;
bridge.sign = { state:createMirror(),open:false };
uiPowerRefresh(info.app);
}
function uiHook() {
if (uiHooked) return;
uiHooked = true;
uiGridHook('bump',uiOnBump);
uiGridHook('tick',uiOnTick);
uiGridHook('enter-cell',uiOnEnterCell);
}
function uiPaintBridge(ctx,app,frame) {
const bridge = uiBridgeOf(app);
if (!bridge) return;
uiPaintHall(ctx,frame,uiUsable(app.game) ? bridge.state :null);
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isBridge) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiPaintBridge(ctx,app,frame);
};
paint.isBridge = true;
game.drawCast = paint;
}
function uiInstallBridge(app) {
const game = app.game;
if (!game.cast || game.cast.inert) return;
uiPowerOf(game).bridge = { state:createBridge(),live:false,owes:false,talking:false,revives:0,sign:{ state:createMirror(),open:false } };
if (game.fight) game.fight.actors = game.fight.actors.filter((actor) => actor.id !== BRIDGE.droneId);
uiAddChips(game,uiHallChips);
uiWrapPaint(game);
uiHook();
}

export { uiBridgeInReach,uiBridgePress,uiInstallBridge };
