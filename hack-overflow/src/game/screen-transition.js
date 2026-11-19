const HALF = 0.5;
const CUBIC_IN_GAIN = 4;
const CUBIC_OUT_SLOPE = -2;
const CUBIC_POWER = 3;
const ROOM_SCREENS = new Set(['breach','rig','lab','forge','stream']);
const CARD_SCREENS = new Set(['debrief','levelup','traced','ending','map','review']);
const TRANSITION_KINDS = {
room:{ enterMs:200,scrimMs:260,scrimFrom:0.92,riseY:0,scale:1.45 },
card:{ enterMs:220,scrimMs:160,scrimFrom:0.7,riseY:12,scale:1 },
grid:{ enterMs:160,scrimMs:140,scrimFrom:0.6,riseY:0,scale:1 },
};
const ROOM_EXIT = { enterMs:140,scrimMs:120,scrimFrom:0.7,riseY:0,scale:1 };
const ENTRY_BEAT = { ms:200,scale:1.05,brightness:1.35 };
const DOOR_HOLD_MS = 80;
const DOOR_SHAKE = { px:6,ms:320,beats:7 };
const SHAKE_SIDEWAYS = 0.4;
const SHAKE_DECAY_POWER = 2;
const SHAKE_Y_CYCLE = 3;
const DOOR_STEP_MS = 450;

function kindOf(id) {
if (ROOM_SCREENS.has(id)) return 'room';
if (CARD_SCREENS.has(id)) return 'card';
return 'grid';
}
function screenTransitionPlan(from,to) {
if (!from || from === to) return null;
const kind = kindOf(to);
if (kind === 'grid' && kindOf(from) === 'room') return { kind:'exit',...ROOM_EXIT };
return { kind,...TRANSITION_KINDS[kind] };
}
function entryBeatOrigin(view) {
const half = 0.5;
return { x:(view.avatar.col - view.camera.col + half) * view.tile,y:(view.avatar.row - view.camera.row + half) * view.tile };
}
function easeInOutCubic(time) {
return time < HALF ? CUBIC_IN_GAIN * time * time * time : 1 - Math.pow(CUBIC_OUT_SLOPE * time + 2,CUBIC_POWER) / 2;
}
function doorFeel(openness) {
if (openness <= 0 || openness >= 1) return openness;
const linear = 1 - Math.pow(1 - openness,1 / CUBIC_POWER);
const hold = DOOR_HOLD_MS / DOOR_STEP_MS;
return easeInOutCubic(Math.max(0,(linear - hold) / (1 - hold)));
}

function shakeOffsets(shake) {
const offsets = [];
for (let beat = 0; beat < shake.beats; beat += 1) {
const amp = shake.px * Math.pow(1 - beat / shake.beats,SHAKE_DECAY_POWER);
offsets.push({ x:(beat % 2 === 0 ? 1 : -1) * amp,y:((beat % SHAKE_Y_CYCLE) - 1) * amp * SHAKE_SIDEWAYS });
}
return offsets;
}

export { shakeOffsets,DOOR_SHAKE,screenTransitionPlan, ENTRY_BEAT, entryBeatOrigin, doorFeel, DOOR_HOLD_MS };
