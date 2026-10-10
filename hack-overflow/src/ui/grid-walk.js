import { stepAvatar, cellToward } from '../game/move.js';
import { thingAt, isPassable } from '../game/world.js';
import { pressWalk, releaseWalk, advanceWalk, stepPose, nudgeAt } from '../game/tween.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiApplyStepEvent, uiNearDir } from './grid-events.js';
import { uiSentryWait } from './grid-actors.js';


function uiGuardedStep(app,dir,auto) {
const game = app.game;
const guarded = game.sentry ? game.sentry.guardStep(app,dir,auto) :null;
return guarded || stepAvatar(game.world,game.progress,{ pos:game.avatar.pos,facing:game.avatar.facing,dir });
}
function uiWalkAdvance(app,now) {
const game = app.game;
const deliberate = uiWalkIsDeliberate(game.walk);
const turn = advanceWalk(game.walk,{
now,from:game.avatar.pos,reducedMotion:uiPrefersReducedMotion(),
move:function (dir,auto) { return uiGuardedStep(app,dir,auto); },
});
game.walk = turn.step ? { ...turn.walk,deliberate:false } :turn.walk;
if (turn.step) uiApplyStepEvent(app,{ ...turn.step,deliberate });
}
function uiWalkIsDeliberate(walk) {
return walk.deliberate === true || Boolean(walk.plan && walk.plan.dirs.length > 0);
}
function uiNoteMoved(app) {
if (app.game.opening) app.game.opening.moved = true;
}
function uiWalkStart(app,press) {
uiNoteMoved(app);
app.game.walk = { ...pressWalk(app.game.walk,press.dir),deliberate:press.deliberate };
uiWalkAdvance(app,performance.now());
}
function uiWalkPress(app,dir) {
uiWalkStart(app,{ dir,deliberate:false });
}
function uiWalkRelease(app,dir) {
app.game.walk = releaseWalk(app.game.walk,dir);
}
function uiWalkHolds(app,dir) {
return app.game.walk.held.includes(dir);
}
function uiWalkReleaseAll(app) {
Object.assign(app.game.walk,{ held:[],queued:null,stalled:null,deliberate:false });
}
function uiWalkPath(app,plan) {
uiNoteMoved(app);
Object.assign(app.game.walk,{ plan:{ dirs:[...plan.dirs] },held:[],queued:null,stalled:null });
}
function uiIsSolidThing(game,cell) {
return thingAt(game.world,cell) !== null && !isPassable(game.world,game.progress,cell);
}
function uiInteractDir(game) {
const faced = cellToward(game.avatar.pos,game.avatar.facing);
return uiIsSolidThing(game,faced) ? game.avatar.facing :uiNearDir(game);
}
function uiWalkInteract(app) {
const game = app.game;
const dir = uiInteractDir(game);
if (!dir) return uiSentryWait(app);
uiWalkStart(app,{ dir,deliberate:true });
uiWalkRelease(app,dir);
return true;
}
function uiWalkTick(app,now) {
uiWalkAdvance(app,now);
const walk = app.game.walk;
return (walk.tween !== null && stepPose(walk.tween,now).moving) || nudgeAt(walk.nudge,now) !== null;
}
function uiAvatarPose(app,now) {
const game = app.game;
const walk = game.walk;
const base = walk.tween ? stepPose(walk.tween,now) :{ col:game.avatar.pos.col,row:game.avatar.pos.row,moving:false,phase:0 };
return { ...base,facing:game.avatar.facing,nudge:nudgeAt(walk.nudge,now) };
}

export { uiWalkPress, uiWalkRelease, uiWalkHolds, uiWalkReleaseAll, uiWalkPath, uiWalkInteract, uiWalkTick, uiAvatarPose };
