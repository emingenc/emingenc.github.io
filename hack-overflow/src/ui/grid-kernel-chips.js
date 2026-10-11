import { uiEl } from './dom.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLES = ['styles/lazy/grid-power.css','styles/lazy/kernel.css'];
const KEY_PREFIX = 'kernel-chip-';

function uiChipClass(chip) {
const selected = chip.selected ? ' is-selected' :'';
return 'grid-power-chip' + (chip.selected === undefined ? ' is-action' :'') + (chip.tone ? ' is-' + chip.tone :'') + selected;
}
function uiChipAttrs(chip) {
const attrs = { type:'button','data-focus-key':KEY_PREFIX + chip.id,'aria-label':chip.aria || chip.label };
if (chip.selected !== undefined) attrs['aria-pressed'] = String(chip.selected);
return attrs;
}
function uiChipNode(chip) {
const node = uiEl('button',{ className:uiChipClass(chip),text:chip.label,attrs:uiChipAttrs(chip) });
node.addEventListener('click',function () { chip.run(); });
return node;
}
function uiNote(className,text) {
return text ? uiEl('span',{ className,text }) :null;
}
function uiHead(view) {
return uiEl('div',{
className:'kernel-head',attrs:{ 'data-kernel-phase':String(view.n),role:'group','aria-label':view.head + ', ' + view.count },
children:[uiEl('span',{ className:'kernel-phase',text:view.head }),uiEl('span',{ className:'kernel-count',text:view.count })],
});
}
function uiKernelStrip(view) {
STYLES.forEach(uiLinkStyle);
const lines = [uiNote('kernel-ask',view.ask),uiNote('kernel-tele',view.tele),uiNote('kernel-note',view.note),uiNote('kernel-fiction',view.fiction)];
const notes = uiEl('div',{ className:'kernel-notes',children:lines.filter(Boolean) });
const list = uiEl('div',{ className:'grid-power-chips',attrs:{ role:'group','aria-label':'Kernel controls' },children:view.chips.map(uiChipNode) });
return uiEl('div',{ className:'grid-power kernel-strip',children:[uiHead(view),notes,list] });
}
function uiOverlay(game,name,overlay) {
let inner = game[name];
Object.defineProperty(game,name,{ configurable:true,enumerable:true,get:() => overlay(inner),set:(next) => { inner = next; } });
return function () {
Object.defineProperty(game,name,{ value:inner,writable:true,configurable:true,enumerable:true });
};
}
function uiPowerOverlay(app,ui) {
return (inner) => (ui.view ? () => uiKernelStrip(ui.view(app)) :inner);
}
function uiCastOverlay(app,ui) {
return (inner) => (ui.paint ? function (ctx,again,frame) {
if (inner) inner(ctx,again,frame);
ui.paint(ctx,frame);
} :inner);
}
function uiHangKernel(app) {
const game = app.game;
if (game.kernelUi) return game.kernelUi;
const ui = { view:null,paint:null,undo:[] };
ui.undo.push(uiOverlay(game,'drawPower',uiPowerOverlay(app,ui)),uiOverlay(game,'drawCast',uiCastOverlay(app,ui)));
game.kernelUi = ui;
return ui;
}
function uiDropKernel(app) {
const ui = app.game.kernelUi;
if (!ui) return;
ui.undo.forEach((undo) => undo());
delete app.game.kernelUi;
}

export { uiKernelStrip,uiHangKernel,uiDropKernel };
