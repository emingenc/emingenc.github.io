import { MAX_LEVEL } from '../game/progress.js';
import { vectorMoves } from '../game/frame-pace.js';
import { uiReducedMotion,uiCoarsePointer } from './media-flags.js';
import { uiWarmArt } from './art-warm.js';
import { uiCreateBakeCache } from './grid-bake.js';
import { uiCreateBlits } from './blit-cache.js';
import { uiGameDebug } from './game-state.js';
import { uiAvatarPose } from './grid-walk.js';
import { uiCameraTick } from './grid-camera.js';
import { uiBarsInset } from './grid-fit.js';
import { uiDrawTiles,uiWarmPairs } from './grid-draw-tiles.js';
import { uiDrawRoute } from './grid-draw-route.js';
import { uiDrawAvatar } from './grid-draw-avatar.js';
import { uiDrawFx } from './grid-draw-fx.js';
import { uiDrawWayfinding } from './grid-draw-wayfinding.js';
import { uiSyncHint, uiSyncNearPlate } from './grid-hint.js';

function uiWarmFor(stage,world) {
const devicePx = Math.round(stage.tile * stage.dpr);
const warmed = stage.warmed;
if (!devicePx || !world || (warmed && warmed.world === world && warmed.devicePx === devicePx)) return;
stage.warmed = { world,devicePx };
uiWarmArt({ pairs:uiWarmPairs(world),devicePx });
}
function uiFrameFor(app,now) {
const game = app.game;
const stage = game.stage;
const view = { cols:stage.width / stage.tile,rows:stage.height / stage.tile,inset:uiBarsInset(stage.tile) };
const camera = uiCameraTick(app,now);
const avatar = uiAvatarPose(app,now);
game.view = { camera,tile:stage.tile,cols:view.cols,rows:view.rows,width:stage.width,height:stage.height,avatar };
return {
ctx:stage.ctx,world:game.world,progress:game.progress,save:game.save,camera,tile:stage.tile,view,avatar,now,
doorOpenness:stage.doorOpenness,reducedMotion:uiReducedMotion(),bake:stage.bake,blits:stage.blits,
rootRank:game.progress.level >= MAX_LEVEL,targetId:game.coach ? null :game.objectiveTarget,palette:stage.palette,width:stage.width,height:stage.height,dpr:stage.dpr,
avatarCell:game.avatar.pos,walking:Boolean(game.walk.plan),routeAvoid:game.tapAvoid ? game.tapAvoid(app) :undefined,routeCache:stage.routeCache,
};
}
function uiSceneBusy(app,frame) {
const game = app.game;
const follow = game.stage.follow;
const gliding = follow !== null && (vectorMoves(follow.camera.speed) || vectorMoves(follow.ahead));
return Boolean(frame.avatar.moving || gliding || game.fight || app.story || game.opening || game.camHold);
}
function uiNotePace(app,frame) {
const pace = app.game.stage.pace;
pace.lastDrawAt = frame.now;
pace.busy = uiSceneBusy(app,frame);
if (pace.busy) pace.activeAt = frame.now;
}
function uiDrawFrame(app,now) {
const stage = app.game.stage;
if (!stage.tile) return;
stage.bake ||= uiCreateBakeCache();
stage.blits ||= uiCreateBlits();
stage.routeCache ||= { key:'',progress:null,cells:[] };
const frame = uiFrameFor(app,now);
uiDrawTiles(frame);
uiDrawRoute(frame);
if (app.game.drawOracle) app.game.drawOracle(frame.ctx,app,frame);
if (app.game.drawCast) app.game.drawCast(frame.ctx,app,frame);
uiDrawAvatar(frame);
if (app.game.drawActors) app.game.drawActors(frame.ctx,app,frame);
if (app.game.drawFork) app.game.drawFork(frame.ctx,app,frame);
if (app.game.drawBrute) app.game.drawBrute(frame.ctx,app,frame);
uiDrawFx(frame);
uiDrawWayfinding(frame);
uiSyncHint(app.game,Boolean(app.story));
uiSyncNearPlate(app.game,uiCoarsePointer());
uiNotePace(app,frame);
uiGameDebug().frames += 1;
}

export { uiDrawFrame,uiWarmFor };
