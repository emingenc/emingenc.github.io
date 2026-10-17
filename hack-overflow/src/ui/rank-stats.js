import { rankStats } from '../game/rank-stats.js';
import { uiRenderApp } from './app.js';
import { uiEl } from './dom.js';
import { uiWalkReleaseAll } from './grid-walk.js';
import { uiLinkStyle } from './lazy-style.js';

const STYLE_HREF = 'styles/lazy/rank-stats.css';
const OPEN_KEY = 'rank-open';
const CLOSE_KEY = 'rank-close';
const PERCENT = 100;
const STOPPED_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D','f','F',' ','Enter']);

function uiPointsText(stats) {
return stats.next === null ? 'R ' + stats.r + ' · MAX' :'R ' + stats.r + ' / ' + stats.next;
}
function uiPercentOf(stats) {
if (stats.next === null) return PERCENT;
return Math.round((stats.r - stats.floor) / (stats.next - stats.floor) * PERCENT);
}
function uiRankBar(stats) {
const percent = uiPercentOf(stats);
const fill = uiEl('span',{ className:'grid-rank-fill' });
fill.style.width = percent + '%';
return uiEl('div',{
className:'grid-rank-bar',
attrs:{ role:'progressbar','aria-label':'R to the next RANK','aria-valuemin':'0','aria-valuemax':'100','aria-valuenow':String(percent) },
children:[fill],
});
}
function uiRowText(row) {
const text = row.label + ' ' + row.done + '/' + row.total;
return row.mark ? text + ' · ' + row.mark :text;
}
function uiRankRow(row) {
return uiEl('li',{ className:'grid-rank-row' + (row.done === row.total ? ' is-done' :''),text:uiRowText(row) });
}
function uiCloseRankStats(app) {
app.game.drawRank = null;
app.lastFocusKey = OPEN_KEY;
}
function uiCloseButton() {
return uiEl('button',{
className:'btn btn-ghost grid-rank-close',text:'CLOSE',
attrs:{ type:'button','data-action':CLOSE_KEY,'data-focus-key':CLOSE_KEY,'aria-label':'Close RANK' },
});
}
function uiTrapKeys(app,overlay) {
overlay.addEventListener('keydown',function (event) {
if (event.key === 'Escape') {
event.stopPropagation();
uiCloseRankStats(app);
uiRenderApp(app);
} else if (event.key === 'Tab') {
event.preventDefault();
event.stopPropagation();
const close = overlay.querySelector('[data-focus-key="' + CLOSE_KEY + '"]');
if (close) close.focus();
} else if (STOPPED_KEYS.has(event.key)) {
event.stopPropagation();
}
});
overlay.addEventListener('keyup',function (event) { event.stopPropagation(); });
}
function uiRankSheet(app) {
const stats = rankStats(app.game.ext,app.game.save);
const title = 'RANK ' + stats.level;
const close = uiCloseButton();
const box = uiEl('div',{
className:'grid-rank-panel',
children:[
uiEl('h2',{ className:'grid-rank-title',text:title }),
uiRankBar(stats),
uiEl('p',{ className:'grid-rank-points',text:uiPointsText(stats) }),
uiEl('p',{ className:'grid-rank-hearts',text:'HEARTS +' + stats.hearts }),
uiEl('ul',{ className:'grid-rank-rows',children:stats.rows.map(uiRankRow) }),
uiEl('p',{ className:'grid-rank-tally',text:'FINDS ' + stats.finds + ' · BADGES ' + stats.badges }),
close,
],
});
const overlay = uiEl('div',{ className:'grid-rank',attrs:{ role:'dialog','aria-modal':'true','aria-label':title },children:[box] });
uiTrapKeys(app,overlay);
overlay.addEventListener('click',function (event) { if (event.target === overlay) close.focus(); });
return overlay;
}
function uiCanOpen(app) {
const game = app.game;
return app.screen === 'grid' && !app.menuOpen && !game.travelOpen && !game.drawRank;
}
async function uiOpenRankStats(app) {
await uiLinkStyle(STYLE_HREF);
if (!uiCanOpen(app)) return;
uiWalkReleaseAll(app);
app.game.walk.plan = null;
app.game.drawRank = uiRankSheet;
app.lastFocusKey = CLOSE_KEY;
}

export { uiCloseRankStats,uiOpenRankStats,uiRankSheet };
