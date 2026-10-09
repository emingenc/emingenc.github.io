import { TURRET_W1 } from '../game/rooms/data/turret-wave1.js';
import { uiEl } from './dom.js';
import { uiTurretBayBand, uiTurretBoardClass } from './turret-board.js';
import { TRAVEL_MS, uiTurretNoping } from './turret-flow.js';


const PALETTE = {
  bg: '#030805', grid: '#0a1a10', lane: '#1d3a27', rush: '#ff4d5e', cyan: '#2de2ff', magenta: '#ff3ea5', amber: '#ffb020',
  red: '#ff4d5e', text: '#e3f5e8', dim: '#86a38f', dockOff: '#3a1630', flash: '#ffffff', fuseBack: '#2a1a08', paired: '#86a38f',
};
const SCENE_FALLBACK = { width: 360, height: 200 };
const LOG_BAND = 26;
const LOG_MIN_HEIGHT = 150;
const LOG_Y = 13;
const LOG_STEP = 34;
const LOG_X = 58;
const LOG_SHOWN = 4;
const CHIP_BAND = 48;
const MIN_ZONE = 40;
const DOCK_SHARE = 0.8;
const DOCK_MIN = 36;
const DOCK_MAX = 72;
const BAY_X = { single: 0.42, first: 0.3, second: 0.58 };
const LANE_X0 = 0.74;
const LANE_DX = 0.09;
const LANE_DY_MAX = 14;
const LANE_DY_SHARE = 0.18;
const LANES = 3;
const DRONE_ART = ['x.....x', 'xx...xx', '.xxxxx.', '.xx.xx.', '..xxx..'];
const PX_BAY = 4;
const PX_LANE = 2;
const FONT_BAY = 22;
const FONT_SMALL = 18;
const FUSE_BAR_H = 6;
const FUSE_GAP = 4;
const FUSE_HOT_MS = 3000;
const FUSE_PULSE_MS = 2000;
const FUSE_BLINK_MS = 160;
const BLINK_PHASES = 2;
const DRAG_DIM_ALPHA = 0.3;
const MS_PER_S = 1000;
const RAM_MS = 300;
const SHAKE = { dock: 4, hit: 7 };
const SHAKE_RATE = 0.09;
const HIT_ALPHA = 0.35;
const DOCK_ALPHA = 0.12;
const BEAM_MS = 260;
const BEAM_FADE_MS = 220;
const BEAM_DOT = 6;
const BEAM_SIZE = 4;
const POP_MS = 700;
const POP_RISE = 30;
const POP_TOP = 9;
const BURST_REACH = 26;
const BURST_SIZE = 4;
const BURST_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2], [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2]];
const TURRET_AT = { x: 26, lift: 16 };
const BARREL_DOTS = 4;
const BARREL_STEP = 6;
const BARREL_SIZE = 5;
const TURRET_BASE = { w: 22, h: 12 };
const CORNER = 10;
const CORNER_W = 3;
const BOARD_COLS = 3;
const HALF = 0.5;
const FIRST_SLOT = 1;
const GRID_STEP = 24;
const GRID_DRIFT_MS = 260;


function uiSceneSize(canvas) {
  const width = canvas.clientWidth || SCENE_FALLBACK.width;
  const height = canvas.clientHeight || SCENE_FALLBACK.height;
  return { width, height };
}
function uiSceneContext(canvas, size) {
  const ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx) return null;
  const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const width = Math.round(size.width * ratio);
  const height = Math.round(size.height * ratio);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return { ctx, ratio };
}
function uiSceneGeo(size, state) {
  const top = size.height >= LOG_MIN_HEIGHT ? LOG_BAND : 0;
  const zone = Math.max(MIN_ZONE, size.height - CHIP_BAND - top);
  const dock = Math.min(DOCK_MAX, Math.max(DOCK_MIN, zone * DOCK_SHARE));
  return { ...size, top, zone, cy: top + zone / 2, dock, dual: state.next >= TURRET_W1.dualFrom };
}
function uiSceneBay(geo, index) {
  if (!geo.dual) return { x: geo.width * BAY_X.single, y: geo.cy };
  return { x: geo.width * (index > 0 ? BAY_X.second : BAY_X.first), y: geo.cy };
}
function uiSceneLane(geo, lane) {
  const step = Math.min(LANE_DY_MAX, geo.zone * LANE_DY_SHARE);
  const clamped = Math.min(LANES - 1, lane);
  return { x: geo.width * (LANE_X0 + LANE_DX * lane), y: geo.cy + (1 - clamped) * step };
}
function uiSceneSlotPoint(geo, slot) {
  const col = (slot - FIRST_SLOT) % BOARD_COLS;
  return { x: (geo.width * (col + HALF)) / BOARD_COLS, y: geo.height };
}
function uiScenePivot(geo) {
  return { x: TURRET_AT.x, y: geo.top + geo.zone - TURRET_AT.lift };
}
function uiSceneEase(progress) {
  return 1 - (1 - progress) * (1 - progress);
}
function uiSceneLerp(from, to, progress) {
  return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress };
}


function uiSceneText(ctx, text, at) {
  ctx.font = 'bold ' + (at.size || FONT_SMALL) + 'px VT323, monospace';
  ctx.textAlign = at.align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = at.color || PALETTE.text;
  ctx.fillText(text, at.x, at.y);
}
function uiSceneDrone(ctx, at, look) {
  const px = look.px;
  const left = at.x - (DRONE_ART[0].length * px) / 2;
  const top = at.y - (DRONE_ART.length * px) / 2;
  ctx.fillStyle = look.color;
  DRONE_ART.forEach(function (row, rowIndex) {
    [...row].forEach(function (cell, col) {
      if (cell === 'x') ctx.fillRect(left + col * px, top + rowIndex * px, px, px);
    });
  });
  uiSceneText(ctx, String(look.v), { x: at.x, y: at.y, size: look.font, color: PALETTE.text });
}
function uiSceneDots(ctx, segment, upto) {
  const length = Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y);
  const count = Math.max(1, Math.ceil(length / BEAM_DOT));
  for (let i = 0; i <= count * upto; i += 1) {
    const point = uiSceneLerp(segment.from, segment.to, i / count);
    ctx.fillRect(point.x - BEAM_SIZE / 2, point.y - BEAM_SIZE / 2, BEAM_SIZE, BEAM_SIZE);
  }
}


function uiSceneBackdrop(ctx, geo, frame) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, geo.width, geo.height);
  ctx.fillStyle = PALETTE.grid;
  const drift = frame.reduced ? 0 : (frame.now / GRID_DRIFT_MS) % GRID_STEP;
  for (let left = 0; left < geo.width; left += GRID_STEP) ctx.fillRect(left, 0, 1, geo.height);
  for (let top = drift; top < geo.height; top += GRID_STEP) ctx.fillRect(0, top, geo.width, 1);
}
function uiSceneLog(ctx, geo, state) {
  if (geo.top !== LOG_BAND) return;
  uiSceneText(ctx, 'LOG', { x: 8, y: LOG_Y, align: 'left', color: PALETTE.dim });
  state.log.slice(-LOG_SHOWN).forEach(function (entry, index) {
    const mark = entry.mark === 'paired' ? '✓' : entry.mark === 'out' ? '✕' : '';
    const color = entry.mark === 'out' ? PALETTE.red : entry.mark === 'paired' ? PALETTE.paired : PALETTE.text;
    uiSceneText(ctx, entry.v + mark, { x: LOG_X + index * LOG_STEP, y: LOG_Y, color });
  });
}
function uiSceneQueue(ctx, geo, view) {
  const { arena, frame } = view;
  const state = arena.state;
  const ahead = state.stream.slice(state.next, state.next + LANES);
  const shift = frame.reduced ? 1 : Math.min(1, (frame.now - arena.fx.shiftAt) / TRAVEL_MS);
  const rush = state.next >= TURRET_W1.rushFrom;
  ctx.fillStyle = rush ? PALETTE.rush : PALETTE.lane;
  for (let j = 0; j < LANES; j += 1) {
    const lane = uiSceneLane(geo, j);
    ctx.fillRect(lane.x - CORNER, lane.y + CORNER, CORNER * 2, 1);
  }
  ahead.forEach(function (value, j) {
    const at = uiSceneLane(geo, j + (1 - uiSceneEase(shift)) * arena.fx.shifted);
    uiSceneDrone(ctx, at, { px: PX_LANE, color: PALETTE.magenta, v: value, font: FONT_SMALL });
  });
  return ahead.length;
}
function uiSceneRam(frame, fx) {
  const age = frame.now - fx.ramAt;
  if (frame.reduced || age < 0 || age >= RAM_MS) return 0;
  return 1 - age / RAM_MS;
}
function uiSceneDock(ctx, geo, dock) {
  const size = geo.dock + dock.bump * CORNER;
  const half = size / 2;
  ctx.fillStyle = dock.color;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function ([sx, sy]) {
    const cornerX = dock.at.x + sx * half;
    const cornerY = dock.at.y + sy * half;
    ctx.fillRect(Math.min(cornerX, cornerX - sx * CORNER), cornerY - CORNER_W / 2, CORNER, CORNER_W);
    ctx.fillRect(cornerX - CORNER_W / 2, Math.min(cornerY, cornerY - sy * CORNER), CORNER_W, CORNER);
  });
}
function uiSceneDocks(ctx, geo, view) {
  const { arena, frame } = view;
  const bump = arena.fx.ramKind === 'dock' ? uiSceneRam(frame, arena.fx) : 0;
  const count = geo.dual ? TURRET_W1.bayCap : 1;
  for (let index = 0; index < count; index += 1) {
    const drone = arena.state.bay[index];
    const hot = drone && geo.dual && index === arena.picked;
    const color = hot ? PALETTE.cyan : drone ? PALETTE.magenta : PALETTE.dockOff;
    uiSceneDock(ctx, geo, { at: uiSceneBay(geo, index), bump, color });
  }
}
function uiSceneFuseColor(left, frame) {
  if (left >= FUSE_HOT_MS) return PALETTE.amber;
  const blink = left < FUSE_PULSE_MS && !frame.reduced && Math.floor(frame.now / FUSE_BLINK_MS) % BLINK_PHASES === 1;
  return blink ? PALETTE.text : PALETTE.red;
}
function uiSceneFuse(ctx, geo, view) {
  const { drone, at, arena, frame } = view;
  const left = Math.max(0, arena.fuse[drone.n]);
  const color = uiSceneFuseColor(left, frame);
  const x0 = at.x - geo.dock / 2;
  const y0 = at.y + geo.dock / 2 + FUSE_GAP;
  ctx.fillStyle = PALETTE.fuseBack;
  ctx.fillRect(x0, y0, geo.dock, FUSE_BAR_H);
  ctx.fillStyle = color;
  ctx.fillRect(x0, y0, Math.round((geo.dock * left) / drone.fuseMs), FUSE_BAR_H);
  uiSceneText(ctx, String(Math.ceil(left / MS_PER_S)), { x: at.x + geo.dock / 2, y: at.y - geo.dock / 2 - FUSE_GAP * 2, align: 'right', color });
  return { n: drone.n, left };
}
function uiSceneDragged(arena, index) {
  return Boolean(arena.drag && arena.drag.on && arena.drag.bay === index);
}
function uiSceneFloating(view) {
  const { arena, index, now } = view;
  return arena.fx.pops.some((pop) => pop.bayIndex === index && now - pop.at < POP_MS);
}
function uiScenePicked(ctx, geo, view) {
  const { arena, index, dock, now } = view;
  if (!geo.dual || index !== arena.picked || uiSceneFloating({ arena, index, now })) return;
  uiSceneText(ctx, 'PICKED', { x: dock.x, y: dock.y - geo.dock / 2 - FUSE_GAP * 2, color: PALETTE.cyan });
}
function uiSceneDockedDrone(ctx, at, view) {
  const { arena, drone, index, landed } = view;
  ctx.globalAlpha = uiSceneDragged(arena, index) ? DRAG_DIM_ALPHA : 1;
  uiSceneDrone(ctx, at, { px: landed ? PX_BAY : PX_LANE + 1, color: PALETTE.magenta, v: drone.v, font: FONT_BAY });
  ctx.globalAlpha = 1;
}
function uiSceneBayDrone(ctx, geo, view) {
  const { arena, drone, index, frame } = view;
  const travel = arena.travel[drone.n] ?? 1;
  const dock = uiSceneBay(geo, index);
  const at = uiSceneLerp(uiSceneLane(geo, 0), dock, uiSceneEase(travel));
  const landed = travel >= 1;
  uiSceneDockedDrone(ctx, at, { arena, drone, index, landed });
  const burning = drone.fuseMs !== null && !arena.state.assist && landed;
  const fuse = burning ? uiSceneFuse(ctx, geo, { drone, at: dock, arena, frame }) : null;
  if (landed) uiScenePicked(ctx, geo, { arena, index, dock, now: frame.now });
  return { drone: { n: drone.n, v: drone.v, x: at.x, y: at.y, travel }, fuse };
}
function uiSceneAim(geo, arena) {
  if (arena.drag && arena.drag.on) return { x: arena.drag.x, y: arena.drag.y };
  return uiSceneBay(geo, arena.picked);
}
function uiSceneTurret(ctx, geo, arena) {
  const pivot = uiScenePivot(geo);
  const aim = uiSceneAim(geo, arena);
  const angle = Math.atan2(aim.y - pivot.y, aim.x - pivot.x);
  ctx.fillStyle = PALETTE.cyan;
  for (let i = 1; i <= BARREL_DOTS; i += 1) {
    ctx.fillRect(pivot.x + Math.cos(angle) * i * BARREL_STEP - BARREL_SIZE / 2, pivot.y + Math.sin(angle) * i * BARREL_STEP - BARREL_SIZE / 2, BARREL_SIZE, BARREL_SIZE);
  }
  ctx.fillStyle = PALETTE.dim;
  ctx.fillRect(pivot.x - TURRET_BASE.w / 2, pivot.y, TURRET_BASE.w, TURRET_BASE.h);
  return { x: pivot.x + Math.cos(angle) * BARREL_DOTS * BARREL_STEP, y: pivot.y + Math.sin(angle) * BARREL_DOTS * BARREL_STEP };
}
function uiSceneBeam(ctx, geo, view) {
  const { beam, tip, frame } = view;
  const age = beam ? frame.now - beam.at : Infinity;
  if (age < 0 || age >= BEAM_MS + BEAM_FADE_MS) return false;
  const progress = frame.reduced ? 1 : Math.min(1, age / BEAM_MS);
  const bay = uiSceneBay(geo, beam.bayIndex);
  ctx.globalAlpha = age > BEAM_MS ? 1 - (age - BEAM_MS) / BEAM_FADE_MS : 1;
  ctx.fillStyle = PALETTE.cyan;
  uiSceneDots(ctx, { from: tip, to: bay }, Math.min(1, progress * 2));
  uiSceneDots(ctx, { from: bay, to: uiSceneSlotPoint(geo, beam.slot) }, Math.max(0, progress * 2 - 1));
  ctx.globalAlpha = 1;
  return true;
}
function uiSceneBurst(ctx, at, age) {
  const reach = BURST_REACH * (age / POP_MS);
  BURST_DIRS.forEach(function ([dx, dy]) {
    ctx.fillRect(at.x + dx * reach - BURST_SIZE / 2, at.y + dy * reach - BURST_SIZE / 2, BURST_SIZE, BURST_SIZE);
  });
}
function uiScenePopY(geo, view) {
  const { at, age, reduced } = view;
  const rise = reduced ? 0 : POP_RISE * (age / POP_MS);
  return Math.max(geo.top + POP_TOP, at.y - geo.dock / 2 - rise);
}
function uiScenePops(ctx, geo, view) {
  const { arena, frame } = view;
  arena.fx.pops = arena.fx.pops.filter((pop) => frame.now - pop.at < POP_MS);
  arena.fx.pops.forEach(function (pop) {
    const age = Math.max(0, frame.now - pop.at);
    const at = uiSceneBay(geo, pop.bayIndex);
    ctx.globalAlpha = 1 - age / POP_MS;
    ctx.fillStyle = PALETTE.amber;
    if (!frame.reduced) uiSceneBurst(ctx, at, age);
    uiSceneText(ctx, pop.text, { x: at.x, y: uiScenePopY(geo, { at, age, reduced: frame.reduced }), color: PALETTE.amber });
    ctx.globalAlpha = 1;
  });
}
function uiSceneFlash(ctx, geo, view) {
  const { arena, frame } = view;
  const strength = uiSceneRam(frame, arena.fx);
  if (strength <= 0) return false;
  const hit = arena.fx.ramKind === 'hit';
  ctx.globalAlpha = strength * (hit ? HIT_ALPHA : DOCK_ALPHA);
  ctx.fillStyle = hit ? PALETTE.red : PALETTE.flash;
  ctx.fillRect(0, 0, geo.width, geo.height);
  ctx.globalAlpha = 1;
  return true;
}
function uiSceneShake(frame, fx) {
  const strength = uiSceneRam(frame, fx);
  if (strength <= 0) return { x: 0, y: 0 };
  const amp = SHAKE[fx.ramKind] * strength;
  return { x: Math.round(Math.sin(frame.now * SHAKE_RATE) * amp), y: Math.round(Math.cos(frame.now * SHAKE_RATE * 2) * amp) };
}

function uiPaintTurretScene(canvas, arena, frame) {
  const size = uiSceneSize(canvas);
  const surface = uiSceneContext(canvas, size);
  if (!surface) return null;
  const { ctx, ratio } = surface;
  const geo = uiSceneGeo(size, arena.state);
  const shake = uiSceneShake(frame, arena.fx);
  ctx.setTransform(ratio, 0, 0, ratio, shake.x * ratio, shake.y * ratio);
  uiSceneBackdrop(ctx, geo, frame);
  uiSceneLog(ctx, geo, arena.state);
  const view = { arena, frame };
  const queue = uiSceneQueue(ctx, geo, view);
  uiSceneDocks(ctx, geo, view);
  const bay = arena.state.bay.map((drone, index) => uiSceneBayDrone(ctx, geo, { arena, drone, index, frame }));
  const tip = uiSceneTurret(ctx, geo, arena);
  const beam = uiSceneBeam(ctx, geo, { beam: arena.fx.beam, tip, frame });
  uiScenePops(ctx, geo, view);
  const flash = uiSceneFlash(ctx, geo, view);
  return { drones: bay.map((item) => item.drone), fuses: bay.map((item) => item.fuse).filter(Boolean), queue, beam, flash, shake };
}


const RACE_CELLS = ['drone', 'score', 'combo'];
const COMBO_SHOWN_FROM = 2;

function uiSceneRaceText(arena) {
  const state = arena.state;
  const total = state.stream.length;
  return {
    drone: 'CLEARED ' + state.resolved + '/' + total,
    score: 'SCORE ' + state.score,
    combo: state.combo >= COMBO_SHOWN_FROM ? 'COMBO x' + state.combo : '',
  };
}
function uiSceneSet(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}
function uiTurretFuseHot(arena) {
  if (arena.state.assist) return false;
  return arena.state.bay.some((drone) => drone.fuseMs !== null && (arena.travel[drone.n] ?? 1) >= 1 && arena.fuse[drone.n] < FUSE_PULSE_MS);
}
function uiTurretFieldClass(arena) {
  const dragging = Boolean(arena.drag && arena.drag.on);
  return 'turret-field' + (dragging ? ' is-dragging' : '') + (uiTurretFuseHot(arena) ? ' is-fuse-hot' : '');
}
function uiTurretScene(app) {
  const arena = app.rig.arena;
  const race = uiSceneRaceText(arena);
  const cells = RACE_CELLS.map((name) => uiEl('span', { className: 'turret-' + name, text: race[name] }));
  const strip = uiEl('p', { className: 'turret-race', children: cells });
  const canvas = uiEl('canvas', { className: 'turret-canvas', attrs: { 'aria-hidden': 'true' } });
  const ghost = uiEl('span', { className: 'turret-ghost', attrs: { 'aria-hidden': 'true' } });
  return uiEl('div', { className: uiTurretFieldClass(arena), attrs: { 'data-turret-drag': 'field' }, children: [canvas, strip, uiTurretBayBand(app), ghost] });
}
function uiTurretSceneNodes(arena, root) {
  const find = (selector) => (root && root.querySelector ? root.querySelector(selector) : null);
  arena.nodes = {
    canvas: find('.turret-canvas'), drone: find('.turret-drone'), score: find('.turret-score'), combo: find('.turret-combo'),
    board: find('.turret-board'), field: find('.turret-field'), ghost: find('.turret-ghost'),
  };
}
function uiSceneClass(node, className) {
  if (node && node.className !== className) node.className = className;
}
function uiTurretPaint(app, now) {
  const arena = app.rig && app.rig.arena;
  if (!arena || !arena.nodes) return;
  const nodes = arena.nodes;
  if (nodes.canvas) arena.lastPaint = uiPaintTurretScene(nodes.canvas, arena, { now, reduced: arena.reduced });
  const race = uiSceneRaceText(arena);
  RACE_CELLS.forEach((name) => uiSceneSet(nodes[name], race[name]));
  uiSceneClass(nodes.board, uiTurretBoardClass(arena, uiTurretNoping(arena, now)));
  uiSceneClass(nodes.field, uiTurretFieldClass(arena));
}

export { uiTurretScene, uiPaintTurretScene, uiTurretSceneNodes, uiTurretPaint, uiTurretFieldClass, uiTurretFuseHot };
