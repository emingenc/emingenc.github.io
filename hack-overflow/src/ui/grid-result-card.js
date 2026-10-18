import { uiRenderApp } from './app.js';
import { uiEl } from './dom.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/result-card.css';
const KEY_PREFIX = 'result-card-';
const STAGE_KEY = 'grid-stage';
const STEP_PCT = 5;
const FULL_PCT = 100;
const WALK_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','f','F',' ','Enter']);
const CARDS = new WeakMap();

function uiBarClass(value,max) {
if (!(max > 0) || !(value > 0)) return 'rc-w-0';
const steps = Math.min(FULL_PCT / STEP_PCT,Math.max(1,Math.round(value / max * FULL_PCT / STEP_PCT)));
return 'rc-w-' + steps * STEP_PCT;
}
function uiFact(fact) {
return uiEl('div',{ className:'rc-fact',children:[
uiEl('dt',{ className:'rc-fact-label',text:fact.label }),
uiEl('dd',{ className:'rc-fact-value',text:String(fact.value) }),
] });
}
function uiBar(bar) {
const fill = uiEl('div',{ className:'rc-bar-fill is-' + bar.tone + ' ' + uiBarClass(bar.value,bar.max) });
return uiEl('div',{ className:'rc-bar',children:[
uiEl('span',{ className:'rc-bar-label',text:bar.label }),
uiEl('div',{ className:'rc-bar-track',attrs:{ role:'img','aria-label':bar.label + ' ' + bar.value + ' of ' + bar.max },children:[fill] }),
uiEl('span',{ className:'rc-bar-value',text:String(bar.value) }),
] });
}
function uiListPart(model) {
if (!model.list.length) return [];
const title = model.listTitle ? [uiEl('p',{ className:'rc-list-title',text:model.listTitle })] :[];
const rows = model.list.map((row) => uiEl('li',{ className:'rc-row is-' + row.tone,text:row.text }));
return [...title,uiEl('ul',{ className:'rc-list',children:rows })];
}
function uiPrimaryOf(model) {
return model.actions.find((action) => action.primary) || model.actions[0];
}
function uiActionButton(action,choose) {
const node = uiEl('button',{
className:'btn rc-action' + (action.primary ? ' is-primary' :''),text:action.label,
attrs:{ type:'button','data-focus-key':KEY_PREFIX + action.id },
});
node.addEventListener('click',function () { choose(action.id); });
return node;
}
function uiTrapKeys(overlay,model,choose) {
overlay.addEventListener('keydown',function (event) {
if (event.key === 'Escape') {
event.stopPropagation();
choose(model.escapeId);
} else if (WALK_KEYS.has(event.key)) {
event.stopPropagation();
}
});
overlay.addEventListener('keyup',function (event) { event.stopPropagation(); });
}
function uiBuildCard(model,choose) {
const buttons = model.actions.map((action) => uiActionButton(action,choose));
const bars = model.bars.length ? [uiEl('div',{ className:'rc-bars',children:model.bars.map(uiBar) })] :[];
const note = model.note ? [uiEl('p',{ className:'rc-note',text:model.note })] :[];
const head = uiEl('div',{ className:'rc-head',children:[
uiEl('h2',{ className:'rc-title',text:model.title }),
uiEl('span',{ className:'rc-badge is-' + model.tone,text:model.badge }),
] });
const box = uiEl('div',{ className:'rc-card',children:[
head,
uiEl('dl',{ className:'rc-facts',children:model.facts.map(uiFact) }),
...bars,
...uiListPart(model),
...note,
uiEl('div',{ className:'rc-actions',children:buttons }),
] });
const overlay = uiEl('div',{ className:'rc-overlay',attrs:{ role:'dialog','aria-modal':'true','aria-label':model.title },children:[box] });
const primary = buttons[model.actions.indexOf(uiPrimaryOf(model))];
overlay.addEventListener('click',function (event) { if (event.target === overlay && primary) primary.focus(); });
uiTrapKeys(overlay,model,choose);
return overlay;
}
function uiUnhangCard(game,hung) {
const { before,plain,read } = hung;
const own = Object.getOwnPropertyDescriptor(game,'drawPower');
if (!own || own.get !== read) return;
if (!before) delete game.drawPower;
else if (before.get) Object.defineProperty(game,'drawPower',before);
else Object.defineProperty(game,'drawPower',{ ...before,value:plain });
}
function uiHangCard(game,card) {
const before = Object.getOwnPropertyDescriptor(game,'drawPower');
let plain = before && !before.get ? before.value :null;
const under = () => (before && before.get ? before.get.call(game) :plain);
const draw = function (app) {
if (card.open) return card.overlay;
const inner = under();
return inner ? inner(app) :null;
};
const read = () => (card.open ? draw :under());
const write = function (next) {
if (before && before.set) before.set.call(game,next);
else plain = next;
};
Object.defineProperty(game,'drawPower',{ configurable:true,enumerable:before ? before.enumerable :true,get:read,set:write });
return () => uiUnhangCard(game,{ before,plain,read });
}
function uiResultCardOpen(app) {
return CARDS.has(app);
}
function uiCloseResultCard(app,id = null) {
const card = CARDS.get(app);
if (!card) return;
CARDS.delete(app);
card.open = false;
card.undo();
card.resolve(id);
}
function uiChoose(app,id) {
if (!uiResultCardOpen(app)) return;
uiCloseResultCard(app,id);
app.lastFocusKey = STAGE_KEY;
uiRenderApp(app);
}
async function uiShowResultCard(app,model) {
await uiLinkStyle(STYLE_HREF);
uiCloseResultCard(app,null);
return new Promise(function (resolve) {
const card = { open:true,overlay:null,resolve,undo:null };
card.overlay = uiBuildCard(model,(id) => uiChoose(app,id));
card.undo = uiHangCard(app.game,card);
CARDS.set(app,card);
uiWalkReleaseAll(app);
if (app.game.walk) app.game.walk.plan = null;
app.lastFocusKey = KEY_PREFIX + uiPrimaryOf(model).id;
uiRenderApp(app);
});
}

export { uiBarClass,uiCloseResultCard,uiResultCardOpen,uiShowResultCard };
