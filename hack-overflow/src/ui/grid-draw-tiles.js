import { DIRS, cellToward } from '../game/move.js';
import { coreState } from '../game/progress.js';
import { labHidden,labThingHidden } from '../game/rig-catalog.js';
import { cacheVanishLook } from '../game/reward-motion.js';
import { visibleRange } from '../game/viewport.js';
import { cellAt } from '../game/world.js';
import { UI_BEAM_FRAMES, UI_SPRITE_SIZE, uiBadgeSprite, uiRingSprite, uiSpriteCanvas, uiSpriteRows } from './grid-sprites.js';
import { UI_GROUND, UI_LABEL, UI_RIG_ACCENTS, UI_SAFEHOUSE_ACCENT, UI_SECTOR_ACCENTS, uiAccentOf, uiIsGround, uiLabelWidth, uiPulse, uiRigAccent } from './grid-draw-common.js';
import { uiCellOf,uiIndexAt,uiRegionsOf } from './grid-regions.js';
import { uiBakedMap,uiBlitBaked } from './grid-bake.js';
import { uiBlitLabel } from './grid-world-text.js';
import { uiRigCleared, uiRigLayers, uiRigOverlays, uiRigPlan, uiRigPlates, uiRigState } from './grid-draw-rigs.js';
const UI_ENCRYPTED_ACCENT = 'dim';
const UI_NEAR_KINDS = new Set(['terminal','core','kernel','rig']);
const UI_WALL_EDGES = [
{ dir:'down',sprite:'wall-face' },{ dir:'up',sprite:'rim-up' },{ dir:'left',sprite:'rim-left' },{ dir:'right',sprite:'rim-right' },
];
const UI_WALL_CORNERS = [
{ dirs:['up','right'],sprite:'rim-ne' },{ dirs:['up','left'],sprite:'rim-nw' },
{ dirs:['down','right'],sprite:'rim-se' },{ dirs:['down','left'],sprite:'rim-sw' },
];
const UI_BARRIER_SPRITES = { door:{ flat:'door',turned:'door-turned' },'kernel-door':{ flat:'kernel-door',turned:'kernel-door' } };
const UI_SPANNING_KINDS = new Set(['door','gate','kernel-door','barrier']);
const UI_SENTRY = { closed:'red',open:'primary' };
const UI_NO_LAYERS = Object.freeze([]);
const UI_HALF = UI_SPRITE_SIZE / 2;
const UI_FULL_STARS = 3;
const UI_DOOR_OPEN = -1;
const UI_TILE_MOTION = { beamMs:90,blinkMs:530,sparkleMs:1900,sparkleOn:260 };
const UI_FLOOR_HASH = { colMul:0x27d4eb2d,rowMul:0x165667b1,mix:0x85ebca6b,shift:15,buckets:16,trace:11,vent:14 };
const UI_COUNT_OVERLAP = 3;


function uiCellHash(cell) {
const seed = Math.imul(cell.col,UI_FLOOR_HASH.colMul) ^ Math.imul(cell.row,UI_FLOOR_HASH.rowMul);
const mixed = Math.imul(seed ^ (seed >>> UI_FLOOR_HASH.shift),UI_FLOOR_HASH.mix);
return (mixed ^ (mixed >>> UI_FLOOR_HASH.shift)) >>> 0;
}
function uiFloorSprite(hash) {
const bucket = hash % UI_FLOOR_HASH.buckets;
if (bucket >= UI_FLOOR_HASH.vent) return 'floor-vent';
return bucket >= UI_FLOOR_HASH.trace ? 'floor-trace' :'floor';
}
function uiFloorLayers(world,spot) {
const floor = [{ sprite:uiFloorSprite(spot.hash),accent:spot.accent }];
const spawn = world.spawn.col === spot.cell.col && world.spawn.row === spot.cell.row;
return spawn ? [...floor,{ sprite:'pad',accent:spot.accent }] :floor;
}
function uiEdgeLayer(world,spot,edge) {
return { sprite:edge.sprite,accent:uiAccentOf(spot.regions[uiIndexAt(world,edge.cell)]) };
}
function uiCornerLayers(world,spot) {
return UI_WALL_CORNERS.flatMap(function (corner) {
const sides = corner.dirs.map(function (dir) { return cellToward(spot.cell,dir); });
const cell = cellToward(sides[0],corner.dirs[1]);
const open = uiIsGround(world,cell) && !sides.some(function (side) { return uiIsGround(world,side); });
return open ? [uiEdgeLayer(world,spot,{ sprite:corner.sprite,cell })] :[];
});
}
function uiWallLayers(world,spot) {
const edges = UI_WALL_EDGES.map(function (edge) { return { sprite:edge.sprite,cell:cellToward(spot.cell,edge.dir) }; });
const open = edges.filter(function (edge) { return uiIsGround(world,edge.cell); });
const layers = open.map(function (edge) { return uiEdgeLayer(world,spot,edge); });
return [{ sprite:'wall-top',accent:UI_SAFEHOUSE_ACCENT },...layers,...uiCornerLayers(world,spot)];
}
function uiIsBlock(world,cell,id) {
const entry = cellAt(world,cell);
return !entry || !UI_GROUND.has(entry.kind) || entry.kind === 'terminal' || entry.id === id;
}
function uiTurned(world,spot) {
const left = cellToward(spot.cell,'left');
const right = cellToward(spot.cell,'right');
return uiIsBlock(world,left,spot.entry.id) && uiIsBlock(world,right,spot.entry.id);
}
function uiEmitterLayers(world,spot) {
const sides = spot.turned ? ['left','right'] :['up','down'];
const walled = sides.filter(function (side) { return !uiIsGround(world,cellToward(spot.cell,side)); });
return walled.map(function (side) { return { sprite:'emitter-' + side,accent:spot.accent }; });
}
function uiBarrierPlan(world,spot) {
const sprites = UI_BARRIER_SPRITES[spot.entry.kind];
const plan = { jamb:{ sprite:spot.turned ? 'jamb-turned' :'jamb',accent:spot.accent },emitters:uiEmitterLayers(world,spot) };
return sprites ? { ...plan,sprite:spot.turned ? sprites.turned :sprites.flat } :plan;
}
function uiGroundPlan(world,spot) {
const floor = uiFloorLayers(world,spot);
const plan = { kind:spot.entry.kind,id:spot.entry.id,accent:spot.accent,hash:spot.hash,floor,layers:floor };
if (spot.entry.kind === 'kernel') plan.layers = [...floor,{ sprite:'kernel',accent:spot.accent }];
return spot.turned === null ? plan :{ ...plan,turned:spot.turned,...uiBarrierPlan(world,spot) };
}
function uiCellPlan(world,spot) {
const kind = spot.entry.kind;
if (kind === 'wall') return { kind,layers:uiWallLayers(world,spot) };
if (kind === 'rig') return uiRigPlan(world,spot);
if (kind === 'encrypted') return { kind,layers:[{ sprite:'encrypted',accent:UI_ENCRYPTED_ACCENT }] };
if (!UI_GROUND.has(kind)) return { kind,layers:UI_NO_LAYERS };
return uiGroundPlan(world,{ ...spot,turned:UI_SPANNING_KINDS.has(kind) ? uiTurned(world,spot) :null });
}
function uiLabelPlan(world,label) {
const sector = Object.values(world.sectors).find(function (entry) { return entry.name.toUpperCase() === label.text.toUpperCase(); });
return { ...label,accent:uiAccentOf(sector ? sector.key :null) };
}
function uiMakePlan(world) {
const regions = uiRegionsOf(world);
const refs = world.cells.map(function (entry,index) { return uiCellOf(world,index); });
const cells = world.cells.map(function (entry,index) {
return uiCellPlan(world,{ entry,cell:refs[index],regions,hash:uiCellHash(refs[index]),accent:uiAccentOf(regions[index]) });
});
const labels = world.labels.map(function (label) { return uiLabelPlan(world,label); });
const live = world.cells.map(function (entry) { return UI_STATE_LAYERS.has(entry.kind); });
return { regions,cells,refs,live,labels:[...labels,...uiRigPlates(world)] };
}
const uiPlans = new WeakMap();
function uiPlanOf(world) {
if (!uiPlans.has(world)) uiPlans.set(world,uiMakePlan(world));
return uiPlans.get(world);
}
function uiSectorAt(world,cell) {
const index = uiIndexAt(world,cell);
return index < 0 ? null :uiPlanOf(world).regions[index];
}

function uiBlinkOn(frame) {
return frame.reducedMotion || Math.floor(frame.now / UI_TILE_MOTION.blinkMs) % 2 === 0;
}
function uiRecall(spot,look) {
return spot.looks ? spot.looks.get(look) :undefined;
}
function uiRemember(spot,look,layers) {
if (!spot.looks) spot.looks = new Map();
spot.looks.set(look,layers);
return layers;
}
function uiBuildTerminal(spot,look) {
const layers = [...spot.floor,{ sprite:'terminal-' + look.state,accent:spot.accent }];
for (let pip = 1; pip <= look.stars; pip += 1) layers.push({ sprite:'pip-' + pip,accent:spot.accent });
if (look.led) layers.push({ sprite:'led',accent:spot.accent });
return layers;
}
function uiTerminalLayers(frame,spot) {
const key = frame.world.things[spot.id].key;
const breached = frame.progress.breached.has(key);
const stars = breached ? Math.min(frame.progress.best[key] || 0,UI_FULL_STARS) :0;
const state = breached ? (stars === UI_FULL_STARS ? 'breached' :'replay') :'idle';
const led = !breached && uiBlinkOn(frame);
const look = state + stars + led;
return uiRecall(spot,look) || uiRemember(spot,look,uiBuildTerminal(spot,{ state,stars,led }));
}
function uiCoreLayers(frame,spot) {
const state = coreState(frame.world,frame.progress,frame.world.things[spot.id].family);
const layers = [...spot.floor,{ sprite:'core-' + state,accent:spot.accent }];
return state === 'ready' ? [...layers,{ sprite:'core-glow',accent:spot.accent,alpha:uiPulse(frame) }] :layers;
}
const uiCacheTaken = new Map();
function uiCacheTakenAt(frame,spot) {
if (!frame.progress.caches.has(spot.id)) {
uiCacheTaken.set(spot.id,null);
return null;
}
const seen = uiCacheTaken.get(spot.id);
if (seen === undefined) uiCacheTaken.set(spot.id,-Infinity);
else if (seen === null) uiCacheTaken.set(spot.id,frame.now);
return uiCacheTaken.get(spot.id);
}
function uiCacheVanishLayers(frame,spot) {
const look = frame.reducedMotion ? null :cacheVanishLook(frame.now - uiCacheTakenAt(frame,spot));
const empty = [...spot.floor,{ sprite:'cache-empty',accent:spot.accent }];
if (!look) return empty;
const lift = { lift:look.lift,alpha:look.alpha };
const flash = look.flash ? [{ sprite:'cache',accent:spot.accent,blend:'lighter',...lift }] :[];
return [...empty,{ sprite:'cache',accent:spot.accent,...lift },...flash];
}
function uiBuildCache(spot,twinkle) {
const layers = [...spot.floor,{ sprite:'cache',accent:spot.accent }];
return twinkle ? [...layers,{ sprite:'sparkle',accent:spot.accent }] :layers;
}
function uiCacheLayers(frame,spot) {
if (uiCacheTakenAt(frame,spot) !== null) return uiCacheVanishLayers(frame,spot);
const twinkle = !frame.reducedMotion && (frame.now + spot.hash) % UI_TILE_MOTION.sparkleMs < UI_TILE_MOTION.sparkleOn;
return uiRecall(spot,twinkle) || uiRemember(spot,twinkle,uiBuildCache(spot,twinkle));
}
function uiBuildDoor(spot,shift) {
const layers = [...spot.floor,spot.jamb];
if (shift < 0) return layers;
return [...layers,{ sprite:spot.sprite,accent:spot.accent,slide:{ axis:spot.turned ? 'col' :'row',shift } }];
}
function uiDoorLayers(frame,spot) {
const openness = frame.doorOpenness(spot.id);
const shift = openness >= 1 ? -1 :Math.round(Math.max(openness,0) * UI_HALF);
return uiRecall(spot,shift) || uiRemember(spot,shift,uiBuildDoor(spot,shift));
}
function uiBeamFrame(frame) {
return frame.reducedMotion ? 0 :Math.floor(frame.now / UI_TILE_MOTION.beamMs) % UI_BEAM_FRAMES;
}
function uiGateLayers(frame,spot) {
const openness = frame.doorOpenness(spot.id);
if (openness >= 1) return [...spot.floor,...spot.emitters];
const beam = uiBeamFrame(frame);
const beams = { sprite:(spot.turned ? 'beams-turned-' :'beams-') + beam,accent:spot.accent,alpha:1 - Math.max(openness,0) };
return [...spot.floor,beams,...spot.emitters];
}
function uiSentryField(spot,look) {
return { sprite:(spot.turned ? 'beams-turned-' :'beams-') + look.beam,accent:look.accent,alpha:look.alpha };
}
function uiSentryOpenLayers(spot) {
const chevrons = { sprite:spot.turned ? 'chevrons-turned' :'chevrons',accent:UI_SENTRY.open };
const posts = spot.emitters.map(function (emitter) { return { sprite:emitter.sprite.replace('emitter','post'),accent:UI_SENTRY.open }; });
return [...spot.floor,chevrons,...posts];
}
function uiSentryLayers(frame,spot) {
const openness = frame.doorOpenness(spot.id);
if (openness >= 1) return uiSentryOpenLayers(spot);
const field = uiSentryField(spot,{ beam:uiBeamFrame(frame),accent:UI_SENTRY.closed,alpha:1 - Math.max(openness,0) });
const emitters = spot.emitters.map(function (emitter) { return { ...emitter,accent:UI_SENTRY.closed }; });
return [...spot.floor,field,...emitters];
}
const UI_STATE_LAYERS = new Map([
['terminal',uiTerminalLayers],['core',uiCoreLayers],['cache',uiCacheLayers],['door',uiDoorLayers],
['kernel-door',uiDoorLayers],['gate',uiGateLayers],['barrier',uiSentryLayers],['rig',uiRigLayers],
]);
function uiCellLayers(frame,cell) {
const index = uiIndexAt(frame.world,cell);
if (index < 0) return UI_NO_LAYERS;
const spot = uiPlanOf(frame.world).cells[index];
const layered = UI_STATE_LAYERS.get(spot.kind);
return layered ? layered(frame,spot) :spot.layers;
}

function uiPlanLayers(spot) {
return [...(spot.layers || []),...(spot.floor || []),...(spot.emitters || []),...(spot.jamb ? [spot.jamb] :[])];
}
function uiWarmPairs(world) {
const seen = new Map();
uiPlanOf(world).cells.flatMap(uiPlanLayers).forEach(function (layer) { seen.set(layer.sprite + '|' + layer.accent,[layer.sprite,layer.accent]); });
return [...seen.values()];
}

function uiCentred(sprite,place) {
const rows = uiSpriteRows(sprite);
const cols = place.cells.map(function (cell) { return cell.col; });
const lines = place.cells.map(function (cell) { return cell.row; });
const across = (Math.min(...cols) + Math.max(...cols) + 1) / 2 - rows[0].length / UI_SPRITE_SIZE / 2;
const down = (Math.min(...lines) + Math.max(...lines) + 1) / 2 - rows.length / UI_SPRITE_SIZE / 2;
const snap = function (value) { return Math.round(value * UI_SPRITE_SIZE) / UI_SPRITE_SIZE; };
return { sprite,accent:place.accent || UI_SAFEHOUSE_ACCENT,alpha:place.alpha,col:snap(across),row:snap(down) };
}
function uiGateBadges(frame) {
return Object.values(frame.world.gates).flatMap(function (gate) {
const openness = frame.doorOpenness(gate.id);
if (openness >= 1) return [];
return [uiCentred(uiBadgeSprite('LV' + gate.level,'gate'),{ cells:gate.cells,alpha:1 - Math.max(openness,0) })];
});
}
function uiCountRow(world,place) {
const height = uiSpriteRows(place.sprite).length / UI_SPRITE_SIZE;
const overlap = UI_COUNT_OVERLAP / UI_SPRITE_SIZE;
const above = world.kernel ? world.kernel.row < place.ring.row :false;
return above ? place.ring.row - height + overlap :place.ring.row + 1 - overlap;
}
function uiKernelOverlays(frame) {
const door = frame.world.kernelDoor;
const openness = door ? frame.doorOpenness(door.id) :1;
if (openness >= 1) return [];
const total = frame.world.placed.length;
const lit = total - frame.progress.left;
const alpha = 1 - Math.max(openness,0);
const ring = uiCentred(uiRingSprite(lit,total),{ cells:door.cells,alpha });
const count = uiCentred(uiBadgeSprite(lit + '/' + total,'kernel'),{ cells:door.cells,alpha });
return [ring,{ ...count,row:uiCountRow(frame.world,{ ring,sprite:count.sprite }) }];
}
function uiNearAt(frame,cell) {
const entry = cellAt(frame.world,cell);
return entry !== null && UI_NEAR_KINDS.has(entry.kind) && !labThingHidden(frame.progress,frame.world.things[entry.id]);
}
function uiFocusOverlays(frame) {
const avatar = frame.avatar;
if (!avatar || avatar.moving) return [];
const pos = { col:Math.round(avatar.col),row:Math.round(avatar.row) };
const dir = [avatar.facing,...Object.keys(DIRS)].find(function (side) {
return Object.hasOwn(DIRS,side) && uiNearAt(frame,cellToward(pos,side));
});
if (!dir) return [];
const cell = cellToward(pos,dir);
return [{ sprite:'focus',accent:UI_SAFEHOUSE_ACCENT,alpha:uiPulse(frame),col:cell.col,row:cell.row }];
}
function uiTileOverlays(frame) {
return [...uiRigOverlays(frame),...uiGateBadges(frame),...uiKernelOverlays(frame),...uiFocusOverlays(frame)];
}

const UI_TIE_EPS = 1e-6;
function uiSnap(pass,value) {
return Math.round(value * pass.dpr + UI_TIE_EPS) / pass.dpr;
}
function uiBoxAt(pass,place) {
const left = uiSnap(pass,pass.left + place.col * pass.tile);
const top = uiSnap(pass,pass.top + place.row * pass.tile);
const right = uiSnap(pass,pass.left + (place.col + place.cols) * pass.tile);
return { left,top,width:right - left,height:uiSnap(pass,pass.top + (place.row + place.rows) * pass.tile) - top };
}
function uiDrawSlid(pass,part) {
const shift = part.slide.shift;
const keep = UI_HALF - shift;
const source = part.canvas.width / UI_SPRITE_SIZE;
const unit = pass.tile / UI_SPRITE_SIZE;
const box = part.box;
[{ from:shift,to:0 },{ from:UI_HALF,to:UI_HALF + shift }].forEach(function (half) {
const start = Math.round(half.from * source);
const span = Math.round(keep * source);
if (part.slide.axis === 'row') {
pass.ctx.drawImage(part.canvas,0,start,part.canvas.width,span,box.left,uiSnap(pass,box.top + half.to * unit),box.width,keep * unit);
return;
}
pass.ctx.drawImage(part.canvas,start,0,span,part.canvas.height,uiSnap(pass,box.left + half.to * unit),box.top,keep * unit,box.height);
});
}
function uiDrawLayer(pass,box,layer) {
const canvas = uiSpriteCanvas(layer.sprite,layer.accent,pass.paint);
pass.ctx.globalAlpha = layer.alpha === undefined ? 1 :layer.alpha;
if (layer.blend) pass.ctx.globalCompositeOperation = layer.blend;
if (layer.slide && layer.slide.shift > 0) uiDrawSlid(pass,{ canvas,box,slide:layer.slide });
else pass.ctx.drawImage(canvas,box.left,uiSnap(pass,box.top - (layer.lift || 0) * box.height),box.width,box.height);
if (layer.blend) pass.ctx.globalCompositeOperation = 'source-over';
}
function uiDrawCell(pass,cell) {
const layers = uiCellLayers(pass.frame,cell);
if (layers.length === 0) return;
const box = uiBoxAt(pass,{ col:cell.col,row:cell.row,cols:1,rows:1 });
for (const layer of layers) uiDrawLayer(pass,box,layer);
}
function uiDrawOverlay(pass,overlay) {
const rows = uiSpriteRows(overlay.sprite);
const box = uiBoxAt(pass,{ col:overlay.col,row:overlay.row,cols:rows[0].length / UI_SPRITE_SIZE,rows:rows.length / UI_SPRITE_SIZE });
const frame = pass.frame;
if (box.left >= frame.width || box.top >= frame.height || box.left + box.width <= 0 || box.top + box.height <= 0) return;
pass.ctx.globalAlpha = overlay.alpha;
pass.ctx.drawImage(uiSpriteCanvas(overlay.sprite,overlay.accent,pass.paint),box.left,box.top,box.width,box.height);
}
function uiLabelPlace(label,camera,view) {
const right = camera.col + view.cols;
const bottom = camera.row + view.rows;
if (label.col + 1 <= camera.col || label.col >= right) return null;
if (label.row + 1 <= camera.row || label.row >= bottom) return null;
const width = uiLabelWidth(label.text);
return {
col:Math.min(Math.max(label.col,camera.col),right - width),
row:Math.min(Math.max(label.row,camera.row - UI_LABEL.top),bottom - UI_LABEL.bottom),
};
}
function uiFillLabel(pass,spec) {
const ctx = pass.ctx;
ctx.font = spec.font;
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';
ctx.fillStyle = pass.frame.palette.bg;
ctx.fillText(spec.text,spec.left + spec.unit,spec.middle + spec.unit);
ctx.fillStyle = pass.frame.palette[spec.ink];
ctx.fillText(spec.text,spec.left,spec.middle);
}
function uiDrawLabel(pass,label) {
const frame = pass.frame;
const place = uiLabelPlace(label,frame.camera,frame.view);
if (place === null) return;
const unit = pass.tile / UI_SPRITE_SIZE;
const box = uiBoxAt(pass,{ col:place.col,row:place.row,cols:1,rows:1 });
const font = Math.round(pass.tile * UI_LABEL.scale) + UI_LABEL.font;
const spec = { text:label.text,font,ink:label.accent,unit,left:box.left + unit * UI_LABEL.inset,middle:box.top + box.height / 2 };
if (frame.blits) uiBlitLabel(pass.ctx,frame,spec);
else uiFillLabel(pass,spec);
}
function uiDrawLabels(pass) {
pass.ctx.globalAlpha = 1;
uiPlanOf(pass.frame.world).labels.forEach(function (label) {
if (!label.rig || !labHidden(pass.frame.progress,label.rig)) uiDrawLabel(pass,label);
});
}
function uiMapRange(frame) {
const range = visibleRange(frame.camera,frame.view);
return {
col0:Math.max(range.col0,0),col1:Math.min(range.col1,frame.world.cols - 1),
row0:Math.max(range.row0,0),row1:Math.min(range.row1,frame.world.rows - 1),
};
}
function uiDrawRow(pass,range,spec) {
const plan = uiPlanOf(pass.frame.world);
for (let col = range.col0; col <= range.col1; col += 1) {
const index = spec.row * pass.frame.world.cols + col;
if (spec.live === undefined || plan.live[index] === spec.live) uiDrawCell(pass,plan.refs[index]);
}
}
function uiDrawRange(pass,range,live) {
for (let row = range.row0; row <= range.row1; row += 1) uiDrawRow(pass,range,{ row,live });
}
function uiPaintOf(frame) {
return { palette:frame.palette,pixel:Math.max(1,Math.round((frame.tile * frame.dpr) / UI_SPRITE_SIZE)),box:Math.round(frame.tile * frame.dpr) };
}
function uiPassOf(frame,origin) {
return { frame,ctx:origin.ctx,tile:frame.tile,dpr:frame.dpr,left:origin.left,top:origin.top,paint:uiPaintOf(frame) };
}
function uiPaintStill(ctx,job) {
uiDrawRange(uiPassOf(job.frame,{ ctx,left:job.left,top:job.top }),job.region,false);
}
function uiDrawCells(pass,range) {
const frame = pass.frame;
const baked = frame.bake ? uiBakedMap(frame.bake,{ frame,range,paint:uiPaintStill }) :null;
if (baked === null) {
uiDrawRange(pass,range,undefined);
return;
}
uiBlitBaked(pass.ctx,baked,{ x:Math.round(-pass.left * frame.dpr),y:Math.round(-pass.top * frame.dpr) });
uiDrawRange(pass,range,true);
}
function uiDrawTiles(frame) {
const ctx = frame.ctx;
ctx.imageSmoothingEnabled = false;
ctx.globalAlpha = 1;
ctx.fillStyle = frame.palette.bg;
ctx.fillRect(0,0,frame.width,frame.height);
const pass = uiPassOf(frame,{ ctx,left:-frame.camera.col * frame.tile,top:-frame.camera.row * frame.tile });
uiDrawCells(pass,uiMapRange(frame));
uiTileOverlays(frame).forEach(function (overlay) { uiDrawOverlay(pass,overlay); });
uiDrawLabels(pass);
ctx.globalAlpha = 1;
}

export { UI_SECTOR_ACCENTS, UI_SAFEHOUSE_ACCENT, UI_RIG_ACCENTS, uiAccentOf, uiRigAccent, uiRigPlates, uiSectorAt, uiRigState, uiRigCleared, uiCellLayers, uiTileOverlays, uiDrawTiles, uiLabelPlace, uiWarmPairs };
