import { DIRS } from '../game/move.js';
import { walkFrame } from '../game/tween.js';
import { UI_AVATAR_PX, uiPaintAvatar } from './avatar-sprite.js';

const UI_STANDING = { frame:0,bob:0 };
function uiSnapPx(frame,value) {
return Math.round(value * frame.dpr) / frame.dpr;
}
function uiAvatarCell(pose) {
if (!pose.nudge) return { col:pose.col,row:pose.row };
const delta = DIRS[pose.nudge.dir];
return { col:pose.col + delta.dc * pose.nudge.amount,row:pose.row + delta.dr * pose.nudge.amount };
}
function uiSpriteUnit(frame) {
return Math.max(1,Math.round(frame.tile * frame.dpr / UI_AVATAR_PX)) / frame.dpr;
}
function uiDrawAvatar(frame) {
const pose = frame.reducedMotion ? { ...frame.avatar,nudge:null } :frame.avatar;
const cell = uiAvatarCell(pose);
const unit = uiSpriteUnit(frame);
const inset = (frame.tile - unit * UI_AVATAR_PX) / 2;
const left = uiSnapPx(frame,(cell.col - frame.camera.col) * frame.tile + inset);
const top = uiSnapPx(frame,(cell.row - frame.camera.row) * frame.tile + inset);
const cycle = frame.reducedMotion ? UI_STANDING :walkFrame(pose.phase);
uiPaintAvatar(frame.ctx,{ x:left,y:top,unit },{ facing:pose.facing,frame:cycle.frame,bob:cycle.bob,palette:frame.palette,rootRank:frame.rootRank });
}

export { uiDrawAvatar };
