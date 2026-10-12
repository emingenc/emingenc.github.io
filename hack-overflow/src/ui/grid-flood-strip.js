import { uiEl } from './dom.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-power.css';
const CHIP = { label:'STAND DOWN',aria:'Stand down' };

function uiChipNode(run) {
const node = uiEl('button',{
className:'grid-power-chip is-action is-warn',text:CHIP.label,
attrs:{ type:'button','data-focus-key':'flood-stand-down','aria-label':CHIP.aria },
});
node.addEventListener('click',run);
return node;
}
function uiStandDownStrip(run) {
uiLinkStyle(STYLE_HREF);
const list = uiEl('div',{ className:'grid-power-chips',attrs:{ role:'group','aria-label':'Flood controls' },children:[uiChipNode(run)] });
return uiEl('div',{ className:'grid-power grid-flood-strip',children:[list] });
}
function uiHasFloodStrip(game) {
const own = Object.getOwnPropertyDescriptor(game,'drawPower');
return Boolean(own && own.get && own.get.isFloodStrip);
}
function uiHangFloodStrip(game,hooks) {
if (uiHasFloodStrip(game)) return;
let inner = game.drawPower;
const draw = function (app) {
return (inner ? inner(app) :null) || (hooks.live(app) ? uiStandDownStrip(() => hooks.standDown(app)) :null);
};
const read = () => draw;
read.isFloodStrip = true;
Object.defineProperty(game,'drawPower',{ configurable:true,enumerable:true,get:read,set:(next) => { inner = next; } });
}

export { uiHangFloodStrip };
