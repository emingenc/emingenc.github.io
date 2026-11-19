import { framedCamera, targetCell } from '../game/wayfinding.js';
import { DIRS } from '../game/move.js';
import { LOOK_AHEAD, followCamera, lookAhead } from '../game/tween.js';
import { uiReducedMotion } from './media-flags.js';
import { uiAvatarPose } from './grid-walk.js';
import { uiBarsInset } from './grid-fit.js';

const UI_AT_REST = { col:0,row:0 };
function uiSnapCamera(stage,camera) {
const scale = stage.tile * stage.dpr;
return { col:Math.round(camera.col * scale) / scale,row:Math.round(camera.row * scale) / scale };
}
function uiHeldFocus(hold,cols) {
const whole = hold.to - hold.from + 2 <= cols;
return { col:whole ? (hold.from + hold.to) / 2 :hold.col,row:hold.row };
}
function uiLookAim(pose,still) {
if (!pose.moving || still) return UI_AT_REST;
const delta = DIRS[pose.facing];
return { col:delta.dc * LOOK_AHEAD.tiles,row:delta.dr * LOOK_AHEAD.tiles };
}
function uiAheadTick(follow,aim,now) {
return lookAhead(follow ? follow.ahead :UI_AT_REST,aim,follow ? now - follow.at :0);
}
function uiCameraTick(app,now) {
const stage = app.game.stage;
if ((app.story || stage.holdUntil > now) && stage.follow) {
stage.follow.at = now;
return uiSnapCamera(stage,stage.follow.camera);
}
const pose = uiAvatarPose(app,now);
const world = app.game.world;
const hold = app.game.camHold;
const cols = stage.width / stage.tile;
const follow = stage.follow;
const glide = follow && !uiReducedMotion();
const ahead = uiAheadTick(follow,uiLookAim(pose,Boolean(hold) || !glide),now);
const view = { focus:hold ? uiHeldFocus(hold,cols) :{ col:pose.col + ahead.col,row:pose.row + ahead.row },cols,rows:stage.height / stage.tile,inset:uiBarsInset(stage.tile) };
const target = framedCamera(world,view,targetCell(world,app.game.objectiveTarget));
const camera = glide ? followCamera(follow.camera,target,now - follow.at) :{ ...target,speed:UI_AT_REST };
stage.follow = { camera,at:now,ahead };
return uiSnapCamera(stage,camera);
}

export { uiCameraTick };
