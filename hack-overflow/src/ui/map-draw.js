import { coreState } from '../game/progress.js';
import { isOpen } from '../game/world.js';
import { uiAccentOf, uiRigAccent, uiRigCleared, uiRigPlates, uiRigState, uiSectorAt } from './grid-draw-tiles.js';

const UI_MAP_PALETTE_NAMES = ['bg','panel','border','primary','bright','text','dim','cyan','magenta','amber','red'];
const UI_MAP_GROUND_KINDS = new Set(['floor','cache']);
const UI_MAP_INSET_KINDS = new Set(['terminal','core','kernel','rig']);
const UI_MAP_RESERVED_KINDS = new Set(['door','gate','terminal','core','kernel-door','kernel','rig']);
const UI_MAP_STATE_COLORS = { open:'primary',locked:'amber',encrypted:'dim',avatar:'cyan' };
const UI_MAP_CELL = { insetRatio:0.6,groundTint:0.3 };
const UI_MAP_RIG = { ratio:1.6,minPx:9,outline:1,hollow:0.5,core:0.4 };
const UI_MAP_RIG_LOOKS = { 'rig-idle':'new','rig-lit':'met','rig-done':'done' };
const UI_MAP_LABEL = { inset:3,minSize:9,maxSize:16,tileRatio:0.7,family:'VT323, monospace',panelAlpha:0.8,pad:1,gap:4 };
const UI_MAP_LABEL_SHIFTS = { near:0,above:-1,below:1,twoAbove:-2,twoBelow:2 };
const UI_MAP_LABEL_PLACES = [false,true].flatMap(function (before) {
return Object.values(UI_MAP_LABEL_SHIFTS).map(function (shift) { return { shift,before }; });
});
const UI_MAP_AVATAR = { centre:0.5,ratio:0.32,core:0.4,minRadius:3 };
const UI_MAP_LEGEND = { pad:8,minSize:11,floorSize:8,rowRatio:1.45,swatch:10,rigSwatch:13,gap:10,alpha:0.85,rigAccent:'magenta' };
const UI_MAP_LEGEND_ROWS = [[
{ state:'open',label:'OPEN / BREACHED' },
{ state:'locked',label:'LOCKED' },
{ state:'encrypted',label:'ENCRYPTED' },
{ state:'avatar',label:'YOU' },
{ state:'locked',label:'TERMINAL / CORE',inset:true },
],[
{ rig:'new',label:'NEW MACHINE' },
{ rig:'met',label:'MET' },
{ rig:'done',label:'ALL CLEARED' },
]];

function uiMapPalette(node) {
const style = window.getComputedStyle(node);
return Object.fromEntries(UI_MAP_PALETTE_NAMES.map(function (name) { return [name,style.getPropertyValue('--' + name).trim()]; }));
}

function uiMapProvisionalTile(view) {
return Math.max(1,Math.floor(Math.min(view.width / view.world.cols,view.height / view.world.rows)));
}

function uiMapFontSize(tile,minSize) {
return Math.min(UI_MAP_LABEL.maxSize,Math.max(minSize,Math.round(tile * UI_MAP_LABEL.tileRatio)));
}
function uiMapFont(size) {
return { size,css:size + 'px ' + UI_MAP_LABEL.family };
}
function uiMapLabelFont(tile) {
return uiMapFont(uiMapFontSize(tile,UI_MAP_LABEL.minSize));
}

function uiMapLegendSwatch(item) {
return item.rig ? UI_MAP_LEGEND.rigSwatch :UI_MAP_LEGEND.swatch;
}
function uiMapLegendItemWidth(ctx,item) {
return uiMapLegendSwatch(item) + UI_MAP_LEGEND.pad / 2 + ctx.measureText(item.label).width;
}
function uiMapLegendRowWidth(ctx,items) {
const width = items.reduce(function (sum,item) { return sum + uiMapLegendItemWidth(ctx,item); },0);
return width + UI_MAP_LEGEND.gap * (items.length - 1) + UI_MAP_LEGEND.pad * 2;
}
function uiMapLegendWidth(ctx) {
return Math.max(...UI_MAP_LEGEND_ROWS.map(function (items) { return uiMapLegendRowWidth(ctx,items); }));
}
function uiMapLegendFont(view) {
let font = uiMapFont(uiMapFontSize(uiMapProvisionalTile(view),UI_MAP_LEGEND.minSize));
view.ctx.font = font.css;
while (font.size > UI_MAP_LEGEND.floorSize && uiMapLegendWidth(view.ctx) > view.width) {
font = uiMapFont(font.size - 1);
view.ctx.font = font.css;
}
return font;
}

function uiMapLegendRowHeight(legendFont) {
return Math.max(Math.round(legendFont.size * UI_MAP_LEGEND.rowRatio),UI_MAP_LEGEND.rigSwatch + UI_MAP_LEGEND.pad / 2);
}
function uiMapLayout(view,legendFont) {
const strip = uiMapLegendRowHeight(legendFont) * UI_MAP_LEGEND_ROWS.length + UI_MAP_LEGEND.pad;
const mapHeight = Math.max(0,view.height - strip);
const tile = Math.max(1,Math.floor(Math.min(view.width / view.world.cols,mapHeight / view.world.rows)));
return {
tile,
left:Math.floor((view.width - tile * view.world.cols) / 2),
top:Math.floor((mapHeight - tile * view.world.rows) / 2),
stripTop:mapHeight,
};
}

function uiOpenerOpen(world,progress,thing) {
return isOpen(world,progress,thing.id);
}
const UI_MAP_OPEN_TESTS = {
terminal:function (world,progress,thing) { return progress.breached.has(thing.key); },
core:function (world,progress,thing) { return coreState(world,progress,thing.family) !== 'sealed'; },
kernel:function (world,progress) { return Boolean(world.kernelDoor) && isOpen(world,progress,world.kernelDoor.id); },
door:uiOpenerOpen,
gate:uiOpenerOpen,
'kernel-door':uiOpenerOpen,
};
function uiMapThingState(world,progress,thing) {
return UI_MAP_OPEN_TESTS[thing.kind](world,progress,thing) ? 'open' :'locked';
}

function uiMapStateColor(palette,state) {
return palette[UI_MAP_STATE_COLORS[state]];
}
function uiMapThingColor(view,cell) {
return uiMapStateColor(view.palette,uiMapThingState(view.world,view.progress,view.world.things[cell.id]));
}
function uiMapBarrierColor(view,cell) {
if (cell.kind === 'encrypted') return uiMapStateColor(view.palette,'encrypted');
return cell.id && Object.hasOwn(UI_MAP_OPEN_TESTS,cell.kind) ? uiMapThingColor(view,cell) :null;
}

function uiMapCellAt(view,index) {
return { col:index % view.world.cols,row:Math.floor(index / view.world.cols) };
}
function uiMapCellRect(view,index) {
const cell = uiMapCellAt(view,index);
return { left:view.layout.left + cell.col * view.layout.tile,top:view.layout.top + cell.row * view.layout.tile,size:view.layout.tile };
}
function uiRectBox(rect) {
return { left:rect.left,right:rect.left + rect.size,top:rect.top,bottom:rect.top + rect.size };
}
function uiMapThingBoxes(view) {
const boxes = [];
view.world.cells.forEach(function (cell,index) {
if (!UI_MAP_RESERVED_KINDS.has(cell.kind)) return;
const rect = uiMapCellRect(view,index);
boxes.push(uiRectBox(cell.kind === 'rig' ? uiMapRigRect(rect) :rect));
});
return boxes;
}

function uiFillRect(ctx,rect,color) {
ctx.fillStyle = color;
ctx.fillRect(rect.left,rect.top,rect.size,rect.size);
}
function uiDrawInsetSquare(ctx,rect,color,ratio = UI_MAP_CELL.insetRatio) {
const size = rect.size * ratio;
const offset = (rect.size - size) / 2;
uiFillRect(ctx,{ left:rect.left + offset,top:rect.top + offset,size },color);
}
function uiDrawMapGround(view,rect,index) {
const accent = uiAccentOf(uiSectorAt(view.world,uiMapCellAt(view,index)));
uiFillRect(view.ctx,rect,view.palette.panel);
view.ctx.save();
view.ctx.globalAlpha = UI_MAP_CELL.groundTint;
uiFillRect(view.ctx,rect,view.palette[accent]);
view.ctx.restore();
}

function uiMapRigRect(rect) {
const size = Math.max(UI_MAP_RIG.minPx,Math.round(rect.size * UI_MAP_RIG.ratio));
return { left:rect.left + (rect.size - size) / 2,top:rect.top + (rect.size - size) / 2,size };
}
function uiMapRigLook(view,thing) {
const met = view.progress.met !== undefined && view.progress.met.has(thing.rig);
return UI_MAP_RIG_LOOKS[uiRigState({ met,...uiRigCleared(view.save,thing.rig) }).sprite];
}
function uiDrawRigMark(ctx,mark) {
const outline = UI_MAP_RIG.outline;
uiFillRect(ctx,{ left:mark.rect.left - outline,top:mark.rect.top - outline,size:mark.rect.size + outline * 2 },mark.palette.bg);
uiFillRect(ctx,mark.rect,mark.color);
if (mark.look === 'new') uiDrawInsetSquare(ctx,mark.rect,mark.palette.panel,UI_MAP_RIG.hollow);
if (mark.look === 'done') uiDrawInsetSquare(ctx,mark.rect,mark.palette.text,UI_MAP_RIG.core);
}
function uiDrawMapRigs(view) {
view.world.cells.forEach(function (cell,index) {
if (cell.kind !== 'rig') return;
const thing = view.world.things[cell.id];
const color = view.palette[uiRigAccent(thing.rig,thing.family)];
uiDrawRigMark(view.ctx,{ rect:uiMapRigRect(uiMapCellRect(view,index)),color,look:uiMapRigLook(view,thing),palette:view.palette });
});
}
function uiDrawMapCell(view,cell,index) {
const rect = uiMapCellRect(view,index);
const inset = UI_MAP_INSET_KINDS.has(cell.kind);
if (inset || UI_MAP_GROUND_KINDS.has(cell.kind)) uiDrawMapGround(view,rect,index);
if (inset && cell.kind !== 'rig') return uiDrawInsetSquare(view.ctx,rect,uiMapThingColor(view,cell));
const color = uiMapBarrierColor(view,cell);
if (color) uiFillRect(view.ctx,rect,color);
}

function uiDrawMapCells(view) {
view.world.cells.forEach(function (cell,index) { uiDrawMapCell(view,cell,index); });
uiDrawMapRigs(view);
}

function uiMapLabelPoint(view,spot,place) {
const width = view.ctx.measureText(spot.text).width;
const cellLeft = view.layout.left + spot.col * view.layout.tile;
const left = place.before ? cellLeft + view.layout.tile - UI_MAP_LABEL.inset - width :cellLeft + UI_MAP_LABEL.inset;
const rawTop = view.layout.top + spot.row * view.layout.tile + view.layout.tile - UI_MAP_LABEL.inset + place.shift * view.labelHeight;
return {
left:Math.min(Math.max(left,UI_MAP_LABEL.inset),view.width - width - UI_MAP_LABEL.inset),
top:Math.min(Math.max(rawTop,view.labelHeight + UI_MAP_LABEL.inset),view.height - UI_MAP_LABEL.inset),
width,
};
}

function uiMapPadded(box,by) {
return { left:box.left - by,right:box.right + by,top:box.top - by,bottom:box.bottom + by };
}
function uiMapLabelCandidate(view,spot,place) {
const point = uiMapLabelPoint(view,spot,place);
const text = { left:point.left,right:point.left + point.width,top:point.top - view.labelHeight,bottom:point.top };
return { point,panel:uiMapPadded(text,UI_MAP_LABEL.pad),spaced:uiMapPadded(text,UI_MAP_LABEL.gap) };
}

function uiMapOverlapArea(boxA,boxB) {
const across = Math.min(boxA.right,boxB.right) - Math.max(boxA.left,boxB.left);
const down = Math.min(boxA.bottom,boxB.bottom) - Math.max(boxA.top,boxB.top);
return across > 0 && down > 0 ? across * down :0;
}
function uiMapCoverage(box,boxes) {
return boxes.reduce(function (sum,other) { return sum + uiMapOverlapArea(box,other); },0);
}
function uiMapLabelFits(box,boxes) {
return uiMapCoverage(box,boxes) === 0;
}
function uiMapLeastCovering(candidates,boxes) {
return candidates.reduce(function (best,candidate) { return uiMapCoverage(candidate.panel,boxes) < uiMapCoverage(best.panel,boxes) ? candidate :best; });
}

function uiMapLabelCandidates(view,spot) {
return UI_MAP_LABEL_PLACES.map(function (place) { return uiMapLabelCandidate(view,spot,place); });
}
function uiMapClearCandidates(view,candidates) {
return candidates.filter(function (candidate) { return uiMapLabelFits(candidate.panel,view.reserved); });
}

function uiMapBestLabelSpot(view,placed,spot) {
const candidates = uiMapLabelCandidates(view,spot);
const clear = uiMapClearCandidates(view,candidates);
const clean = clear.find(function (candidate) { return uiMapLabelFits(candidate.spaced,placed); });
if (clean || !spot.mustDraw) return clean || null;
return clear.length ? uiMapLeastCovering(clear,placed) :uiMapLeastCovering(candidates,view.reserved);
}

function uiDrawMapLabelPanel(ctx,box,color) {
ctx.save();
ctx.globalAlpha = UI_MAP_LABEL.panelAlpha;
ctx.fillStyle = color;
ctx.fillRect(box.left,box.top,box.right - box.left,box.bottom - box.top);
ctx.restore();
}

function uiDrawMapLabelIfFits(view,placed,spot) {
const chosen = uiMapBestLabelSpot(view,placed,spot);
if (!chosen) return;
placed.push(chosen.panel);
uiDrawMapLabelPanel(view.ctx,chosen.panel,view.palette.bg);
view.ctx.fillStyle = spot.color;
view.ctx.fillText(spot.text,chosen.point.left,chosen.point.top);
}

function uiMapLandmarks(view) {
const families = new Map(Object.values(view.world.sectors).map(function (sector) { return [sector.name.toUpperCase(),sector.key]; }));
const spots = view.world.labels.map(function (label,index) {
const family = families.get(label.text.toUpperCase()) || null;
const spot = { ...label,color:view.palette[uiAccentOf(family)],mustDraw:true };
return { spot,options:uiMapClearCandidates(view,uiMapLabelCandidates(view,spot)).length,rank:family ? index :index + view.world.labels.length };
});
spots.sort(function (one,other) { return one.options - other.options || one.rank - other.rank; });
return spots.map(function (entry) { return entry.spot; });
}

function uiDrawMapLabels(view) {
const font = uiMapLabelFont(view.layout.tile);
view.ctx.font = font.css;
const legend = uiMapLegendBox(view);
const strip = { left:legend.left,right:legend.left + legend.width,top:legend.top,bottom:legend.top + legend.height };
const labelView = { ...view,labelHeight:font.size,reserved:[...uiMapThingBoxes(view),strip] };
const placed = [];
const encrypted = uiMapStateColor(view.palette,'encrypted');
uiMapLandmarks(labelView).forEach(function (spot) { uiDrawMapLabelIfFits(labelView,placed,spot); });
uiRigPlates(view.world).forEach(function (plate) { uiDrawMapLabelIfFits(labelView,placed,{ ...plate,color:view.palette[plate.accent],mustDraw:false }); });
view.world.encrypted.forEach(function (entry) { uiDrawMapLabelIfFits(labelView,placed,{ text:entry.name,col:entry.col,row:entry.row,color:encrypted,mustDraw:false }); });
}

function uiMapDot(ctx,dot) {
ctx.beginPath();
ctx.fillStyle = dot.color;
ctx.arc(dot.cx,dot.cy,dot.radius,0,Math.PI * 2);
ctx.fill();
}

function uiDrawMapAvatar(view) {
const cx = view.layout.left + (view.avatar.col + UI_MAP_AVATAR.centre) * view.layout.tile;
const cy = view.layout.top + (view.avatar.row + UI_MAP_AVATAR.centre) * view.layout.tile;
const radius = Math.max(UI_MAP_AVATAR.minRadius,view.layout.tile * UI_MAP_AVATAR.ratio);
uiMapDot(view.ctx,{ cx,cy,radius,color:view.palette.cyan });
uiMapDot(view.ctx,{ cx,cy,radius:radius * UI_MAP_AVATAR.core,color:view.palette.bright });
}

function uiMapLegendBox(view) {
return { left:0,top:view.layout.stripTop,width:view.width,height:view.height - view.layout.stripTop };
}

function uiDrawMapLegendPanel(ctx,box,palette) {
ctx.save();
ctx.globalAlpha = UI_MAP_LEGEND.alpha;
ctx.fillStyle = palette.bg;
ctx.fillRect(box.left,box.top,box.width,box.height);
ctx.restore();
ctx.strokeStyle = palette.border;
ctx.strokeRect(box.left,box.top,box.width,box.height);
}

function uiMapLegendEntries(ctx,box) {
const rowHeight = (box.height - UI_MAP_LEGEND.pad) / UI_MAP_LEGEND_ROWS.length;
return UI_MAP_LEGEND_ROWS.flatMap(function (items,line) {
const middle = box.top + UI_MAP_LEGEND.pad / 2 + rowHeight * (line + 1 / 2);
let left = UI_MAP_LEGEND.pad;
return items.map(function (item) {
const size = uiMapLegendSwatch(item);
const entry = { ...item,left,top:middle - size / 2,size };
left += uiMapLegendItemWidth(ctx,item) + UI_MAP_LEGEND.gap;
return entry;
});
});
}

function uiFillLegendSwatch(ctx,entry,palette) {
if (entry.rig) return uiDrawRigMark(ctx,{ rect:entry,color:palette[UI_MAP_LEGEND.rigAccent],look:entry.rig,palette });
const color = uiMapStateColor(palette,entry.state);
if (!entry.inset) return uiFillRect(ctx,entry,color);
uiFillRect(ctx,entry,palette.border);
uiDrawInsetSquare(ctx,entry,color);
}

function uiDrawMapLegendEntry(ctx,entry,palette) {
uiFillLegendSwatch(ctx,entry,palette);
ctx.fillStyle = palette.text;
ctx.fillText(entry.label,entry.left + entry.size + UI_MAP_LEGEND.pad / 2,entry.top + entry.size);
}

function uiDrawMapLegend(view) {
view.ctx.font = view.legendFont.css;
const box = uiMapLegendBox(view);
uiDrawMapLegendPanel(view.ctx,box,view.palette);
uiMapLegendEntries(view.ctx,box).forEach(function (entry) { uiDrawMapLegendEntry(view.ctx,entry,view.palette); });
}

function uiDrawMap(view) {
view.ctx.clearRect(0,0,view.width,view.height);
if (view.width <= 0 || view.height <= 0 || !view.world.cols || !view.world.rows) return null;
view.ctx.fillStyle = view.palette.bg;
view.ctx.fillRect(0,0,view.width,view.height);
const legendFont = uiMapLegendFont(view);
const framed = { ...view,legendFont,layout:uiMapLayout(view,legendFont) };
uiDrawMapCells(framed);
uiDrawMapLabels(framed);
uiDrawMapLegend(framed);
uiDrawMapAvatar(framed);
return { tile:framed.layout.tile,left:framed.layout.left,top:framed.layout.top };
}

function uiSizeMapCanvas(canvas) {
const dpr = window.devicePixelRatio || 1;
const width = canvas.clientWidth;
const height = canvas.clientHeight;
canvas.width = Math.round(width * dpr);
canvas.height = Math.round(height * dpr);
const ctx = canvas.getContext('2d');
ctx.setTransform(dpr,0,0,dpr,0,0);
return { ctx,width,height };
}

function uiDrawMapInto(canvas,state) {
const sized = uiSizeMapCanvas(canvas);
if (!sized.width || !sized.height) return;
uiDrawMap({ ...sized,palette:uiMapPalette(canvas),world:state.world,progress:state.progress,save:state.save,avatar:state.avatar });
}

export { uiDrawMap, uiDrawMapInto };
