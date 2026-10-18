import {
BEATS,CORRIDOR,DOORS,FIND,NO_DOOR,REWARD,SIGN,TOASTS,createOracle,doorAt,doorTell,hasEarned,inNear,inPocket,openDoor,
} from '../game/cast/oracle.js';
import { withBeat,withFind } from '../game/ext/ops.js';
import { cellToward } from '../game/move.js';
import { tapIntent } from '../game/tap.js';
import { cellAt } from '../game/world.js';
import { uiGridEmit,uiGridHook } from './bus.js';
import { uiCommitExt } from './ext-storage.js';
import { uiCastCarry } from './grid-cast-act.js';
import { uiAddTap } from './grid-power.js';
import { uiShowToast } from './grid-toast.js';
import { uiWalkPath } from './grid-walk.js';

const TAP_TOAST = ' Tap a door to go to it.';
let uiHooked = false;

function uiOraclePaint(game,hero) {
if (game.oracle.paint || !inNear(hero)) return;
game.oracle.paint = true;
import('./grid-oracle-draw.js').then(function (draw) { game.drawOracle = draw.uiDrawOracle; }).catch(function () { game.oracle.paint = false; });
}
async function uiOracleReward(app) {
if (hasEarned(app.game.ext)) return;
const { uiPayRank } = await import('./rank-pay.js');
await uiPayRank(app,REWARD.source,REWARD.rank);
if (hasEarned(app.game.ext)) return;
uiCommitExt(app,withFind(withBeat(app.game.ext,BEATS.lock),FIND.id));
uiShowToast(app,{ text:REWARD.toast,kind:'reward' });
}
function uiOracleSay(app,index,result) {
const tell = doorTell(app.game.ext,index,result);
if (tell.beat) uiCommitExt(app,withBeat(app.game.ext,tell.beat));
uiShowToast(app,{ text:tell.text,kind:'info',replace:true });
}
function uiOracleOpen(app,index) {
const oracle = app.game.oracle;
const result = openDoor(oracle.state,index);
if (!result.moved) return;
oracle.state = result.state;
uiOracleSay(app,index,result);
if (result.lock) uiOracleReward(app).catch(console.error);
}
function uiOraclePlace(app,hero) {
const oracle = app.game.oracle;
if (!inPocket(hero)) {
if (oracle.state.opened.length > 0) oracle.state = createOracle();
return;
}
const index = doorAt(hero);
if (index !== NO_DOOR) uiOracleOpen(app,index);
}
function uiOracleSync(app) {
const game = app.game;
if (!game.oracle || game.oracle.inert) return;
const hero = game.avatar.pos;
uiOraclePaint(game,hero);
uiOraclePlace(app,hero);
}
function uiInCorridor(cell) {
return cell.col >= CORRIDOR.minCol && cell.col <= CORRIDOR.maxCol && cell.row >= CORRIDOR.minRow && cell.row <= CORRIDOR.maxRow;
}
function uiWalkToCorridor(app) {
const game = app.game;
const cell = { col:CORRIDOR.minCol,row:CORRIDOR.minRow };
const intent = tapIntent(game.world,game.progress,{ from:game.avatar.pos,cell,avoid:game.tapAvoid ? game.tapAvoid(app) :undefined });
if (intent.dirs) uiWalkPath(app,{ dirs:intent.dirs,target:{ cell } });
return Boolean(intent.dirs);
}
function uiGlideTo(app,cell) {
const here = app.game.avatar.pos;
uiCastCarry(app,{ cell:{ ...cell },facing:'up' });
uiGridEmit(app,'enter-cell',{ pos:{ ...cell },from:here });
}
function uiOracleTap(app,cell) {
const game = app.game;
if (!game.oracle || game.oracle.inert || app.story || doorAt(cell) === NO_DOOR) return false;
const here = game.avatar.pos;
if (!inPocket(here) && !uiInCorridor(here)) return uiWalkToCorridor(app);
if (here.col !== cell.col || here.row !== cell.row) uiGlideTo(app,cell);
return true;
}
function uiOracleBump(payload) {
const game = payload.app.game;
if (!game.oracle || game.oracle.inert) return;
const target = cellToward(payload.pos,game.avatar.facing);
if (target.col === SIGN.col && target.row === SIGN.row) uiShowToast(payload.app,{ text:TOASTS.sign + TAP_TOAST,kind:'info',replace:true });
}
function uiHookOracle() {
if (uiHooked) return;
uiHooked = true;
['step','enter-cell'].forEach(function (name) { uiGridHook(name,function (payload) { uiOracleSync(payload.app); }); });
uiGridHook('bump',uiOracleBump);
}
function uiHasPocket(world) {
const cell = cellAt(world,DOORS[0]);
return Boolean(cell) && cell.kind === 'floor';
}

function uiInstallOracle(app) {
const game = app.game;
game.oracle = game.oracle || { inert:!uiHasPocket(game.world),state:createOracle(),paint:false,tapped:false };
if (game.oracle.inert) return app;
uiHookOracle();
if (!game.oracle.tapped) uiAddTap(game,uiOracleTap);
game.oracle.tapped = true;
uiOracleSync(app);
return app;
}

export { uiInstallOracle,uiOracleSync,uiOracleTap };
