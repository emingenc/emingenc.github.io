import { uiEl, uiPointerIsCoarse } from './dom.js';
import { MAX_LINE_CHIPS } from '../logic/index.js';

function uiTrayChip(label,position,isCurrent) {
return uiEl('button',{
className:'chip tray-chip',
text:label,
attrs:{
type:'button',
'data-action':'chip-' + position,
'data-focus-key':'chip-' + position,
'data-tray-position':String(position),
tabindex:isCurrent ? '0' :'-1',
},
});
}
function uiChipTray(ctx) {
const current = ctx.app.trayFocusIndex;
const chips = ctx.view.lock.tray.map(function (label,position) {
return uiTrayChip(label,position,position === current);
});
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
const text = 'ARROWS move chip | ENTER/SPACE add | ⌫ backspace | SHIFT+⌫ clear | R run | S submit | M sound | ESC menu';
return uiEl('p',{ className:'key-legend',text:text });
}
function uiTraySection(ctx) {
const children = [uiRevealedLine(ctx),uiChipTray(ctx),uiTrayNote(ctx)];
if (!uiPointerIsCoarse()) children.push(uiKeyLegend());
return uiEl('div',{ className:'tray-section',children:children });
}

export { uiTraySection };
