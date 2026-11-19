import { DIRS } from '../game/move.js';
import { WALK_FEEL } from '../game/tween.js';
import { createHeroTrack, trackHero, heroBody } from '../game/hero-feel.js';
import { UI_AVATAR_PX, uiPaintAvatar } from './avatar-sprite.js';
import { uiGridBurst } from './grid-draw-fx.js';

const UI_STANDING = { frame:0,bob:0,shift:0 };
const UI_NO_DELTA = { dc:0,dr:0 };
const UI_BUMP_DUST = { kind:'fizz',count:3,edge:0.5,foot:0.3 };
const UI_CELL_CENTRE = 0.5;
const uiHeroTrack = createHeroTrack();
let uiDustedBump = null;
function uiPaintPlain(frame,place,look) {
uiPaintAvatar(frame.ctx,place,look);
}
let uiAvatarPaint = uiPaintPlain;
function uiSetAvatarPaint(paint) {
uiAvatarPaint = paint || uiPaintPlain;
}
function uiSnapPx(frame,value) {
return Math.round(value * frame.dpr) / frame.dpr;
}
function uiSpriteUnit(frame) {
return Math.max(1,Math.round(frame.tile * frame.dpr / UI_AVATAR_PX)) / frame.dpr;
}
function uiAvatarPush(frame,pose,body) {
const delta = pose.nudge ? DIRS[pose.nudge.dir] :UI_NO_DELTA;
const reach = pose.nudge ? pose.nudge.amount * frame.tile :0;
const turn = body.shift * uiSpriteUnit(frame);
return { x:uiSnapPx(frame,delta.dc * reach + turn),y:uiSnapPx(frame,delta.dr * reach) };
}
function uiBumpDust(frame,pose) {
const bump = pose.nudge;
if (!bump || bump.age < WALK_FEEL.nudgePushMs || uiDustedBump === bump.start) return;
uiDustedBump = bump.start;
const delta = DIRS[bump.dir];
const origin = {
col:pose.col + UI_CELL_CENTRE + delta.dc * UI_BUMP_DUST.edge,
row:pose.row + UI_CELL_CENTRE + delta.dr * UI_BUMP_DUST.edge + (delta.dr === 0 ? UI_BUMP_DUST.foot :0),
};
uiGridBurst({ kind:UI_BUMP_DUST.kind,count:UI_BUMP_DUST.count,origin,atMs:frame.now,seed:Math.floor(bump.start) });
}
function uiHeroBody(frame,pose) {
if (frame.reducedMotion) return UI_STANDING;
uiBumpDust(frame,pose);
const sample = { now:frame.now,facing:pose.facing,moving:pose.moving,phase:pose.phase,nudge:pose.nudge };
return heroBody(trackHero(uiHeroTrack,sample),sample);
}
function uiDrawAvatar(frame) {
const pose = frame.reducedMotion ? { ...frame.avatar,nudge:null } :frame.avatar;
const unit = uiSpriteUnit(frame);
const inset = (frame.tile - unit * UI_AVATAR_PX) / 2;
const left = uiSnapPx(frame,(pose.col - frame.camera.col) * frame.tile + inset);
const top = uiSnapPx(frame,(pose.row - frame.camera.row) * frame.tile + inset);
const body = uiHeroBody(frame,pose);
const look = { ...body,facing:pose.facing,palette:frame.palette,rootRank:frame.rootRank,push:uiAvatarPush(frame,pose,body) };
uiAvatarPaint(frame,{ x:left,y:top,unit },look);
}

export { uiDrawAvatar,uiSetAvatarPaint };
