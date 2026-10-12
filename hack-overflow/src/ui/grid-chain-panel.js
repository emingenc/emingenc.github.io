import { uiRenderApp } from './app.js';
import { uiEl } from './dom.js';

const CELL_KEY = 'chain-cell-';
const BACK_KEY = 'chain-back';
const CONTINUE_KEY = 'chain-continue';
const WALK_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','f','F',' ','Enter']);

function uiChainTap(panel,index) {
if (panel.done) return { slip:false,done:true };
const result = panel.step.puzzle.tap(panel.puzzle,index);
panel.puzzle = result.state;
if (result.line) panel.said = result.line;
panel.done = result.done;
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
app.lastFocusKey = CELL_KEY + index;
uiRenderApp(app);
});
return node;
}
function uiExitButton(panel) {
const done = panel.done;
const node = uiEl('button',{
className:'btn btn-ghost grid-chain-exit' + (done ? ' is-done' :''),text:done ? 'CONTINUE' :'BACK',
attrs:{ type:'button','data-focus-key':done ? CONTINUE_KEY :BACK_KEY,'aria-label':done ? 'Continue' :'Back, leave the puzzle' },
});
node.addEventListener('click',function () { panel.close(panel.done); });
return node;
}
function uiTrapKeys(overlay,panel) {
overlay.addEventListener('keydown',function (event) {
if (event.key === 'Escape') {
event.stopPropagation();
panel.close(panel.done);
} else if (WALK_KEYS.has(event.key)) {
event.stopPropagation();
}
});
overlay.addEventListener('keyup',function (event) { event.stopPropagation(); });
}
function uiChainPanel(app,panel) {
const view = panel.step.puzzle.view(panel.puzzle);
const buttons = view.cells.map((cell,index) => uiCellButton(app,panel,{ cell,index }));
const cells = uiEl('div',{ className:'grid-chain-cells',attrs:{ role:'group','aria-label':'Puzzle cells' },children:buttons });
const said = panel.said ? [uiEl('p',{ className:'grid-chain-said',text:panel.said })] :[];
const box = uiEl('div',{
className:'grid-chain-panel',
children:[
uiEl('h2',{ className:'grid-chain-title',text:view.title }),
uiEl('p',{ className:'grid-chain-caption',text:view.caption }),
cells,
...said,
uiEl('p',{ className:'grid-chain-counter',attrs:{ role:'status' },text:view.counter }),
uiExitButton(panel),
],
});
const overlay = uiEl('div',{ className:'grid-chain',attrs:{ role:'dialog','aria-modal':'true','aria-label':view.title },children:[box] });
uiTrapKeys(overlay,panel);
overlay.addEventListener('click',function (event) { if (event.target === overlay) buttons[0].focus(); });
return overlay;
}

export { uiChainPanel,uiChainTap };
