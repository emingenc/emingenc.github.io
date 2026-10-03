import { GAME_EVENT } from '../game/game-events.js';
import { uiEl, uiQs, uiPrefersReducedMotion, UI_ROOT_ID } from './dom.js';
import { uiGameBus } from './bus.js';

const UI_SLOT_MARKER = '{slot}';
const UI_CHIP_SNAP_MS = 150;
const UI_CHIP_DROP_MS = 160;
const UI_GHOST_BOX = ['left','top','width','height'];
let uiChipMotion = null;
function uiWatchChipMotion() {
if (uiChipMotion) return uiChipMotion;
uiChipMotion = { addedAt:-Infinity,dropped:null };
const bus = uiGameBus();
bus.on(GAME_EVENT.CHIP_ADD,function () { uiChipMotion.addedAt = performance.now(); });
[GAME_EVENT.CHIP_REMOVE,GAME_EVENT.LINE_CLEAR].forEach(function (type) { bus.on(type,uiNoteChipDrop); });
return uiChipMotion;
}
function uiNoteChipDrop() {
uiChipMotion.addedAt = -Infinity;
uiChipMotion.dropped = { at:performance.now(),chips:uiMountedLineChips() };
}
function uiMountedLineChips() {
const root = uiQs(UI_ROOT_ID);
const column = root ? root.querySelector('.lock-right') :null;
const line = column ? column.querySelector('.editor-content') :null;
if (!line || typeof column.getBoundingClientRect !== 'function') return [];
const origin = column.getBoundingClientRect();
return Array.from(line.children).filter(uiIsLineChip).map(function (chip) { return uiChipBox(chip,origin); });
}
function uiIsLineChip(node) {
return String(node.className).split(' ').indexOf('line-chip') !== -1;
}
function uiChipBox(chip,origin) {
const box = chip.getBoundingClientRect();
return { label:chip.textContent,left:box.left - origin.left,top:box.top - origin.top,width:box.width,height:box.height };
}
function uiSnapNewestChip(chips) {
const age = Math.round(performance.now() - uiWatchChipMotion().addedAt);
const newest = chips[chips.length - 1];
if (!newest || age >= UI_CHIP_SNAP_MS) return;
newest.className += ' line-chip-snap';
newest.style.animationDelay = -age + 'ms';
newest.style.setProperty('--chip-snap',UI_CHIP_SNAP_MS + 'ms');
}
function uiRemovedChips(before,line) {
let next = 0;
return before.filter(function (chip) {
const kept = next < line.length && chip.label === line[next];
if (kept) next += 1;
return !kept;
});
}
const uiDroppingByApp = new WeakMap();
function uiDroppingChips(ctx) {
const motion = uiWatchChipMotion();
const dropped = motion.dropped;
motion.dropped = null;
const now = performance.now();
let chips = uiDroppingByApp.get(ctx.app) || [];
if (dropped) chips = chips.concat(uiRemovedChips(dropped.chips,ctx.view.lock.line).map(function (chip) { return { ...chip,at:dropped.at }; }));
chips = chips.filter(function (chip) { return now - chip.at < UI_CHIP_DROP_MS; });
uiDroppingByApp.set(ctx.app,chips);
return chips;
}
function uiChipGhost(chip,age) {
const ghost = uiEl('span',{ className:'line-chip-drop',text:chip.label,attrs:{ 'aria-hidden':'true' } });
UI_GHOST_BOX.forEach(function (side) { ghost.style[side] = chip[side] + 'px'; });
ghost.style.animationDelay = -age + 'ms';
ghost.style.setProperty('--chip-drop',UI_CHIP_DROP_MS + 'ms');
return ghost;
}
function uiChipDropGhosts(ctx) {
const chips = uiDroppingChips(ctx);
if (uiPrefersReducedMotion()) return [];
const now = performance.now();
return chips.map(function (chip) { return uiChipGhost(chip,Math.round(now - chip.at)); });
}
function uiCodeLineIndent(line) {
return line.length - line.trimStart().length;
}
function uiPlainCodeLine(line,lineNumber) {
const indent = uiCodeLineIndent(line);
const textSpan = uiEl('span',{ className:'code-line-text',text:line.trimStart() });
textSpan.style.paddingLeft = indent + 'ch';
return uiEl('div',{
className:'code-line',
children:[uiEl('span',{ className:'code-line-num',text:String(lineNumber) }),textSpan],
});
}
function uiLineChip(text,position,hasError) {
return uiEl('button',{
className:'chip line-chip' + (hasError ? ' chip-error' :''),
text:text,
attrs:{
type:'button',
'data-action':'line-remove-' + position,
'data-focus-key':'line-chip-' + position,
'aria-label':'Remove ' + text + ' from the line',
},
});
}
function uiEditorChips(lineTexts,markIndex) {
return lineTexts.map(function (text,position) { return uiLineChip(text,position,position === markIndex); });
}
function uiSlotIndent(skeleton) {
const slotLine = skeleton.find(function (line) { return line.indexOf(UI_SLOT_MARKER) !== -1; });
return slotLine.indexOf(UI_SLOT_MARKER);
}
function uiEditorRow(ctx,lineNumber) {
const indent = uiSlotIndent(ctx.problem.skeleton);
const markIndex = ctx.syntax.hasError ? ctx.syntax.chip :null;
const chips = uiEditorChips(ctx.view.lock.line,markIndex);
uiSnapNewestChip(chips);
const caret = uiEl('span',{ className:'caret',attrs:{ 'aria-hidden':'true' } });
const content = uiEl('span',{
className:'code-line-text editor-content',
children:chips.concat([caret]),
});
content.style.paddingLeft = indent + 'ch';
return uiEl('div',{
className:'code-line editor-row',
children:[uiEl('span',{ className:'code-line-num',text:String(lineNumber) }),content],
});
}
function uiCodePanelLine(ctx,line,index) {
const lineNumber = index + 1;
return line.indexOf(UI_SLOT_MARKER) !== -1 ? uiEditorRow(ctx,lineNumber) :uiPlainCodeLine(line,lineNumber);
}
function uiCodePanel(ctx) {
const lines = ctx.problem.skeleton.map(function (line,index) { return uiCodePanelLine(ctx,line,index); });
return uiEl('div',{ className:'code-panel',attrs:{ role:'group','aria-label':'Code' },children:lines });
}

export { UI_SLOT_MARKER, uiCodePanel, uiChipDropGhosts };
