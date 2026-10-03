import { stepAvatar, cellToward } from '../game/move.js';
import { thingAt, isPassable } from '../game/world.js';
import { pressWalk, releaseWalk, advanceWalk, stepPose, nudgeAt } from '../game/tween.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiApplyStepEvent, uiNearDir } from './grid-events.js';


function uiWalkAdvance(app,now) {
const game = app.game;
const turn = advanceWalk(game.walk,{
now,from:game.avatar.pos,reducedMotion:uiPrefersReducedMotion(),
move:function (dir) { return stepAvatar(game.world,game.progress,{ pos:game.avatar.pos,facing:game.avatar.facing,dir }); },
});
game.walk = turn.walk;
if (turn.step) uiApplyStepEvent(app,turn.step);
}
function uiWalkPress(app,dir) {
app.game.walk = pressWalk(app.game.walk,dir);
uiWalkAdvance(app,performance.now());
}
function uiWalkRelease(app,dir) {
app.game.walk = releaseWalk(app.game.walk,dir);
}
function uiWalkHolds(app,dir) {
return app.game.walk.held.includes(dir);
}
function uiWalkReleaseAll(app) {
Object.assign(app.game.walk,{ held:[],queued:null,stalled:null });
}
function uiWalkPath(app,plan) {
Object.assign(app.game.walk,{ plan:{ dirs:[...plan.dirs] },held:[],queued:null,stalled:null });
}
function uiIsSolidThing(game,cell) {
return thingAt(game.world,cell) !== null && !isPassable(game.world,game.progress,cell);
}
function uiWalkInteract(app) {
const game = app.game;
const faced = cellToward(game.avatar.pos,game.avatar.facing);
const dir = uiIsSolidThing(game,faced) ? game.avatar.facing :uiNearDir(game);
if (!dir) return false;
uiWalkPress(app,dir);
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
