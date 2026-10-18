import { framedCamera, targetCell } from '../game/wayfinding.js';
import { followCamera } from '../game/tween.js';
import { uiPrefersReducedMotion } from './dom.js';
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
function uiCameraTick(app,now) {
const stage = app.game.stage;
if (app.story && stage.follow) {
stage.follow.at = now;
return uiSnapCamera(stage,stage.follow.camera);
}
const pose = uiAvatarPose(app,now);
const world = app.game.world;
const hold = app.game.camHold;
const cols = stage.width / stage.tile;
const view = { focus:hold ? uiHeldFocus(hold,cols) :{ col:pose.col,row:pose.row },cols,rows:stage.height / stage.tile,inset:uiBarsInset(stage.tile) };
const target = framedCamera(world,view,targetCell(world,app.game.objectiveTarget));
const follow = stage.follow;
const glide = follow && !uiPrefersReducedMotion();
const camera = glide ? followCamera(follow.camera,target,now - follow.at) :{ ...target,speed:UI_AT_REST };
stage.follow = { camera,at:now };
return uiSnapCamera(stage,camera);
}

export { uiCameraTick };
