import { uiStruckChipPositions, uiSweepStruckChips } from './breach-exploits.js';
import { uiEl, uiPointerIsCoarse } from './dom.js';
import { MAX_LINE_CHIPS } from '../logic/index.js';

const UI_STRUCK_CHIP_WHY = ', struck: the answer does not need it';
function uiTrayChipClass(chip) {
return chip.isStruck ? 'chip tray-chip chip-struck' :'chip tray-chip';
}
function uiTrayChip(chip) {
const attrs = {
type:'button',
'data-action':'chip-' + chip.position,
'data-focus-key':'chip-' + chip.position,
'data-tray-position':String(chip.position),
tabindex:chip.isCurrent ? '0' :'-1',
};
if (chip.isStruck) attrs['aria-label'] = chip.label + UI_STRUCK_CHIP_WHY;
return uiEl('button',{ className:uiTrayChipClass(chip),text:chip.label,attrs });
}
function uiChipTray(ctx) {
const current = ctx.app.trayFocusIndex;
const struck = uiStruckChipPositions(ctx.app);
const chips = ctx.view.lock.tray.map(function (label,position) {
return uiTrayChip({ label,position,isCurrent:position === current,isStruck:struck.includes(position) });
});
uiSweepStruckChips(ctx.app,struck.map(function (position) { return chips[position]; }));
const full = ctx.view.lock.line.length >= MAX_LINE_CHIPS;
return uiEl('div',{
className:'chip-tray' + (full ? ' chip-tray-full' :''),
attrs:{ role:'group','aria-label':'Chips' },
children:chips,
});
}
function uiTrayNote(ctx) {
const full = ctx.view.lock.line.length >= MAX_LINE_CHIPS;
const text = full ? 'Line full — remove a chip first.' :'Up to ' + MAX_LINE_CHIPS + ' chips.';
return uiEl('p',{ className:'tray-note',text:text });
}
function uiRevealedLine(ctx) {
if (!ctx.view.lock.revealed) return null;
return uiEl('p',{ className:'revealed-line',text:'Answer: ' + ctx.view.lock.revealedText });
}
function uiKeyLegend() {
const text = 'ARROWS move chip | ENTER/SPACE add | ⌫ backspace | SHIFT+⌫ clear | R PROBE | S BREACH | 1/2 exploits | M sound | ESC menu';
return uiEl('p',{ className:'key-legend',text:text });
}
function uiTraySection(ctx) {
const children = [uiRevealedLine(ctx),uiChipTray(ctx),uiTrayNote(ctx)];
if (!uiPointerIsCoarse()) children.push(uiKeyLegend());
return uiEl('div',{ className:'tray-section',children:children });
}

export { uiTraySection };
