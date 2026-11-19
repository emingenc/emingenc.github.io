import { clamp01,easeOutCubic } from '../ease.js';
import { SHOW_PERIOD } from './armored.js';

const FADE_IN_MS = 180;
const FADE_OUT_MS = 120;
const RISE_PX = 2;

function newShowNote() {
return { shown:null,at:0,col:0,row:0 };
}
function noteShown(note,view) {
const first = note.shown === null;
if (view.awake) Object.assign(note,{ col:view.col,row:view.row });
if (first || note.shown !== view.awake) note.at = first ? view.now - FADE_IN_MS : view.now;
note.shown = view.awake;
return note;
}
function showFade(note,frame) {
if (frame.reducedMotion) return { alpha:note.shown ? 1 :0,rise:0 };
const age = frame.now - note.at;
if (note.shown) return { alpha:easeOutCubic(clamp01(age / FADE_IN_MS)),rise:RISE_PX * (1 - clamp01(age / FADE_IN_MS)) };
return { alpha:1 - clamp01(age / FADE_OUT_MS),rise:0 };
}
function revealCell(mite) {
return mite.ring[(mite.at + SHOW_PERIOD - mite.phase) % mite.ring.length];
}

export { FADE_IN_MS,FADE_OUT_MS,newShowNote,noteShown,showFade,revealCell };
