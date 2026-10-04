import { framedCamera, targetCell } from '../game/wayfinding.js';
import { followCamera } from '../game/tween.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiAvatarPose } from './grid-walk.js';

const UI_AT_REST = { col:0,row:0 };
function uiSnapCamera(stage,camera) {
const scale = stage.tile * stage.dpr;
return { col:Math.round(camera.col * scale) / scale,row:Math.round(camera.row * scale) / scale };
}
function uiCameraTick(app,now) {
const stage = app.game.stage;
const pose = uiAvatarPose(app,now);
const world = app.game.world;
const view = { focus:{ col:pose.col,row:pose.row },cols:stage.width / stage.tile,rows:stage.height / stage.tile };
const target = framedCamera(world,view,targetCell(world,app.game.objectiveTarget));
const follow = stage.follow;
const glide = follow && !uiPrefersReducedMotion();
const camera = glide ? followCamera(follow.camera,target,now - follow.at) :{ ...target,speed:UI_AT_REST };
stage.follow = { camera,at:now };
return uiSnapCamera(stage,camera);
}

export { uiCameraTick };
