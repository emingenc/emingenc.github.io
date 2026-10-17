import { uiEl } from './dom.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/grid-power.css';
const CHIPS = {
standDown:{ label:'STAND DOWN',aria:'Stand down',key:'flood-stand-down',tone:' is-warn' },
hold:{ label:'HOLD',aria:'Hold the lock against the write-protect flood',key:'flood-hold',tone:'' },
letIt:{ label:'LET IT',aria:'Let ROOT rewrite the lock',key:'flood-let-it',tone:' is-warn' },
};

function uiChipNode(chip,run) {
const node = uiEl('button',{
className:'grid-power-chip is-action' + chip.tone,text:chip.label,
attrs:{ type:'button','data-focus-key':chip.key,'aria-label':chip.aria },
});
node.addEventListener('click',run);
return node;
}
function uiStrip(chips) {
uiLinkStyle(STYLE_HREF);
const list = uiEl('div',{ className:'grid-power-chips',attrs:{ role:'group','aria-label':'Flood controls' },children:chips.map(([chip,run]) => uiChipNode(chip,run)) });
return uiEl('div',{ className:'grid-power grid-flood-strip',children:[list] });
}
function uiHasFloodStrip(game) {
const own = Object.getOwnPropertyDescriptor(game,'drawPower');
return Boolean(own && own.get && own.get.isFloodStrip);
}
function uiChipsFor(app,hooks) {
if (hooks.offered && hooks.offered(app)) return [[CHIPS.hold,() => hooks.hold(app)],[CHIPS.letIt,() => hooks.letIt(app)]];
return hooks.live(app) ? [[CHIPS.standDown,() => hooks.standDown(app)]] :[];
}
function uiHangFloodStrip(game,hooks) {
if (uiHasFloodStrip(game)) return;
let inner = game.drawPower;
const draw = function (app) {
const chips = uiChipsFor(app,hooks);
return (inner ? inner(app) :null) || (chips.length > 0 ? uiStrip(chips) :null);
};
const read = () => draw;
read.isFloodStrip = true;
Object.defineProperty(game,'drawPower',{ configurable:true,enumerable:true,get:read,set:(next) => { inner = next; } });
}

export { uiHangFloodStrip };
