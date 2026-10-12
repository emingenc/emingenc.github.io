import { dragTween } from '../game/cast/bit.js';
import { withPosition } from '../game/save.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiCommitSave } from './game-state.js';
import { uiShowToast } from './grid-toast.js';
import { uiRenderKeepingFocus } from './app.js';

const POLL_MS = 100;
const GIVE_UP_MS = 12000;

function uiCastSleep(app,ms) {
const gen = app.game.gen;
return new Promise(function (resolve) { window.setTimeout(function () { if (app.game.gen === gen) resolve(); },ms); });
}
async function uiCastUntil(app,ready) {
for (let waited = 0; waited < GIVE_UP_MS && !ready(); waited += POLL_MS) await uiCastSleep(app,POLL_MS);
}
function uiWalking(app) {
const walk = app.game.walk;
const stepping = Boolean(walk.tween) && performance.now() < walk.tween.until;
return stepping || walk.held.length > 0 || Boolean(walk.queued) || Boolean(walk.plan && walk.plan.dirs.length > 0);
}
function uiCastStill(app) {
return uiCastUntil(app,function () { return !uiWalking(app); });
}
function uiToastFree(game) {
return !game.toast && (!game.toastQueue || game.toastQueue.length === 0);
}
async function uiCastSay(app,toast) {
await uiCastUntil(app,function () { return uiToastFree(app.game); });
uiShowToast(app,{ kind:'info',...toast });
uiRenderKeepingFocus(app);
}
function uiCastCarry(app,goal) {
const game = app.game;
const from = game.avatar.pos;
game.avatar = { pos:{ ...goal.cell },facing:goal.facing };
Object.assign(game.walk,{ held:[],queued:null,plan:null,stalled:null,tween:dragTween(from,goal.cell,{ now:performance.now(),reducedMotion:uiPrefersReducedMotion() }) });
uiCommitSave(app,withPosition(game.save,game.avatar));
uiRenderKeepingFocus(app);
}

export { uiCastSleep,uiCastUntil,uiCastStill,uiCastSay,uiCastCarry };
