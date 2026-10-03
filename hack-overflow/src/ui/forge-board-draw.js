import { HARNESS_FORGE } from '../game/labs/data/harness-forge.js';
import { enemyPos, isRevealed, pathLength, positionAt } from '../game/labs/forge-sim.js';


const UI_CENTRE = 0.5;
const UI_MIN_FONT = 7;
const UI_CHECK_MARKS = ['P','L','C','O','S'];
const UI_PIECE_COLOR = { guard:'cyan',retry:'amber',limit:'magenta',log:'bright',test:'primary' };
const UI_PIECE_MARK = { guard:'G',retry:'R',limit:'LM',log:'LG',test:'T' };
const UI_QUARTER = 0.25;
const UI_PIECE_SHAPE = {
guard:{ sides:4,turn:Math.PI * UI_QUARTER },retry:{ sides:0,turn:0 },limit:{ sides:4,turn:0 },
log:{ sides:6,turn:0 },test:{ sides:3,turn:-Math.PI / 2 },
};
const UI_FX_MS = { hit:150,pop:650,kill:650,leak:500,place:300 };
const UI_FX_REDUCED_MS = { hit:120,pop:450,kill:450,leak:450,place:0 };
const UI_SIZE = {
check:0.24,checkMark:0.28,piece:0.36,pieceMark:0.34,pieceMarkWide:0.24,disc:0.3,glyph:0.3,halo:0.4,
hidden:0.13,hpWidth:0.6,hpLift:0.42,hpThick:0.07,pathLine:0.08,popBig:0.42,popSmall:0.26,killText:0.34,
leakText:0.4,streak:0.12,rangeLine:1.5,
};
const UI_ALPHA = {
path:0.28,dot:0.45,pathLine:0.5,range:0.1,rangeLine:0.6,hiddenStill:0.3,flickerBase:0.12,flickerSwing:0.22,vignette:0.55,
};
const UI_FLICKER = { period:90,spread:1.7 };
const UI_MOTION = { rise:0.5,killRise:0.6,popLift:0.4,killLift:0.3,leakLift:0.7,popFade:0.25,vignetteInner:0.5 };
const UI_LINE = { thin:1.5,normal:2,thick:2.5,counter:3.5,leak:3 };
const UI_REACH = { killStart:0.2,killGrow:0.5,leakStart:0.4,leakGrow:0.5,leakStill:0.5,placeStart:0.3,placeGrow:0.3 };
const UI_VIGNETTE_CLEAR = 'rgba(255,77,94,0)';

function uiGeometry(width,height,level) {
const tile = Math.min(width / level.cols,height / level.rows);
return { tile,ox:(width - tile * level.cols) / 2,oy:(height - tile * level.rows) / 2 };
}
function uiCellCentre(col,row) {
return { x:col + UI_CENTRE,y:row + UI_CENTRE };
}
function uiFxTtl(fx,reduced) {
return (reduced ? UI_FX_REDUCED_MS :UI_FX_MS)[fx.kind] || 0;
}
function uiPx(frame,at) {
return { x:frame.ox + at.x * frame.tile,y:frame.oy + at.y * frame.tile };
}
function uiPaint(ctx,style) {
ctx.globalAlpha = Math.max(0,Math.min(1,style.alpha === undefined ? 1 :style.alpha));
if (style.fill) {
ctx.fillStyle = style.fill;
ctx.fill();
}
if (style.stroke) {
ctx.strokeStyle = style.stroke;
ctx.lineWidth = style.width;
ctx.stroke();
}
ctx.globalAlpha = 1;
}
function uiFillRect(ctx,rect,style) {
ctx.globalAlpha = style.alpha === undefined ? 1 :style.alpha;
ctx.fillStyle = style.color;
ctx.fillRect(rect.x,rect.y,rect.width,rect.height);
ctx.globalAlpha = 1;
}
function uiLine(ctx,from,to) {
ctx.beginPath();
ctx.moveTo(from.x,from.y);
ctx.lineTo(to.x,to.y);
}
function uiText(frame,text,spot) {
const ctx = frame.ctx;
ctx.globalAlpha = spot.alpha === undefined ? 1 :Math.max(0,Math.min(1,spot.alpha));
ctx.font = 'bold ' + Math.max(UI_MIN_FONT,Math.round(spot.size)) + 'px monospace';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = spot.color;
ctx.fillText(text,spot.x,spot.y);
ctx.globalAlpha = 1;
}
function uiCircle(ctx,at,radius) {
ctx.beginPath();
ctx.arc(at.x,at.y,radius,0,Math.PI * 2);
}
function uiPolygon(ctx,at,shape) {
ctx.beginPath();
for (let i = 0; i < shape.sides; i += 1) {
const angle = shape.turn + i * 2 * Math.PI / shape.sides;
const corner = { x:at.x + Math.cos(angle) * shape.radius,y:at.y + Math.sin(angle) * shape.radius };
if (i === 0) ctx.moveTo(corner.x,corner.y);
else ctx.lineTo(corner.x,corner.y);
}
ctx.closePath();
}
function uiPieceShape(frame,type,at) {
const radius = frame.tile * UI_SIZE.piece;
const shape = UI_PIECE_SHAPE[type] || UI_PIECE_SHAPE.retry;
if (shape.sides) uiPolygon(frame.ctx,at,{ sides:shape.sides,turn:shape.turn,radius });
else uiCircle(frame.ctx,at,radius);
}
function uiPieceColor(frame,type) {
return frame.pal[UI_PIECE_COLOR[type]] || frame.pal.primary;
}
function uiThreatColor(frame,type) {
const threat = HARNESS_FORGE.threats[type];
return threat ? uiPieceColor(frame,threat.counter) :frame.pal.red;
}
function uiTileRect(frame,col,row) {
return { x:frame.ox + col * frame.tile + 1,y:frame.oy + row * frame.tile + 1,width:frame.tile - 2,height:frame.tile - 2 };
}
function uiBuildDot(frame,rect) {
const dot = { x:rect.x + rect.width / 2 - 1,y:rect.y + rect.height / 2 - 1,width:2,height:2 };
uiFillRect(frame.ctx,dot,{ color:frame.pal.dim,alpha:UI_ALPHA.dot });
}
function uiDrawTile(frame,col,row) {
const rect = uiTileRect(frame,col,row);
uiFillRect(frame.ctx,rect,{ color:frame.pal.panel });
if (frame.path.has(col + ',' + row)) uiFillRect(frame.ctx,rect,{ color:frame.pal.primary,alpha:UI_ALPHA.path });
else uiBuildDot(frame,rect);
}
function uiDrawPathLine(frame) {
const ctx = frame.ctx;
ctx.beginPath();
frame.level.path.forEach(function (point,index) {
const at = uiPx(frame,uiCellCentre(point[0],point[1]));
if (index === 0) ctx.moveTo(at.x,at.y);
else ctx.lineTo(at.x,at.y);
});
uiPaint(ctx,{ stroke:frame.pal.primary,width:Math.max(1,frame.tile * UI_SIZE.pathLine),alpha:UI_ALPHA.pathLine });
}
function uiDrawCheckpoint(frame,index,length) {
const last = UI_CHECK_MARKS.length - 1;
const at = uiPx(frame,positionAt(frame.level,length * index / last));
uiCircle(frame.ctx,at,frame.tile * UI_SIZE.check);
uiPaint(frame.ctx,{ fill:frame.pal.bg,stroke:index === last ? frame.pal.bright :frame.pal.primary,width:UI_LINE.normal });
uiText(frame,UI_CHECK_MARKS[index],{ x:at.x,y:at.y,size:frame.tile * UI_SIZE.checkMark,color:frame.pal.bright });
}
function uiDrawTiles(frame) {
const full = { x:0,y:0,width:frame.width,height:frame.height };
uiFillRect(frame.ctx,full,{ color:frame.pal.bg });
for (let row = 0; row < frame.level.rows; row += 1) {
for (let col = 0; col < frame.level.cols; col += 1) uiDrawTile(frame,col,row);
}
uiDrawPathLine(frame);
const length = pathLength(frame.level);
UI_CHECK_MARKS.forEach(function (mark,index) { uiDrawCheckpoint(frame,index,length); });
}
function uiRangeSpec(frame,cell) {
const piece = frame.game.pieces.find(function (item) { return item.col === cell.col && item.row === cell.row; });
return HARNESS_FORGE.pieces[piece ? piece.type :frame.forge.selected];
}
function uiDrawRange(frame) {
const cell = frame.hover || frame.forge.cursor;
const spec = cell && uiRangeSpec(frame,cell);
if (!spec) return;
const at = uiPx(frame,uiCellCentre(cell.col,cell.row));
const color = uiPieceColor(frame,spec.id);
uiCircle(frame.ctx,at,spec.range * frame.tile);
uiPaint(frame.ctx,{ fill:color,alpha:UI_ALPHA.range });
uiCircle(frame.ctx,at,spec.range * frame.tile);
uiPaint(frame.ctx,{ stroke:color,width:UI_SIZE.rangeLine,alpha:UI_ALPHA.rangeLine });
}
function uiDrawPiece(frame,piece) {
const at = uiPx(frame,uiCellCentre(piece.col,piece.row));
const color = uiPieceColor(frame,piece.type);
const mark = UI_PIECE_MARK[piece.type] || piece.type.charAt(0).toUpperCase();
uiPieceShape(frame,piece.type,at);
uiPaint(frame.ctx,{ fill:frame.pal.bg,stroke:color,width:UI_LINE.thick });
const size = mark.length > 1 ? UI_SIZE.pieceMarkWide :UI_SIZE.pieceMark;
uiText(frame,mark,{ x:at.x,y:at.y,size:frame.tile * size,color });
}
function uiDrawPieces(frame) {
frame.game.pieces.forEach(function (piece) { uiDrawPiece(frame,piece); });
}
function uiDrawHidden(frame,enemy,pos) {
const wave = Math.abs(Math.sin(frame.now / UI_FLICKER.period + enemy.uid * UI_FLICKER.spread));
const alpha = frame.reduced ? UI_ALPHA.hiddenStill :UI_ALPHA.flickerBase + UI_ALPHA.flickerSwing * wave;
uiCircle(frame.ctx,uiPx(frame,pos),frame.tile * UI_SIZE.hidden);
uiPaint(frame.ctx,{ fill:frame.pal.text,alpha });
}
function uiDrawHpBar(frame,enemy,at) {
const width = frame.tile * UI_SIZE.hpWidth;
const bar = { x:at.x - width / 2,y:at.y - frame.tile * UI_SIZE.hpLift,width,height:Math.max(2,frame.tile * UI_SIZE.hpThick) };
uiFillRect(frame.ctx,bar,{ color:frame.pal.border });
uiFillRect(frame.ctx,{ ...bar,width:width * Math.max(0,enemy.hp / enemy.maxHp) },{ color:frame.pal.red });
}
function uiDrawEnemyDisc(frame,enemy,pos) {
const spec = HARNESS_FORGE.threats[enemy.type];
const at = uiPx(frame,pos);
const color = uiThreatColor(frame,enemy.type);
uiCircle(frame.ctx,at,frame.tile * UI_SIZE.disc);
uiPaint(frame.ctx,{ fill:frame.pal.bg,stroke:color,width:UI_LINE.normal });
if (spec && spec.hidden) {
uiCircle(frame.ctx,at,frame.tile * UI_SIZE.halo);
uiPaint(frame.ctx,{ stroke:frame.pal.bright,width:UI_LINE.thin });
}
uiText(frame,spec ? spec.glyph :'?',{ x:at.x,y:at.y,size:frame.tile * UI_SIZE.glyph,color });
uiDrawHpBar(frame,enemy,at);
}
function uiDrawEnemy(frame,enemy) {
const spec = HARNESS_FORGE.threats[enemy.type];
const pos = enemyPos(frame.game,enemy);
if (spec && spec.hidden && !isRevealed(frame.game,enemy)) uiDrawHidden(frame,enemy,pos);
else uiDrawEnemyDisc(frame,enemy,pos);
}
function uiDrawEnemies(frame) {
frame.game.enemies.forEach(function (enemy) { uiDrawEnemy(frame,enemy); });
}
function uiDrawHit(frame,fx,phase) {
const color = fx.counter ? frame.pal.bright :uiPieceColor(frame,fx.type);
uiLine(frame.ctx,uiPx(frame,fx.from),uiPx(frame,fx.to));
uiPaint(frame.ctx,{ stroke:color,width:fx.counter ? UI_LINE.counter :UI_LINE.thin,alpha:1 - phase.move });
if (!fx.streak) return;
uiLine(frame.ctx,uiPx(frame,fx.streak.from),uiPx(frame,fx.streak.to));
uiPaint(frame.ctx,{ stroke:frame.pal.amber,width:Math.max(2,frame.tile * UI_SIZE.streak),alpha:1 - phase.move });
}
function uiDrawPop(frame,fx,phase) {
const label = '-' + fx.damage + (fx.counter ? ' x' + HARNESS_FORGE.counterMultiplier :'');
const at = uiPx(frame,{ x:fx.to.x,y:fx.to.y - UI_MOTION.popLift - phase.move * UI_MOTION.rise });
const size = frame.tile * (fx.counter ? UI_SIZE.popBig :UI_SIZE.popSmall);
uiText(frame,label,{ x:at.x,y:at.y,size,color:fx.counter ? frame.pal.bright :frame.pal.text,alpha:1 - phase.move * UI_MOTION.popFade });
}
function uiDrawKill(frame,fx,phase) {
const at = uiPx(frame,fx.at);
if (!frame.reduced) {
uiCircle(frame.ctx,at,frame.tile * (UI_REACH.killStart + UI_REACH.killGrow * phase.t));
uiPaint(frame.ctx,{ stroke:frame.pal.amber,width:UI_LINE.normal,alpha:1 - phase.t });
}
const lift = (UI_MOTION.killLift + phase.move * UI_MOTION.killRise) * frame.tile;
uiText(frame,'+' + fx.reward,{ x:at.x,y:at.y - lift,size:frame.tile * UI_SIZE.killText,color:frame.pal.amber,alpha:1 - phase.move });
}
function uiDrawVignette(frame,phase) {
const ctx = frame.ctx;
if (typeof ctx.createRadialGradient !== 'function') return;
const cx = frame.width / 2;
const cy = frame.height / 2;
const gradient = ctx.createRadialGradient(cx,cy,Math.min(cx,cy) * UI_MOTION.vignetteInner,cx,cy,Math.hypot(cx,cy));
gradient.addColorStop(0,UI_VIGNETTE_CLEAR);
gradient.addColorStop(1,frame.pal.red);
ctx.globalAlpha = UI_ALPHA.vignette * (1 - phase.t);
ctx.fillStyle = gradient;
ctx.fillRect(0,0,frame.width,frame.height);
ctx.globalAlpha = 1;
}
function uiDrawLeak(frame,fx,phase) {
const ship = positionAt(frame.level,pathLength(frame.level));
const at = uiPx(frame,ship);
const reach = frame.reduced ? UI_REACH.leakStill :UI_REACH.leakStart + UI_REACH.leakGrow * phase.t;
uiCircle(frame.ctx,at,frame.tile * reach);
uiPaint(frame.ctx,{ stroke:frame.pal.red,width:UI_LINE.leak,alpha:1 - phase.move });
const lift = UI_MOTION.leakLift * frame.tile;
uiText(frame,'-' + fx.leak,{ x:at.x,y:at.y - lift,size:frame.tile * UI_SIZE.leakText,color:frame.pal.red,alpha:1 - phase.move });
if (!frame.reduced) uiDrawVignette(frame,phase);
}
function uiDrawPlace(frame,fx,phase) {
const at = uiPx(frame,fx.at);
uiCircle(frame.ctx,at,frame.tile * (UI_REACH.placeStart + UI_REACH.placeGrow * phase.t));
uiPaint(frame.ctx,{ stroke:uiPieceColor(frame,fx.type),width:UI_LINE.normal,alpha:1 - phase.t });
}
const UI_FX_PAINTERS = { hit:uiDrawHit,pop:uiDrawPop,kill:uiDrawKill,leak:uiDrawLeak,place:uiDrawPlace };
function uiDrawOneFx(frame,fx) {
const ttl = uiFxTtl(fx,frame.reduced);
const age = frame.now - fx.t;
if (!ttl || age < 0 || age > ttl) return;
const progress = age / ttl;
UI_FX_PAINTERS[fx.kind](frame,fx,{ t:progress,move:frame.reduced ? 0 :progress });
}
function uiDrawFx(frame) {
frame.fx.forEach(function (fx) { uiDrawOneFx(frame,fx); });
}
function uiDrawCursor(frame) {
const cursor = frame.forge.cursor;
if (!cursor) return;
const rect = uiTileRect(frame,cursor.col,cursor.row);
frame.ctx.strokeStyle = frame.pal.bright;
frame.ctx.lineWidth = UI_LINE.normal;
frame.ctx.strokeRect(rect.x + 1,rect.y + 1,rect.width - 2,rect.height - 2);
}
function uiDrawBoardFrame(frame) {
uiDrawTiles(frame);
uiDrawRange(frame);
uiDrawPieces(frame);
uiDrawEnemies(frame);
uiDrawFx(frame);
uiDrawCursor(frame);
}

export { uiDrawBoardFrame,uiFxTtl,uiGeometry,uiCellCentre };
