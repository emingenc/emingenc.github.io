import { noteTicks,popScale,ringShare } from '../game/npc-motion.js';
import { pulseAt } from '../game/wayfinding.js';

const COUNT_FULL = 3;
const URGENT_RATE = 2;
const NOTES = new Map();

function uiNoteOf(id) {
if (!NOTES.has(id)) NOTES.set(id,{ ticks:null,from:0,share:0,at:0 });
return NOTES.get(id);
}
function uiRead(frame,spot) {
const share = Math.min(spot.ticks / COUNT_FULL,1);
return noteTicks(uiNoteOf(spot.actor.id),{ ticks:spot.ticks,share,now:frame.now });
}
function uiRingShare(frame,spot) {
const note = uiRead(frame,spot);
return frame.reducedMotion ? note.share :ringShare(note,frame.now);
}
function uiRingPulse(frame,urgent) {
return pulseAt(urgent ? frame.now * URGENT_RATE :frame.now,frame.reducedMotion);
}
function uiPillPopBegin(ctx,frame,spot) {
const counting = spot.ticks !== null && !frame.reducedMotion;
const scale = counting ? popScale(uiRead(frame,spot),frame.now) :1;
ctx.save();
ctx.translate(spot.x,spot.y);
ctx.scale(scale,scale);
ctx.translate(-spot.x,-spot.y);
}

export { uiRingShare,uiRingPulse,uiPillPopBegin };
