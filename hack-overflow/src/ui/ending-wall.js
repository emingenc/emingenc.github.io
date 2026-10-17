import { wallOf } from '../game/credits.js';
import { rankStats } from '../game/rank-stats.js';
import { uiEl } from './dom.js';
import { BIT_BODY,uiBitWears,uiReadPalette,uiSizeCanvas } from './ending-credits-art.js';
import { BIT_MARKS,uiPaintRows } from './grid-chain-bit.js';

const MEDAL = { rows:['.rr..rr.','..rrrr..','.mmmmmm.','mmwwwwmm','mmwmmwmm','mmwwwwmm','.mmmmmm.','..mmmm..'],ink:{ r:'red',m:'amber',w:'bright' } };
const FOLDER = { rows:['.ccc....','cccccccc','cppppppc','cppppppc','cppppppc','cccccccc'],ink:{ c:'cyan',p:'panel' } };
const FADED = 'border';
const SLOT_PIXEL = 5;
const PORTRAIT_PIXEL = 14;
const PERCENT = 100;
const SLOT_KINDS = Object.freeze({ medal:MEDAL,file:FOLDER });

function faded(art) {
return { rows:art.rows,ink:Object.fromEntries(Object.keys(art.ink).map((glyph) => [glyph,FADED])) };
}
function centred(view,art,pixel) {
return { left:(view.width - art.rows[0].length * pixel) / 2,top:(view.height - art.rows.length * pixel) / 2,pixel };
}
function paintPin(view,palette,spec) {
const spot = { palette,...centred(view,BIT_BODY,SLOT_PIXEL) };
uiPaintRows(view.ctx,faded(BIT_BODY),spot);
if (spec.held) uiPaintRows(view.ctx,BIT_MARKS[spec.id],spot);
}
function uiPaintSlot(canvas) {
const view = uiSizeCanvas(canvas);
if (!view) return;
const spec = { kind:canvas.getAttribute('data-mark'),id:canvas.getAttribute('data-id'),held:canvas.getAttribute('data-held') === 'true' };
const palette = uiReadPalette(canvas);
if (spec.kind === 'pin') return paintPin(view,palette,spec);
const art = SLOT_KINDS[spec.kind];
uiPaintRows(view.ctx,spec.held ? art :faded(art),{ palette,...centred(view,art,SLOT_PIXEL) });
}
function uiPaintPortrait(canvas,wears) {
const view = uiSizeCanvas(canvas);
if (!view) return;
const spot = { palette:uiReadPalette(canvas),...centred(view,BIT_BODY,PORTRAIT_PIXEL) };
uiPaintRows(view.ctx,BIT_BODY,spot);
wears.forEach((id) => uiPaintRows(view.ctx,BIT_MARKS[id],spot));
}
function uiSyncWall(root,ext) {
root.querySelectorAll('.ending-slot-mark').forEach(uiPaintSlot);
const portrait = root.querySelector('.ending-portrait');
if (portrait) uiPaintPortrait(portrait,uiBitWears(ext));
}
function uiSlot(kind,entry) {
const canvas = uiEl('canvas',{ className:'ending-slot-mark',attrs:{ 'aria-hidden':'true','data-mark':kind,'data-id':entry.id,'data-held':String(entry.held) } });
return uiEl('li',{
className:'ending-slot' + (entry.held ? ' is-held' :''),
children:[canvas,uiEl('span',{ className:'ending-slot-name',text:entry.name }),uiEl('span',{ className:'ending-slot-state',text:entry.held ? 'HELD' :'NOT YET' })],
});
}
function uiShelf(label,kind,entries) {
const held = entries.filter((entry) => entry.held).length;
return uiEl('div',{
className:'ending-shelf',
children:[uiEl('h3',{ className:'ending-shelf-title',text:label + ' ' + held + '/' + entries.length }),uiEl('ul',{ className:'ending-slots',children:entries.map((entry) => uiSlot(kind,entry)) })],
});
}
function uiPortrait(ext) {
const wears = uiBitWears(ext);
return uiEl('div',{
className:'ending-bit',
children:[
uiEl('canvas',{ className:'ending-portrait',attrs:{ 'aria-hidden':'true' } }),
uiEl('p',{ className:'ending-bit-line',text:'BIT wears ' + (wears.length > 0 ? wears.length + ' of ' + Object.keys(BIT_MARKS).length + ' pins' :'no pins yet') }),
],
});
}
function uiRankBar(stats) {
const percent = stats.next === null ? PERCENT :Math.round((stats.r - stats.floor) / (stats.next - stats.floor) * PERCENT);
const fill = uiEl('span',{ className:'ending-bar-fill' });
fill.style.width = percent + '%';
return uiEl('div',{ className:'ending-bar',attrs:{ role:'progressbar','aria-label':'R to the next RANK','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(percent) },children:[fill] });
}
function uiLedgerRow(row) {
const text = row.label + ' ' + row.done + '/' + row.total + (row.mark ? ' · ' + row.mark :'');
return uiEl('li',{ className:'ending-ledger-row' + (row.done === row.total ? ' is-done' :''),text });
}
function uiLedger(ext,save) {
const stats = rankStats(ext,save);
return uiEl('div',{
className:'ending-ledger',
children:[
uiEl('h3',{ className:'ending-shelf-title',text:'RANK ' + stats.level + ' · ' + stats.r + ' R' + (stats.next === null ? ' · MAX' :' / ' + stats.next + ' R') }),
uiRankBar(stats),
uiEl('p',{ className:'ending-bit-line',text:'HEARTS +' + stats.hearts + ' · FINDS ' + stats.finds + ' · BADGES ' + stats.badges }),
uiEl('ul',{ className:'ending-ledger-rows',children:stats.rows.map(uiLedgerRow) }),
],
});
}
function uiRenderWall(state) {
const wall = wallOf(state.ext);
return uiEl('section',{
className:'ending-wall',
attrs:{ 'aria-label':'Badge wall' },
children:[
uiEl('h2',{ className:'ending-wall-title',text:'BADGE WALL' }),
uiPortrait(state.ext),
uiShelf('BADGES','medal',wall.badges),
uiShelf('PINS','pin',wall.pins),
uiShelf('CASE FILES','file',wall.files),
uiLedger(state.ext,state.save),
],
});
}

export { uiRenderWall,uiSyncWall };
