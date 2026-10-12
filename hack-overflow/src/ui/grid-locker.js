import { cellToward } from '../game/move.js';
import { LOCKERS,isSealed,lockerById,openLocker,sealedAt } from '../game/power/lockers.js';
import { usablePowers } from '../game/power/powers.js';
import { uiCommitExt } from './ext-storage.js';
import { uiPaintLockers } from './grid-locker-draw.js';
import { uiAddGuard,uiHooksOnce,uiPowerOf,uiPowerRefresh,uiPowerSay } from './grid-power.js';
import { uiPayRank } from './rank-pay.js';

const NEAR = 5;
const FAR = 9;
const GUARDS = { armored:{ load:() => import('./grid-armored.js'),spawn:'uiSpawnArmored' } };

function uiLockerOf(app) {
const power = app.game.power;
return power && power.gen === app.game.gen && power.locker ? power.locker :null;
}
function uiReach(locker,pos) {
return Math.max(Math.abs(locker.col - pos.col),Math.abs(locker.row - pos.row));
}
function uiIsGuardOf(actor,lockerId) {
return actor.id === lockerId || actor.id.startsWith(lockerId + '-');
}
function uiRemoveGuards(game,lockerId,dead) {
if (!game.fight) return;
const kept = game.fight.actors.filter((actor) => !uiIsGuardOf(actor,lockerId) || (actor.hp <= 0 && !dead));
if (kept.length !== game.fight.actors.length) game.fight.actors = kept;
}
function uiMarkStood(game,lockerId) {
const state = game.power && game.power.locker;
if (state) state.stood.add(lockerId);
}
async function uiGuardDown(app,lockerId) {
const game = app.game;
const locker = lockerById(lockerId);
if (!locker || !isSealed(game.ext,lockerId)) return;
uiCommitExt(app,openLocker(game.ext,lockerId));
uiRemoveGuards(game,lockerId,false);
uiPowerSay(app,{ text:locker.line,kind:'reward' });
uiPowerRefresh(app);
await uiPayRank(app,locker.source,locker.reward);
}
function uiGuardStands(game,locker) {
return Boolean(game.fight) && game.fight.actors.some((actor) => actor.hp > 0 && uiIsGuardOf(actor,locker.id));
}
function uiGuardDue(app,locker) {
const game = app.game;
return uiReach(locker,game.avatar.pos) <= NEAR && isSealed(game.ext,locker.id) && !uiLockerOf(app).stood.has(locker.id)
&& usablePowers(game.progress.won,game.ext).includes(locker.power);
}
async function uiStandGuard(app,locker) {
const state = uiLockerOf(app);
const guard = GUARDS[locker.guard];
if (!guard || state.loading.has(locker.id)) return;
state.loading.add(locker.id);
try {
const module = await guard.load();
if (uiLockerOf(app) === state && uiGuardDue(app,locker)) module[guard.spawn](app,locker);
} finally {
state.loading.delete(locker.id);
}
}
function uiSyncLocker(app,locker) {
const game = app.game;
if (uiReach(locker,game.avatar.pos) > FAR) {
uiLockerOf(app).stood.delete(locker.id);
uiRemoveGuards(game,locker.id,true);
} else if (uiGuardDue(app,locker) && !uiGuardStands(game,locker)) uiStandGuard(app,locker).catch(console.error);
}
function uiSyncGuards(app) {
if (!uiLockerOf(app) || app.screen !== 'grid' || app.game.opening) return;
LOCKERS.forEach((locker) => uiSyncLocker(app,locker));
}
function uiSealGuard(app,dir) {
const game = app.game;
if (!uiLockerOf(app)) return null;
const locker = sealedAt(game.ext,cellToward(game.avatar.pos,dir));
return locker ? { pos:{ ...game.avatar.pos },facing:dir,event:{ type:'bump',prop:locker.id } } :null;
}
function uiOnBump(info) {
const app = info.app;
const locker = uiLockerOf(app) && info.event && info.event.prop ? lockerById(info.event.prop) :null;
if (locker && isSealed(app.game.ext,locker.id)) uiPowerSay(app,{ text:locker.sealedLine });
}
function uiOnMove(info) {
uiSyncGuards(info.app);
}
const uiHook = uiHooksOnce({ 'enter-cell':uiOnMove,tick:uiOnMove,bump:uiOnBump });
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isLocker) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
if (uiLockerOf(app)) uiPaintLockers(ctx,app,frame);
};
paint.isLocker = true;
game.drawCast = paint;
}
function uiInstallLocker(app) {
const game = app.game;
if (!game.cast || game.cast.inert) return;
uiPowerOf(game).locker = { stood:new Set(),loading:new Set() };
uiAddGuard(game,uiSealGuard);
game.world.blocked = (cell) => sealedAt(game.ext,cell) !== null;
uiWrapPaint(game);
uiHook();
uiSyncGuards(app);
}

export { uiInstallLocker,uiGuardDown,uiMarkStood };
