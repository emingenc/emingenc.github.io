import { withFind } from '../game/ext/ops.js';
import { trialsOf } from '../game/ext/power-ops.js';
import { cellToward } from '../game/move.js';
import { LANE,LANE_TEXT,applyLane,createLane } from '../game/power/lane.js';
import { SILL_APPROACH,SILL_CELL,inPocket } from '../game/power/lane-map.js';
import { usablePowers } from '../game/power/powers.js';
import { uiCommitExt } from './ext-storage.js';
import { uiAddChips,uiHooksOnce,uiPowerOf,uiPowerRefresh,uiPowerSay } from './grid-power.js';
import { uiLend,uiSpendTrial } from './grid-power-lend.js';
import { uiPaintLane } from './grid-power-lane-draw.js';
import { uiPayRank } from './rank-pay.js';

const POWER_ID = LANE.power;
const STAND_DOWN = { id:'lane-stand-down',label:'STAND DOWN',aria:'Stand down',tone:'warn' };
const DOCK = [
{ id:'lane-shrink',label:'SHRINK',aria:'Shrink the frame: drop its first shot',tone:'lane',move:'shrink' },
{ id:'lane-extend',label:'EXTEND',aria:'Extend the frame: take the next shot in',tone:'lane',move:'extend' },
{ id:'lane-catch',label:'CATCH',aria:'Catch: the frame holds the longest run',tone:'lane-catch',move:'catch' },
];

function uiLaneOf(app) {
const power = app.game.power;
return power && power.gen === app.game.gen && power.lane ? power.lane :null;
}
function uiUsable(game) {
return usablePowers(game.progress.won,game.ext).includes(POWER_ID);
}
function uiLaneInReach(app) {
return Boolean(uiLaneOf(app)) && app.screen === 'grid' && uiUsable(app.game) && inPocket(app.game.avatar.pos);
}
function uiOweTrial(app,lane) {
const left = trialsOf(app.game.ext,POWER_ID);
if (left > 1) uiSpendTrial(app,POWER_ID);
else lane.owes = left === 1;
}
function uiBegin(app,lane) {
Object.assign(lane,{ live:true,state:createLane() });
uiOweTrial(app,lane);
}
function uiFinish(app,lane) {
lane.live = false;
if (!lane.owes) return;
lane.owes = false;
uiSpendTrial(app,POWER_ID);
}
function uiBreakOff(app,lane) {
uiFinish(app,lane);
lane.state = createLane();
uiPowerRefresh(app);
}
function uiFound(app,lane) {
uiFinish(app,lane);
uiCommitExt(app,withFind(app.game.ext,LANE.find));
uiPayRank(app,LANE.source,LANE.reward).catch(console.error);
}
function uiLanePress(app,move) {
if (!uiLaneInReach(app)) return;
const lane = uiLaneOf(app);
if (!lane.live) uiBegin(app,lane);
const result = applyLane(lane.state,move);
lane.state = result.state;
uiPowerSay(app,{ text:result.note,kind:result.kind === 'found' ? 'reward' :'info' });
if (result.kind === 'found') uiFound(app,lane);
uiPowerRefresh(app);
}
function uiStandDown(app) {
const lane = uiLaneOf(app);
if (!lane) return;
uiPowerSay(app,{ text:LANE_TEXT.stand });
uiBreakOff(app,lane);
}
function uiLaneChips(app) {
if (!uiLaneInReach(app)) return [];
const dock = DOCK.map((chip) => ({ ...chip,run:() => uiLanePress(app,chip.move) }));
return uiLaneOf(app).live ? [...dock,{ ...STAND_DOWN,run:uiStandDown }] :dock;
}
function uiShowNet(app) {
const power = uiPowerOf(app.game);
if (power.modes[POWER_ID]) Object.assign(power,{ mode:POWER_ID,aim:false,pick:null });
uiPowerRefresh(app);
}
async function uiTalk(app,lane) {
if (lane.talking) return;
lane.talking = true;
try {
const lent = await uiLend(app,{ ally:LANE.ally,power:POWER_ID,lines:LANE_TEXT });
if (lent && uiLaneOf(app) === lane) uiShowNet(app);
} finally {
lane.talking = false;
}
}
function uiSillBumped(game) {
const here = game.avatar.pos;
const faced = cellToward(here,game.avatar.facing);
return here.col === SILL_APPROACH.col && here.row === SILL_APPROACH.row && faced.col === SILL_CELL.col && faced.row === SILL_CELL.row;
}
function uiOnBump(info) {
const app = info.app;
const lane = uiLaneOf(app);
if (!lane || app.screen !== 'grid' || (info.event && info.event.prop) || !uiSillBumped(app.game)) return;
uiTalk(app,lane).catch(console.error);
}
function uiOnEnterCell(info) {
const app = info.app;
const lane = uiLaneOf(app);
if (!lane) return;
if (inPocket(info.pos) && !inPocket(info.from)) uiPowerSay(app,{ text:uiUsable(app.game) ? LANE_TEXT.start :LANE_TEXT.locked });
else if (!inPocket(info.pos) && inPocket(info.from)) uiBreakOff(app,lane);
}
const uiHook = uiHooksOnce({ bump:uiOnBump,'enter-cell':uiOnEnterCell });
function uiPaintScene(ctx,app,frame) {
const lane = uiLaneOf(app);
if (lane) uiPaintLane(ctx,frame,uiUsable(app.game) ? lane.state :null);
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isLane) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiPaintScene(ctx,app,frame);
};
paint.isLane = true;
game.drawCast = paint;
}
function uiInstallLane(app) {
const game = app.game;
if (!game.cast || game.cast.inert) return;
uiPowerOf(game).lane = { state:createLane(),live:false,owes:false,talking:false };
uiAddChips(game,uiLaneChips);
uiWrapPaint(game);
uiHook();
}

export { uiInstallLane,uiLaneInReach,uiLanePress };
