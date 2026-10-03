import { advance, pathCells, positionAt } from '../game/labs/forge-sim.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiCellCentre, uiDrawBoardFrame, uiFxTtl, uiGeometry } from './forge-board-draw.js';

const UI_BOARD_LABEL = 'Forge board. Arrow keys move the cursor, 1 to 5 pick a piece, Enter places.';
const UI_PALETTE_NAMES = ['bg','panel','border','primary','bright','cyan','magenta','amber','red','text','dim'];
const UI_FALLBACK_PALETTE = {
bg:'#030805',panel:'#08120c',border:'#1d3a27',primary:'#00e680',bright:'#7dffb8',text:'#e3f5e8',
dim:'#86a38f',cyan:'#2de2ff',magenta:'#ff3ea5',amber:'#ffb020',red:'#ff4d5e',
};
const UI_TAP_SLOP = 10;
const UI_MAX_FX = 90;
const UI_PUSH_TILES = 0.5;
const uiBoards = new WeakMap();

function uiReducedMotion() {
try {
return Boolean(uiPrefersReducedMotion());
} catch {
return false;
}
}
function uiHidden() {
return typeof document !== 'undefined' && Boolean(document.hidden);
}
function uiContextOf(canvas) {
return typeof canvas.getContext === 'function' ? canvas.getContext('2d') :null;
}
function uiCssValue(style,name) {
return style && style.getPropertyValue ? String(style.getPropertyValue('--' + name)).trim() :'';
}
function uiReadPalette(node) {
if (typeof globalThis.getComputedStyle !== 'function') return { palette:UI_FALLBACK_PALETTE,live:false };
const style = globalThis.getComputedStyle(node);
const palette = {};
UI_PALETTE_NAMES.forEach(function (name) { palette[name] = uiCssValue(style,name) || UI_FALLBACK_PALETTE[name]; });
return { palette,live:UI_PALETTE_NAMES.some(function (name) { return Boolean(uiCssValue(style,name)); }) };
}
function uiPaletteOf(board) {
if (board.paletteLive) return board.palette;
const read = uiReadPalette(board.node);
board.palette = read.palette;
board.paletteLive = read.live;
return board.palette;
}
function uiForgeHudText(game) {
const total = game.level.waves.length;
return {
budget:String(game.budget),
integrity:game.integrity + '/' + game.maxIntegrity,
wave:'WAVE ' + Math.min(game.waveIndex + 1,total) + '/' + total,
};
}
function uiHudNode(board,key) {
const cached = board.hud[key];
if (cached && cached.isConnected !== false) return cached;
const root = board.root || (typeof document !== 'undefined' ? document :null);
board.hud[key] = root && root.querySelector ? root.querySelector('.forge-' + key) :null;
return board.hud[key];
}
function uiSyncHud(board,game) {
const text = uiForgeHudText(game);
Object.keys(text).forEach(function (key) {
const node = uiHudNode(board,key);
if (node && node.textContent !== text[key]) node.textContent = text[key];
});
}
function uiCellAt(app,board,event) {
const level = app.forge.game.level;
const rect = board.canvas.getBoundingClientRect();
if (!rect.width || !rect.height) return null;
const geo = uiGeometry(rect.width,rect.height,level);
const col = Math.floor((event.clientX - rect.left - geo.ox) / geo.tile);
const row = Math.floor((event.clientY - rect.top - geo.oy) / geo.tile);
if (col < 0 || row < 0 || col >= level.cols || row >= level.rows) return null;
return { col,row };
}
function uiIsTouch(event) {
return Boolean(event.pointerType) && event.pointerType !== 'mouse';
}
function uiPointerMove(app,board,event) {
if (!app.forge || !app.forge.game || uiIsTouch(event)) return;
board.hover = uiCellAt(app,board,event);
}
function uiPointerUp(app,board,event) {
const down = board.down;
board.down = null;
if (!down || !app.forge || !app.forge.game) return;
if (Math.hypot(event.clientX - down.x,event.clientY - down.y) > UI_TAP_SLOP) return;
if (uiIsTouch(event)) board.hover = null;
const cell = uiCellAt(app,board,event);
if (cell && typeof app.forge.onCell === 'function') app.forge.onCell(app,cell.col,cell.row);
}
function uiBindPointer(app,board) {
const canvas = board.canvas;
if (typeof canvas.addEventListener !== 'function') return;
canvas.addEventListener('pointerdown',function (event) { board.down = { x:event.clientX,y:event.clientY }; });
canvas.addEventListener('pointermove',function (event) { uiPointerMove(app,board,event); });
canvas.addEventListener('pointerup',function (event) { uiPointerUp(app,board,event); });
canvas.addEventListener('pointercancel',function () { board.down = null; });
canvas.addEventListener('pointerleave',function () { board.hover = null; });
}
function uiResizeBoard(app,board,entry) {
const css = entry && entry.contentRect;
const dpr = globalThis.devicePixelRatio || 1;
if (!css || !Math.round(css.width * dpr) || !Math.round(css.height * dpr)) return;
board.canvas.width = Math.round(css.width * dpr);
board.canvas.height = Math.round(css.height * dpr);
if (board.ctx) board.ctx.setTransform(dpr,0,0,dpr,0,0);
board.width = board.canvas.width / dpr;
board.height = board.canvas.height / dpr;
uiDrawFrame(app,board,board.now);
}
function uiObserveBoard(app,board) {
if (typeof globalThis.ResizeObserver !== 'function') return;
board.resizer = new globalThis.ResizeObserver(function (entries) { uiResizeBoard(app,board,entries[entries.length - 1]); });
board.resizer.observe(board.node);
}
function uiCreateBoard(app) {
const canvas = uiEl('canvas',{ className:'forge-canvas',attrs:{ 'aria-hidden':'true' } });
const node = uiEl('div',{
className:'forge-board',
attrs:{ tabindex:'0',role:'application','aria-label':UI_BOARD_LABEL,'data-focus-key':'forge-board' },
children:[canvas],
});
const board = {
node,canvas,ctx:uiContextOf(canvas),raf:0,last:0,now:0,width:0,height:0,palette:null,paletteLive:false,
fx:[],hover:null,down:null,seen:null,gameRef:null,pathLevel:null,pathSet:null,hud:{},root:null,resizer:null,
};
uiBoards.set(app,board);
uiObserveBoard(app,board);
uiBindPointer(app,board);
return board;
}
function uiSetGridVars(node,game) {
if (!game || !node.style || typeof node.style.setProperty !== 'function') return;
node.style.setProperty('--cols',String(game.level.cols));
node.style.setProperty('--rows',String(game.level.rows));
}
function uiForgeBoardNode(app) {
const board = uiBoards.get(app) || uiCreateBoard(app);
uiSetGridVars(board.node,app.forge && app.forge.game);
return board.node;
}
function uiRafOf() {
return typeof globalThis.requestAnimationFrame === 'function' ? globalThis.requestAnimationFrame.bind(globalThis) :null;
}
function uiStop(board) {
if (board.raf && typeof globalThis.cancelAnimationFrame === 'function') globalThis.cancelAnimationFrame(board.raf);
board.raf = 0;
board.last = 0;
}
function uiShouldRun(app,board,active) {
const forge = app.forge;
return Boolean(active && forge && forge.view === 'play' && forge.game && board.node.isConnected && !uiHidden() && !app.menuOpen);
}
function uiSyncForgeBoard(app,active,root) {
const board = uiBoards.get(app);
if (!board) return;
if (root) board.root = root;
const raf = uiRafOf();
if (!uiShouldRun(app,board,active)) uiStop(board);
else if (!board.raf && raf) board.raf = raf(function (now) { uiForgeBoardTick(app,now); });
}
function uiForgeBoardRelease(app) {
const board = uiBoards.get(app);
if (board) uiStop(board);
}
function uiPieceOf(game,uid) {
return game.pieces.find(function (piece) { return piece.uid === uid; }) || null;
}
function uiStreakFor(game,event) {
const enemy = game.enemies.find(function (item) { return item.uid === event.enemyUid; });
if (!enemy) return null;
return { from:positionAt(game.level,enemy.dist + UI_PUSH_TILES),to:positionAt(game.level,Math.max(0,enemy.dist)) };
}
function uiHitFx(game,event,now) {
const piece = uiPieceOf(game,event.pieceUid);
const type = piece ? piece.type :'test';
const hit = {
t:now,type,counter:event.counter,damage:event.damage,from:uiCellCentre(event.from.col,event.from.row),to:event.to,
streak:type === 'retry' ? uiStreakFor(game,event) :null,
};
return [{ ...hit,kind:'hit' },{ ...hit,kind:'pop' }];
}
function uiFxFor(game,event,now) {
if (event.kind === 'hit') return uiHitFx(game,event,now);
if (event.kind === 'kill') return [{ kind:'kill',t:now,at:event.at,reward:event.reward }];
if (event.kind === 'leak') return [{ kind:'leak',t:now,leak:event.leak }];
if (event.kind === 'place') return [{ kind:'place',t:now,at:uiCellCentre(event.col,event.row),type:event.type }];
return [];
}
function uiConsume(board,game,now) {
if (!game.events || game.events === board.seen) return;
board.seen = game.events;
game.events.forEach(function (event) { board.fx.push(...uiFxFor(game,event,now)); });
if (board.fx.length > UI_MAX_FX) board.fx.splice(0,board.fx.length - UI_MAX_FX);
}
function uiRefsChanged(game,ref) {
return !ref || game.tick < ref.tick || game.seed !== ref.seed || game.level !== ref.level;
}
function uiAdoptGame(board,game) {
if (!uiRefsChanged(game,board.gameRef)) return;
board.fx = [];
board.seen = null;
}
function uiFrame(app,board,now) {
const game = app.forge.game;
if (board.pathLevel !== game.level) {
board.pathLevel = game.level;
board.pathSet = pathCells(game.level);
}
const reduced = uiReducedMotion();
const geo = uiGeometry(board.width,board.height,game.level);
board.fx = board.fx.filter(function (fx) { return now - fx.t <= uiFxTtl(fx,reduced); });
return {
ctx:board.ctx,game,level:game.level,forge:app.forge,pal:uiPaletteOf(board),reduced,now,
width:board.width,height:board.height,tile:geo.tile,ox:geo.ox,oy:geo.oy,path:board.pathSet,hover:board.hover,fx:board.fx,
};
}
function uiDrawFrame(app,board,now) {
if (!board.ctx || !app.forge || !app.forge.game || !board.width || !board.height) return;
uiDrawBoardFrame(uiFrame(app,board,now));
}
function uiAdvance(forge,board,now) {
const before = forge.game;
const elapsed = board.last ? Math.max(0,now - board.last) :0;
board.last = now;
if (before.phase !== 'wave') return false;
forge.game = advance(before,elapsed * (forge.speed || 1));
return forge.game.phase !== 'wave';
}
function uiForgeBoardTick(app,now) {
const board = uiBoards.get(app);
const forge = app.forge;
if (!board || !forge || !forge.game) return;
const raf = uiRafOf();
if (board.raf && raf) board.raf = raf(function (next) { uiForgeBoardTick(app,next); });
uiAdoptGame(board,forge.game);
const left = uiAdvance(forge,board,now);
board.now = now;
board.gameRef = forge.game;
uiConsume(board,forge.game,now);
uiDrawFrame(app,board,now);
uiSyncHud(board,forge.game);
if (left && typeof forge.onPhase === 'function') forge.onPhase(app,forge.game.events);
}

export { uiForgeBoardNode,uiSyncForgeBoard,uiForgeBoardRelease,uiForgeBoardTick,uiForgeHudText };
