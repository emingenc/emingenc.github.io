import { HARNESS_FORGE } from '../game/labs/data/harness-forge.js';
import { pieceAt } from '../game/labs/forge-sim.js';
import { runSummary } from '../game/labs/forge-score.js';
import { labBest } from '../game/save.js';
import { uiEl } from './dom.js';
import { uiForgeBoardNode } from './forge-board.js';

const FORGE_MAX_STARS = 3;
const FORGE_PERCENT = 100;
const FORGE_TITLE = 'THE CHECKPOINT';
const FORGE_SIM_TAG = 'GHOSTWRITER\'s runaway run, replayed offline.';
const FORGE_STAR_RULE = '★ survived · ★★ integrity kept above 60% · ★★★ nothing got through';
const FORGE_FIRST_HINT = 'Tap a green tile beside the path to place the selected piece, then START WAVE.';
const FORGE_INTRO = 'A runaway agent marches down the path. Place pieces beside it so nothing reaches SHIP.';

function uiForgeLevelOf(app) {
return HARNESS_FORGE.levels[app.forge.levelIndex];
}
function uiForgeStars(count) {
return '★'.repeat(count) + '☆'.repeat(FORGE_MAX_STARS - count);
}
function uiForgeButton(action,label,spec) {
const attrs = { type:'button','data-action':action,'data-focus-key':action,...spec.extra };
return uiEl('button',{ className:'btn forge-btn ' + spec.kind,text:label,attrs });
}
function uiForgeHead(title) {
return uiEl('header',{
className:'forge-head',
children:[
uiForgeButton('forge-back','◄ BACK',{ kind:'btn-ghost forge-back',extra:{ 'aria-label':'Back' } }),
uiEl('h1',{ className:'forge-title',text:title }),
],
});
}
function uiForgeLevelButton(app,level,index) {
const best = labBest(app.game.save,HARNESS_FORGE.id,level.id);
const action = 'forge-level-' + index;
const bestText = best > 0 ? 'BEST ' + uiForgeStars(best) :'NOT CLEARED';
const label = level.title + '. ' + level.brief + ' Best: ' + best + ' of ' + FORGE_MAX_STARS + ' stars.';
return uiEl('button',{
className:'btn forge-level',
attrs:{ type:'button','data-action':action,'data-focus-key':action,'aria-label':label },
children:[
uiEl('span',{ className:'forge-level-title',text:(index + 1) + '. ' + level.title }),
uiEl('span',{ className:'forge-level-brief',text:level.brief }),
uiEl('span',{ className:'forge-level-best',text:bestText + ' · budget ' + level.budget + ' · integrity ' + level.integrity }),
],
});
}
function uiForgeRenderSelect(app) {
const levels = HARNESS_FORGE.levels.map(function (level,index) { return uiForgeLevelButton(app,level,index); });
return uiEl('section',{
className:'screen forge-screen',
attrs:{ 'data-screen':'forge' },
children:[
uiForgeHead(FORGE_TITLE),
uiEl('p',{ className:'forge-sim',text:FORGE_SIM_TAG }),
uiEl('p',{ className:'forge-intro',text:FORGE_INTRO }),
uiEl('div',{ className:'forge-levels',children:levels }),
],
});
}
function uiForgeRenderEmpty() {
return uiEl('section',{ className:'screen forge-screen',attrs:{ 'data-screen':'forge' } });
}
function uiForgeWaveNumber(game,level) {
return Math.min(game.waveIndex + 1,level.waves.length);
}
function uiForgeHud(app) {
const { game } = app.forge;
const level = uiForgeLevelOf(app);
return uiEl('div',{
className:'forge-hud',
attrs:{ role:'group','aria-label':'Status' },
children:[
uiEl('span',{ className:'forge-stat',children:['BUDGET ',uiEl('span',{ className:'forge-budget',text:String(game.budget) })] }),
uiEl('span',{ className:'forge-stat',children:['INTEGRITY ',uiEl('span',{ className:'forge-integrity',text:game.integrity + '/' + game.maxIntegrity })] }),
uiEl('span',{ className:'forge-wave',text:'WAVE ' + uiForgeWaveNumber(game,level) + '/' + level.waves.length }),
],
});
}
function uiForgeBoardWrap(app) {
return uiEl('div',{ className:'forge-board-wrap',children:[uiForgeBoardNode(app)] });
}
function uiForgeThreatChip(threat) {
const counter = HARNESS_FORGE.pieces[threat.counter];
const full = threat.label + ' is countered by ' + counter.label + (threat.hidden ? ' (hidden: needs LOG)' :'');
return uiEl('span',{
className:'forge-threat' + (threat.hidden ? ' is-hidden' :''),
text:threat.glyph + '→' + counter.label,
attrs:{ role:'listitem','aria-label':full,title:full },
});
}
function uiForgeSpawnText(spawn) {
const threat = HARNESS_FORGE.threats[spawn.threat];
return spawn.count + ' ' + threat.label + (threat.hidden ? ' (HIDDEN)' :'');
}
function uiForgeNextText(app) {
const { game } = app.forge;
const wave = uiForgeLevelOf(app).waves[game.waveIndex];
if (!wave || game.phase === 'won' || game.phase === 'lost') return '';
const lead = game.phase === 'build' ? 'NEXT: ' :'INCOMING: ';
return lead + wave.spawns.map(uiForgeSpawnText).join(', ');
}
function uiForgeThreatStrip(app) {
const chips = Object.keys(HARNESS_FORGE.threats).map(function (id) { return uiForgeThreatChip(HARNESS_FORGE.threats[id]); });
return uiEl('div',{
className:'forge-threats',
children:[
uiEl('div',{ className:'forge-legend',attrs:{ role:'list','aria-label':'Threats and their counters' },children:chips }),
uiEl('p',{ className:'forge-next',text:uiForgeNextText(app) }),
],
});
}
function uiForgeCountersOf(pieceId) {
return Object.keys(HARNESS_FORGE.threats).filter(function (id) { return HARNESS_FORGE.threats[id].counter === pieceId; });
}
function uiForgePieceInfoText(pieceId) {
const piece = HARNESS_FORGE.pieces[pieceId];
const counters = uiForgeCountersOf(pieceId).map(function (id) { return HARNESS_FORGE.threats[id].label; });
const best = counters.length ? 'Best vs ' + counters.join(' and ') + '.' :'Shows hidden threats so the others can hit them.';
return piece.label + ': ' + piece.blurb + '. ' + best + ' Cost ' + piece.cost + ', range ' + piece.range + '.';
}
function uiForgeFirstTime(app) {
const { game } = app.forge;
return app.forge.levelIndex === 0 && game.waveIndex === 0 && game.phase === 'build';
}
function uiForgeInfo(app) {
const children = [uiEl('p',{ className:'forge-piece-info',text:uiForgePieceInfoText(app.forge.selected) })];
if (uiForgeFirstTime(app)) children.push(uiEl('p',{ className:'forge-hint',text:FORGE_FIRST_HINT }));
return uiEl('div',{ className:'forge-info',children:children });
}
function uiForgePieceButton(app,pieceId) {
const piece = HARNESS_FORGE.pieces[pieceId];
const action = 'forge-piece-' + pieceId;
const poor = app.forge.game.budget < piece.cost;
const label = piece.label + ', cost ' + piece.cost + ', key ' + piece.key;
return uiEl('button',{
className:'btn forge-piece forge-tone-' + piece.color + (poor ? ' is-poor' :''),
attrs:{ type:'button','data-action':action,'data-focus-key':action,'data-key':piece.key,'aria-pressed':String(app.forge.selected === pieceId),'aria-label':label },
children:[uiEl('span',{ className:'forge-piece-label',text:piece.label + ' ' + piece.cost })],
});
}
function uiForgePalette(app) {
const buttons = HARNESS_FORGE.pieceOrder.map(function (id) { return uiForgePieceButton(app,id); });
return uiEl('div',{ className:'forge-palette',attrs:{ role:'group','aria-label':'Pieces' },children:buttons });
}
function uiForgeSellable(forge) {
if (forge.game.phase !== 'build' || !forge.cursor) return null;
return pieceAt(forge.game,forge.cursor.col,forge.cursor.row) || null;
}
function uiForgeRefund(piece) {
return Math.floor(HARNESS_FORGE.pieces[piece.type].cost * HARNESS_FORGE.sellPercent / FORGE_PERCENT);
}
function uiForgeControls(app) {
const { forge } = app;
const sellable = uiForgeSellable(forge);
const buildOnly = forge.game.phase === 'build' ? {} :{ disabled:'disabled' };
const sellExtra = sellable ? {} :{ disabled:'disabled' };
const sellLabel = sellable ? 'SELL +' + uiForgeRefund(sellable) :'SELL';
return uiEl('div',{
className:'forge-controls',
attrs:{ role:'group','aria-label':'Controls' },
children:[
uiForgeButton('forge-start','START WAVE',{ kind:'btn-primary forge-start',extra:buildOnly }),
uiForgeButton('forge-speed',forge.speed + 'x',{ kind:'btn-ghost forge-speed',extra:{ 'aria-pressed':String(forge.speed === 2),'aria-label':'Double speed' } }),
uiForgeButton('forge-sell',sellLabel,{ kind:'btn-ghost forge-sell',extra:sellExtra }),
],
});
}
function uiForgeXpText(note) {
if (!note) return '';
const gained = note.gained > 0 ? 'XP +' + note.gained :'No new XP: your best run is already higher.';
const up = note.levelAfter > note.levelBefore ? ' LEVEL UP: ' + note.levelBefore + ' → ' + note.levelAfter + '.' :'';
return gained + up;
}
function uiForgeSummaryButtons(app,summary) {
const buttons = [];
const hasNext = summary.status === 'won' && app.forge.levelIndex < HARNESS_FORGE.levels.length - 1;
if (hasNext) buttons.push(uiForgeButton('forge-next','NEXT LEVEL',{ kind:'btn-primary forge-next-level' }));
buttons.push(uiForgeButton('forge-retry','RETRY',{ kind:hasNext ? 'btn-ghost forge-retry' :'btn-primary forge-retry' }));
buttons.push(uiForgeButton('forge-levels','LEVELS',{ kind:'btn-ghost forge-levels' }));
return uiEl('div',{ className:'forge-summary-actions',children:buttons });
}
function uiForgeSummaryCard(app) {
const summary = runSummary(app.forge.game);
const won = summary.status === 'won';
const children = [uiEl('h2',{ className:'forge-card-title',text:won ? 'RUN CONTAINED' :'HARNESS BREACHED' })];
if (won) {
children.push(uiEl('p',{ className:'forge-stars',text:uiForgeStars(summary.stars),attrs:{ role:'img','aria-label':summary.stars + ' of ' + FORGE_MAX_STARS + ' stars' } }));
}
summary.lines.forEach(function (line) { children.push(uiEl('p',{ className:'forge-note',text:line })); });
const xp = uiForgeXpText(app.forge.xpNote);
if (xp) children.push(uiEl('p',{ className:'forge-xp',text:xp }));
if (won) children.push(uiEl('p',{ className:'forge-note forge-rule',text:FORGE_STAR_RULE }));
children.push(uiForgeSummaryButtons(app,summary));
return uiEl('section',{ className:'forge-summary ' + (won ? 'is-won' :'is-lost'),attrs:{ 'aria-label':'Run summary' },children:children });
}
function uiForgeIsOver(game) {
return game.phase === 'won' || game.phase === 'lost';
}
function uiForgeRenderPlay(app) {
const over = uiForgeIsOver(app.forge.game);
const children = [
uiForgeHead(uiForgeLevelOf(app).title),
uiForgeHud(app),
uiForgeBoardWrap(app),
over ? uiForgeSummaryCard(app) :null,
uiForgeThreatStrip(app),
uiForgeInfo(app),
uiForgePalette(app),
uiForgeControls(app),
];
return uiEl('section',{
className:'screen forge-screen forge-play' + (over ? ' is-over' :''),
attrs:{ 'data-screen':'forge' },
children:children.filter(Boolean),
});
}

export { uiForgeLevelOf, uiForgeRenderSelect, uiForgeRenderPlay, uiForgeRenderEmpty };
