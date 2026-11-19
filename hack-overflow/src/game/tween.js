import { clamp01, lerp, easeOutCubic } from './ease.js';


const WALK_FEEL = { stepMs:130,nudgePushMs:50,nudgeMs:140,nudgeTiles:0.22,cameraMs:120 };
const NUDGE_OVERSHOOT = 2.5;
const CUBIC = 3;
const SQUARE = 2;
const LOOK_AHEAD = { tiles:0.6,riseMs:140,fallMs:260 };
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
if (walk.queued) return { dir:walk.queued,auto:false,walk:{ ...walk,queued:null } };
const held = walk.held.filter((dir) => dir !== walk.stalled);
if (held.length > 0) return { dir:held[held.length - 1],auto:true,walk };
const dirs = walk.plan ? walk.plan.dirs :[];
if (dirs.length === 0) return { dir:null,auto:true,walk };
return { dir:dirs[0],auto:true,walk:{ ...walk,plan:{ dirs:dirs.slice(1) } } };
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
const step = frame.move(next.dir,next.auto);
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
function easeOutBack(progress) {
const rest = progress - 1;
return 1 + (NUDGE_OVERSHOOT + 1) * rest ** CUBIC + NUDGE_OVERSHOOT * rest ** SQUARE;
}
function nudgePush(age) {
if (age < WALK_FEEL.nudgePushMs) return easeOutCubic(age / WALK_FEEL.nudgePushMs);
return 1 - easeOutBack((age - WALK_FEEL.nudgePushMs) / (WALK_FEEL.nudgeMs - WALK_FEEL.nudgePushMs));
}
function nudgeAt(nudge,now) {
const age = nudge ? now - nudge.start :0;
if (age <= 0 || age >= WALK_FEEL.nudgeMs) return null;
const push = nudgePush(age);
return { dir:nudge.dir,amount:push * WALK_FEEL.nudgeTiles,push,age,start:nudge.start };
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

function easeAhead(value,aim,dtMs) {
const settleMs = Math.abs(aim) >= Math.abs(value) ? LOOK_AHEAD.riseMs :LOOK_AHEAD.fallMs;
const next = aim + (value - aim) * Math.exp(-Math.max(0,dtMs) / settleMs);
return Math.abs(next - aim) < CAMERA_SETTLED ? aim :next;
}
function lookAhead(ahead,aim,dtMs) {
return { col:easeAhead(ahead.col,aim.col,dtMs),row:easeAhead(ahead.row,aim.row,dtMs) };
}

export { WALK_FEEL, LOOK_AHEAD, pressWalk, releaseWalk, advanceWalk, stepPose, nudgeAt, walkFrame, followCamera, lookAhead };
