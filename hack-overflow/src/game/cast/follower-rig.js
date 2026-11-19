const RISE = 0.05;
const SQUASH = 0.035;
const LEAN = 0.12;
const SWAY = 0.03;
const LEG_LIFT = 0.04;
const LEG_SWING = 0.05;
const BREATH = 0.012;
const BREATH_MS = 1900;
const TURN_MS = 200;
const TURN_SQUEEZE = 0.18;
const SETTLE_MS = 220;
const SETTLE_DIP = 0.07;
const HOP_MS = 340;
const HOP_CROUCH_MS = 60;
const HOP_AIR_MS = 200;
const HOP_CROUCH = 0.07;
const HOP_RISE = 0.07;
const HOP_LAND = 0.06;
const TYPE_BEAT_MS = 180;
const TYPE_RISE = 0.04;
const TYPE_WEAK = 0.55;
const TYPE_LEAN = 0.04;
const TALK_LEAN = 0.07;
const DRAG_LEAN = 0.2;
const DRAG_LEAN_RAMP = 4;
const DRAG_KICKS = 7;
const DRAG_LIFT = 0.07;
const DRAG_FLASH_MS = 140;
const DRAG_RISE = 0.025;
const TAU = Math.PI * 2;
const QUARTER = Math.PI / 2;
const AT_REST = Object.freeze({ rise:0,scaleX:1,scaleY:1,lean:0,legLift:0,legSwing:0,liftSide:0,away:false,flash:0 });
const NO_CUE = Object.freeze({ rise:0,squash:1,lean:0 });

function leanSign(facing) {
if (facing === 'right') return 1;
return facing === 'left' ? -1 :0;
}
function inside(age,length) {
return typeof age === 'number' && age >= 0 && age < length;
}
function turnScale(age) {
return inside(age,TURN_MS) ? 1 - TURN_SQUEEZE * Math.sin(Math.PI * age / TURN_MS) :1;
}
function settleCue(age) {
if (!inside(age,SETTLE_MS)) return NO_CUE;
const along = age / SETTLE_MS;
return { ...NO_CUE,squash:1 - SETTLE_DIP * Math.sin(TAU * along) * (1 - along) };
}
function hopCue(age) {
if (age < HOP_CROUCH_MS) return { ...NO_CUE,squash:1 - HOP_CROUCH * Math.sin(QUARTER * age / HOP_CROUCH_MS) };
const air = (age - HOP_CROUCH_MS) / HOP_AIR_MS;
if (air < 1) return { ...NO_CUE,rise:HOP_RISE * Math.sin(Math.PI * air),squash:1 + HOP_CROUCH * (1 - air) * air };
const land = (age - HOP_CROUCH_MS - HOP_AIR_MS) / (HOP_MS - HOP_CROUCH_MS - HOP_AIR_MS);
return { ...NO_CUE,squash:1 - HOP_LAND * Math.sin(Math.PI * land) };
}
function typeCue(now) {
const beat = Math.floor(now / TYPE_BEAT_MS);
const left = 1 - (now - beat * TYPE_BEAT_MS) / TYPE_BEAT_MS;
return { rise:TYPE_RISE * (beat % 2 === 0 ? 1 :TYPE_WEAK) * left * left,squash:1,lean:TYPE_LEAN };
}
function cueOf(pose,clock) {
if (pose.typing) return typeCue(clock.now);
return inside(pose.hopAge,HOP_MS) ? hopCue(pose.hopAge) :settleCue(pose.settleAge);
}
function dragRig(drag) {
const flash = inside(drag.age,DRAG_FLASH_MS) ? 1 - drag.age / DRAG_FLASH_MS :0;
return {
...AT_REST,rise:DRAG_RISE,lean:-DRAG_LEAN * drag.dir * Math.min(1,drag.along * DRAG_LEAN_RAMP),legLift:DRAG_LIFT,
legSwing:-LEG_SWING * drag.dir,liftSide:Math.floor(drag.along * DRAG_KICKS) % 2 === 0 ? -1 :1,flash,
};
}
function walkRig(pose) {
const within = pose.phase - Math.floor(pose.phase);
const arc = Math.sin(within * Math.PI);
const sign = leanSign(pose.facing);
const scaleY = 1 + SQUASH * arc;
const turn = sign === 0 ? 1 :turnScale(pose.turnAge);
return {
...AT_REST,rise:RISE * arc,scaleX:turn / scaleY,scaleY,lean:(LEAN * arc + SWAY * Math.sin(within * TAU)) * sign,
legLift:LEG_LIFT * arc,legSwing:LEG_SWING * arc * sign,liftSide:Math.floor(pose.phase) % 2 === 0 ? -1 :1,
};
}
function restRig(pose,clock) {
const breath = 1 + BREATH * Math.sin(clock.now / BREATH_MS * TAU);
return { ...AT_REST,scaleY:breath,scaleX:1 / breath,lean:TALK_LEAN * (pose.toward || 0) };
}
function withCue(rig,cue) {
return { ...rig,rise:rig.rise + cue.rise,scaleY:rig.scaleY * cue.squash,scaleX:rig.scaleX / cue.squash,lean:rig.lean + cue.lean };
}
function followerRig(pose,clock) {
const away = pose.facing === 'up';
if (clock.still) return { ...AT_REST,away };
if (pose.drag) return dragRig(pose.drag);
const rig = pose.moving ? walkRig(pose) :restRig(pose,clock);
return { ...withCue(rig,cueOf(pose,clock)),away };
}

export { followerRig };
