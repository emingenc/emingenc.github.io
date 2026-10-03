import { clamp01, lerp } from './ease.js';


const WALK_FEEL = { stepMs:130,nudgeMs:90,nudgeTiles:0.1875,cameraMs:120 };
const HALF = 0.5;
const CAMERA_OMEGA = 2 / WALK_FEEL.cameraMs;
const CAMERA_SETTLED = 1e-4;
const AT_REST = { col:0,row:0 };

function pressWalk(walk,dir) {
const held = walk.held.filter((other) => other !== dir);
return { ...walk,held:[...held,dir],queued:dir,plan:null,stalled:null };
}
function releaseWalk(walk,dir) {
return { ...walk,held:walk.held.filter((other) => other !== dir) };
}
function stepRunning(walk,now) {
return walk.tween !== null && now < walk.tween.until;
}
function takeDir(walk) {
if (walk.queued) return { dir:walk.queued,walk:{ ...walk,queued:null } };
const held = walk.held.filter((dir) => dir !== walk.stalled);
if (held.length > 0) return { dir:held[held.length - 1],walk };
const dirs = walk.plan ? walk.plan.dirs :[];
if (dirs.length === 0) return { dir:null,walk };
return { dir:dirs[0],walk:{ ...walk,plan:{ dirs:dirs.slice(1) } } };
}
function startTween(last,step) {
const continues = last !== null && step.now - last.until < WALK_FEEL.stepMs;
const start = continues ? last.until :step.now;
return {
from:step.from,to:step.to,start,until:start + WALK_FEEL.stepMs,glideMs:step.reducedMotion ? 0 :WALK_FEEL.stepMs,
curve:continues ? 'cruise' :'ease',stride:continues ? 1 - last.stride :0,
};
}
function samePos(one,other) {
return one.col === other.col && one.row === other.row;
}
function afterStep(walk,step) {
if (!samePos(step.from,step.to)) return { ...walk,tween:startTween(walk.tween,step),nudge:null };
const nudge = step.reducedMotion ? null :{ dir:step.dir,start:step.now };
return { ...walk,tween:null,nudge,stalled:step.dir,plan:null };
}
function advanceWalk(walk,frame) {
if (stepRunning(walk,frame.now)) return { walk,step:null };
const next = takeDir(walk);
if (!next.dir) return { walk:next.walk.tween === null ? next.walk :{ ...next.walk,tween:null },step:null };
const step = frame.move(next.dir);
const spec = { from:frame.from,to:step.pos,now:frame.now,dir:next.dir,reducedMotion:frame.reducedMotion };
return { walk:afterStep(next.walk,spec),step };
}
function launch(progress) {
return progress + progress * (1 - progress) ** 2;
}
function stepPose(tween,now) {
const progress = tween.glideMs > 0 ? clamp01((now - tween.start) / tween.glideMs) :1;
const travelled = tween.curve === 'cruise' ? progress :launch(progress);
const moving = progress < 1;
return {
col:lerp(tween.from.col,tween.to.col,travelled),row:lerp(tween.from.row,tween.to.row,travelled),
moving,phase:moving ? tween.stride + progress :0,
};
}
function nudgeAt(nudge,now) {
const progress = nudge ? (now - nudge.start) / WALK_FEEL.nudgeMs :1;
if (progress <= 0 || progress >= 1) return null;
return { dir:nudge.dir,amount:Math.sin(progress * Math.PI) * WALK_FEEL.nudgeTiles };
}
function walkFrame(phase) {
const stride = Math.floor(phase);
const within = phase - stride;
if (within === 0 || within > HALF) return { frame:0,bob:0 };
return { frame:1 + stride % 2,bob:1 };
}
function followAxis(axis,target,dtMs) {
const offset = axis.at - target;
const decay = Math.exp(-CAMERA_OMEGA * dtMs);
const pull = (axis.speed + CAMERA_OMEGA * offset) * dtMs;
const at = target + (offset + pull) * decay;
const speed = (axis.speed - CAMERA_OMEGA * pull) * decay;
const low = Math.min(axis.at,target);
const high = Math.max(axis.at,target);
if (at < low || at > high) return { at:Math.min(Math.max(at,low),high),speed:0 };
const settled = Math.abs(at - target) < CAMERA_SETTLED && Math.abs(speed) < CAMERA_SETTLED;
return settled ? { at:target,speed:0 } :{ at,speed };
}
function followCamera(camera,target,dtMs) {
const elapsed = Math.max(0,dtMs);
const speed = camera.speed || AT_REST;
const col = followAxis({ at:camera.col,speed:speed.col },target.col,elapsed);
const row = followAxis({ at:camera.row,speed:speed.row },target.row,elapsed);
return { col:col.at,row:row.at,speed:{ col:col.speed,row:row.speed } };
}

export { WALK_FEEL, pressWalk, releaseWalk, advanceWalk, stepPose, nudgeAt, walkFrame, followCamera };
