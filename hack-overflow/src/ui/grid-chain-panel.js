import { uiRenderApp } from './app.js';
import { uiEl } from './dom.js';
import { CONTINUE_KEY,uiChainCard,uiLineText } from './grid-chain-card.js';

const CELL_KEY = 'chain-cell-';
const BACK_KEY = 'chain-back';
const NEXT_KEY = 'chain-next';
const WALK_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','f','F',' ','Enter','m','M','o','O','?']);

function uiSolved(panel) {
panel.said = uiLineText(panel.step.found);
if (panel.onSolve) panel.onSolve();
}
function uiChainTap(panel,index) {
if (panel.done) return { slip:false,done:true };
const result = panel.step.puzzle.tap(panel.puzzle,index);
panel.puzzle = result.state;
if (result.line) panel.said = result.line;
panel.done = result.done;
if (result.done) uiSolved(panel);
return { slip:result.slip,done:result.done };
}
function uiCellButton(app,panel,spot) {
const { cell,index } = spot;
const node = uiEl('button',{
className:'grid-chain-cell is-' + cell.tone,text:cell.label,
attrs:{ type:'button','data-focus-key':CELL_KEY + index,'aria-label':cell.label },
});
node.addEventListener('click',function () {
uiChainTap(panel,index);
app.lastFocusKey = panel.done && panel.closes ? CONTINUE_KEY :CELL_KEY + index;
uiRenderApp(app);
});
return node;
}
function uiNextButton(panel) {
const node = uiEl('button',{
className:'btn btn-ghost grid-chain-next',text:'NEXT LEAD: ' + panel.next.name,
attrs:{ type:'button','data-focus-key':NEXT_KEY,'aria-label':'Next lead: ' + panel.next.name },
});
node.addEventListener('click',function () { panel.next.go(); });
return node;
}
function uiExitButton(panel) {
const done = panel.done;
const node = uiEl('button',{
className:'btn btn-ghost grid-chain-exit' + (done ? ' is-done' :''),text:done ? 'CONTINUE' :'BACK',
attrs:{ type:'button','data-focus-key':done ? CONTINUE_KEY :BACK_KEY,'aria-label':done ? 'Continue' :'Back, leave the puzzle' },
});
node.addEventListener('click',function () { panel.close(); });
return node;
}
function uiTrapKeys(overlay,panel) {
overlay.addEventListener('keydown',function (event) {
if (event.key === 'Escape') {
event.stopPropagation();
panel.close();
} else if (WALK_KEYS.has(event.key)) {
event.stopPropagation();
}
});
overlay.addEventListener('keyup',function (event) { event.stopPropagation(); });
}
function uiIntro(panel) {
return panel.step.intro.map((line) => uiEl('p',{ className:'grid-chain-intro',text:uiLineText(line) }));
}
function uiSeal(overlay,panel,node) {
uiTrapKeys(overlay,panel);
overlay.addEventListener('click',function (event) { if (event.target === overlay) node.focus(); });
return overlay;
}
function uiPuzzleBox(panel,view,buttons) {
const cells = uiEl('div',{ className:'grid-chain-cells' + (view.columns ? ' is-cols-' + view.columns :''),attrs:{ role:'group','aria-label':'Puzzle cells' },children:buttons });
const said = panel.said ? [uiEl('p',{ className:'grid-chain-said',text:panel.said })] :[];
const next = panel.done && panel.next ? [uiNextButton(panel)] :[];
return uiEl('div',{
className:'grid-chain-panel',
children:[
uiEl('h2',{ className:'grid-chain-title',text:view.title }),
...uiIntro(panel),
uiEl('p',{ className:'grid-chain-caption',text:view.caption }),
cells,
...said,
uiEl('p',{ className:'grid-chain-counter',attrs:{ role:'status' },text:view.counter }),
...next,
uiExitButton(panel),
],
});
}
function uiChainPanel(app,panel) {
if (panel.done && panel.closes) {
const card = uiChainCard(app,panel);
return uiSeal(card.overlay,panel,card.button);
}
const view = panel.step.puzzle.view(panel.puzzle);
const buttons = view.cells.map((cell,index) => uiCellButton(app,panel,{ cell,index }));
const overlay = uiEl('div',{ className:'grid-chain',attrs:{ role:'dialog','aria-modal':'true','aria-label':view.title },children:[uiPuzzleBox(panel,view,buttons)] });
return uiSeal(overlay,panel,buttons[0]);
}

export { uiChainPanel,uiChainTap };
