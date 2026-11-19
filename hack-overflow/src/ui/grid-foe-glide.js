import { breathOf,easeLean,glidePose,leanTarget,noteCell,phaseOf,pivotMatrix,shudderOf } from '../game/npc-motion.js';
import { uiDrawArt } from './art-hook.js';

const FEET_TILES = 0.9;
const SHADOW = { tiles:0.62,down:0.9,alpha:0.7,lift:3,least:0.5 };
const MAX_NOTES = 32;
const STALE_MS = 4000;
const BREATH_MS = 1800;
const HALF = 0.5;
const NPC_NOTES = new Map();
const BOOKS = new WeakMap();

function uiBookOf(owner) {
if (!BOOKS.has(owner)) BOOKS.set(owner,new Map());
return BOOKS.get(owner);
}
function uiPrune(book,now) {
book.forEach(function (entry,id) { if (now - entry.track.seen > STALE_MS) book.delete(id); });
}
function uiPoseOf(book,foe,frame) {
const entry = book.get(foe.id) || { track:null,pose:{} };
entry.track = noteCell(entry.track,foe,frame.now);
book.set(foe.id,entry);
if (book.size > MAX_NOTES) uiPrune(book,frame.now);
return glidePose(entry.track,frame,entry.pose);
}
function uiPoseBegin(ctx,frame,spot) {
ctx.save();
const pivot = { x:spot.left + frame.tile * HALF,y:spot.top + frame.tile * FEET_TILES };
ctx.transform(...pivotMatrix(pivot,spot.pose));
}
function uiDrawShadow(ctx,frame,spot) {
const shrink = Math.max(SHADOW.least,1 - spot.lift * SHADOW.lift);
const size = frame.tile * SHADOW.tiles * shrink;
const alpha = ctx.globalAlpha;
ctx.globalAlpha = alpha * SHADOW.alpha * shrink;
uiDrawArt(ctx,'hero-shadow',{ left:spot.left + (frame.tile - size) * HALF,top:spot.top + frame.tile * SHADOW.down - size * SHADOW.down,size,dpr:frame.dpr });
ctx.globalAlpha = alpha;
}
function uiNpcNote(id) {
if (!NPC_NOTES.has(id)) NPC_NOTES.set(id,{ lean:0,at:0,shudderAt:null,mark:null,pose:{ scaleX:1,scaleY:1,angle:0,shift:0 } });
return NPC_NOTES.get(id);
}
function uiNpcPose(frame,npc) {
const note = uiNpcNote(npc.id);
const scale = breathOf(frame,BREATH_MS,phaseOf(npc.id));
const target = npc.hero ? leanTarget(npc.cell,npc.hero) :0;
note.pose.scaleX = scale;
note.pose.scaleY = scale;
note.pose.angle = easeLean(note,{ target,now:frame.now,reducedMotion:frame.reducedMotion });
note.pose.shift = shudderOf(note.shudderAt,frame);
return note.pose;
}
function uiNoteMark(id,reading) {
const note = uiNpcNote(id);
if (note.mark !== null && note.mark !== reading.mark) note.shudderAt = reading.now;
note.mark = reading.mark;
}
function uiNoteHp(id,reading) {
const note = uiNpcNote(id);
if (note.hp !== undefined && reading.hp > note.hp) note.shudderAt = reading.now;
note.hp = reading.hp;
}

export { uiBookOf,uiPoseOf,uiPoseBegin,uiDrawShadow,uiNpcPose,uiNoteMark,uiNoteHp };
