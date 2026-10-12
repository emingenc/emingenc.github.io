import { uiEl } from './dom.js';

const POWER_LABEL = 'POWER';
const MAX_ROOMY = 3;

function uiChipClass(chip) {
const tone = chip.tone ? ' is-' + chip.tone : '';
const selected = chip.selected ? ' is-selected' :'';
return 'grid-power-chip' + (chip.selected === undefined ? ' is-action' :'') + tone + selected;
}
function uiChipAttrs(chip) {
const attrs = { type:'button','data-focus-key':'power-chip-' + chip.id,'aria-label':chip.aria || chip.label };
if (chip.selected !== undefined) attrs['aria-pressed'] = String(chip.selected);
return attrs;
}
function uiChipNode(chip,onChip) {
const children = chip.intent ? [uiEl('span',{ className:'grid-power-intent',text:chip.intent })] :[];
const node = uiEl('button',{ className:uiChipClass(chip),text:chip.label,attrs:uiChipAttrs(chip),children });
node.addEventListener('click',function () { onChip(chip); });
return node;
}
function uiPowerButton(view) {
const active = view.mode !== '';
const node = uiEl('button',{
className:'grid-power-btn' + (active ? ' is-on' :''),text:POWER_LABEL,
attrs:{ type:'button','data-focus-key':'power-toggle','aria-label':active ? 'Power: ' + view.mode.toLowerCase() :'Power','aria-pressed':String(active) },
});
node.addEventListener('click',function () { view.onPower(); });
return node;
}
function uiNote(className,text) {
return uiEl('span',{ className,text });
}
function uiPowerStrip(view) {
const notes = [view.mode && uiNote('grid-power-mode',view.mode),view.badge && uiNote('grid-power-badge',view.badge)].filter(Boolean);
const list = uiEl('div',{
className:'grid-power-chips' + (view.chips.length > MAX_ROOMY ? ' is-tight' :''),attrs:{ role:'group','aria-label':'Power controls' },
children:[...notes,...view.chips.map((chip) => uiChipNode(chip,view.onChip))],
});
const lent = view.trials ? [uiNote('grid-power-trials',view.trials)] :[];
return uiEl('div',{ className:'grid-power' + (lent.length ? ' has-trials' :''),children:[...lent,uiPowerButton(view),list] });
}

export { uiPowerStrip };
