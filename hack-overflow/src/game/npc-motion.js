import { WALK_FEEL } from './tween.js';
import { clamp01, easeInOutQuad, easeOutCubic, lerp } from './ease.js';

const GLIDE_MS = WALK_FEEL.stepMs;
const HOP_TILES = 0.08;
const LAND_MS = 90;
const LAND_SQUASH = 0.06;
const SKITTER_HZ = 6;
const SKITTER_ANGLE = 0.0175;
const SKITTER_SQUASH = 0.04;
const STALE_MS = 1000;
const FAR_TILES = 1.5;
const FULL_TURN = Math.PI * 2;
const MS_PER_S = 1000;
const HASH_STEP = 31;
const HASH_SPAN = 997;
const BREATH_AMOUNT = 0.03;
const HALF = 0.5;
const LEAN_RANGE = 3;
const LEAN_ANGLE = 0.08;
const LEAN_MS = 220;
const RING_EASE_MS = 140;
const POP_FROM = 1.15;
const SHUDDER_MS = 160;
const SHUDDER_PX = 2;
const SHUDDER_CYCLES = 2.5;

function phaseOf(id) {
let hash = 0;
for (const letter of String(id)) hash = (hash * HASH_STEP + letter.charCodeAt(0)) % HASH_SPAN;
return (hash / HASH_SPAN) * FULL_TURN;
}
function bobOf(frame,bob,phase) {
return frame.reducedMotion ? 0 :Math.sin(frame.now / bob.ms + phase) * bob.tiles * frame.tile;
}
function breathOf(frame,ms,phase) {
if (frame.reducedMotion) return 1;
return 1 + BREATH_AMOUNT * (Math.sin((frame.now / ms) * FULL_TURN + phase) + 1) * HALF;
}
function noteCell(track,cell,now) {
const fresh = !track || now - track.seen > STALE_MS || Math.hypot(cell.col - track.col,cell.row - track.row) > FAR_TILES;
if (fresh) return { col:cell.col,row:cell.row,fromCol:cell.col,fromRow:cell.row,at:now - GLIDE_MS,seen:now };
if (cell.col !== track.col || cell.row !== track.row) Object.assign(track,{ fromCol:track.col,fromRow:track.row,col:cell.col,row:cell.row,at:now });
track.seen = now;
return track;
}
function landSquash(age) {
return age < GLIDE_MS || age >= GLIDE_MS + LAND_MS ? 0 :LAND_SQUASH * Math.sin(((age - GLIDE_MS) / LAND_MS) * Math.PI);
}
function skitter(frame,age) {
return age < GLIDE_MS ? Math.sin((frame.now / MS_PER_S) * SKITTER_HZ * FULL_TURN) :0;
}
function glidePose(track,frame,out) {
const age = frame.now - track.at;
const progress = frame.reducedMotion ? 1 :clamp01(age / GLIDE_MS);
const eased = easeInOutQuad(progress);
const wobble = frame.reducedMotion ? 0 :skitter(frame,age);
const squash = frame.reducedMotion ? 0 :landSquash(age);
const hop = Math.sin(progress * Math.PI) * HOP_TILES;
out.col = lerp(track.fromCol,track.col,eased);
out.row = lerp(track.fromRow,track.row,eased);
out.lift = progress >= 1 ? 0 :hop;
out.scaleY = 1 - squash + (progress < 1 ? hop * HALF : 0);
out.scaleX = 1 + squash - Math.abs(wobble) * SKITTER_SQUASH;
out.angle = wobble * SKITTER_ANGLE;
out.shift = 0;
out.settle = easeOutCubic(progress);
out.moving = progress < 1;
return out;
}
function pivotMatrix(pivot,pose) {
const cos = Math.cos(pose.angle);
const sin = Math.sin(pose.angle);
const m11 = cos * pose.scaleX;
const m12 = sin * pose.scaleX;
const m21 = -sin * pose.scaleY;
const m22 = cos * pose.scaleY;
return [m11,m12,m21,m22,pivot.x - m11 * pivot.x - m21 * pivot.y + pose.shift,pivot.y - m12 * pivot.x - m22 * pivot.y];
}
function leanTarget(npc,hero) {
const reach = Math.max(Math.abs(hero.col - npc.col),Math.abs(hero.row - npc.row));
if (reach > LEAN_RANGE) return 0;
return Math.sign(hero.col - npc.col) * LEAN_ANGLE * (1 - reach / (LEAN_RANGE + 1));
}
function easeLean(note,aim) {
const dt = Math.min(Math.max(aim.now - note.at,0),LEAN_MS * 2);
note.at = aim.now;
note.lean = aim.reducedMotion ? 0 :lerp(note.lean,aim.target,1 - Math.exp(-dt / LEAN_MS));
return note.lean;
}
function noteTicks(note,reading) {
if (note.ticks === reading.ticks) return note;
const first = note.ticks === null;
Object.assign(note,{ from:first ? reading.share :ringShare(note,reading.now),ticks:reading.ticks,share:reading.share,at:first ? reading.now - RING_EASE_MS * 2 :reading.now });
return note;
}
function ringShare(note,now) {
return lerp(note.from,note.share,easeOutCubic(clamp01((now - note.at) / RING_EASE_MS)));
}
function popScale(note,now) {
return lerp(POP_FROM,1,easeOutCubic(clamp01((now - note.at) / RING_EASE_MS)));
}
function shudderOf(at,frame) {
const age = at === null ? SHUDDER_MS :frame.now - at;
if (frame.reducedMotion || age < 0 || age >= SHUDDER_MS) return 0;
return Math.sin((age / SHUDDER_MS) * SHUDDER_CYCLES * FULL_TURN) * SHUDDER_PX * (1 - age / SHUDDER_MS);
}

export { GLIDE_MS,phaseOf,bobOf,breathOf,noteCell,glidePose,pivotMatrix,leanTarget,easeLean,noteTicks,ringShare,popScale,shudderOf };
