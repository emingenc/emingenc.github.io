import { cellAt } from '../game/world.js';
import { UI_SPRITE_SIZE } from './grid-sprites.js';


const UI_SECTOR_ACCENTS = { hash:'primary','two-pointers':'cyan',stack:'magenta','binary-search':'amber',window:'bright' };
const UI_SAFEHOUSE_ACCENT = 'dim';
const UI_RIG_ACCENTS = { ledger:'cyan',context:'magenta',forge:'red',stream:'amber' };
const UI_GROUND = new Set(['floor','cache','terminal','door','gate','core','kernel-door','kernel']);
const UI_PULSE = { ms:1600,low:0.45,rest:0.8 };
const UI_LABEL = { scale:0.5,advance:0.4,inset:2,font:'px VT323, monospace',top:0.37,bottom:0.72 };

function uiAccentOf(family) {
return family && Object.hasOwn(UI_SECTOR_ACCENTS,family) ? UI_SECTOR_ACCENTS[family] :UI_SAFEHOUSE_ACCENT;
}
function uiRigAccent(rigId,family = null) {
return Object.hasOwn(UI_RIG_ACCENTS,rigId) ? UI_RIG_ACCENTS[rigId] :uiAccentOf(family);
}
function uiIsGround(world,cell) {
const entry = cellAt(world,cell);
return entry !== null && UI_GROUND.has(entry.kind);
}
function uiWallAt(world,cell) {
const entry = cellAt(world,cell);
return entry !== null && entry.kind === 'wall';
}
function uiPulse(frame) {
if (frame.reducedMotion) return UI_PULSE.rest;
const wave = (1 + Math.sin((frame.now / UI_PULSE.ms) * 2 * Math.PI)) / 2;
return UI_PULSE.low + wave * (1 - UI_PULSE.low);
}
function uiLabelWidth(text) {
return text.length * UI_LABEL.scale * UI_LABEL.advance + (UI_LABEL.inset + 1) / UI_SPRITE_SIZE;
}

export { UI_SECTOR_ACCENTS, UI_SAFEHOUSE_ACCENT, UI_RIG_ACCENTS, UI_GROUND, UI_LABEL, uiAccentOf, uiRigAccent, uiIsGround, uiWallAt, uiPulse, uiLabelWidth };
