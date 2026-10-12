import { uiEl } from './dom.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-power.css';
const CHIP = { label:'STAND DOWN',aria:'Stand down the counter defence' };

function uiChipNode(run) {
const node = uiEl('button',{
className:'grid-power-chip is-action is-warn',text:CHIP.label,
attrs:{ type:'button','data-focus-key':'siege-stand-down','aria-label':CHIP.aria },
});
node.addEventListener('click',run);
return node;
}
function uiStandDownStrip(run) {
uiLinkStyle(STYLE_HREF);
const list = uiEl('div',{ className:'grid-power-chips',attrs:{ role:'group','aria-label':'Counter defence controls' },children:[uiChipNode(run)] });
return uiEl('div',{ className:'grid-power grid-siege-strip',children:[list] });
}
function uiIsHung(game) {
const own = Object.getOwnPropertyDescriptor(game,'drawPower');
return Boolean(own && own.get && own.get.isSiegeStrip);
}
function uiHangSiegeStrip(game,hooks) {
if (uiIsHung(game)) return;
const before = Object.getOwnPropertyDescriptor(game,'drawPower');
let plain = before && !before.get ? before.value :null;
const under = () => (before && before.get ? before.get.call(game) :plain);
const draw = function (app) {
const inner = under();
return (inner ? inner(app) :null) || (hooks.live(app) ? uiStandDownStrip(() => hooks.standDown(app)) :null);
};
const read = () => draw;
read.isSiegeStrip = true;
const write = function (next) {
if (before && before.set) before.set.call(game,next);
else plain = next;
};
Object.defineProperty(game,'drawPower',{ configurable:true,enumerable:true,get:read,set:write });
}

export { uiHangSiegeStrip };
