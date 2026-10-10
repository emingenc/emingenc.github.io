import { rigStars } from '../game/rig-catalog.js';
import { UI_RIG_PIPS } from './grid-sprites.js';
import { UI_SAFEHOUSE_ACCENT, uiIsGround, uiLabelWidth, uiPulse, uiRigAccent, uiWallAt } from './grid-draw-common.js';

const UI_NO_SAVE = Object.freeze({ labs:{} });
const UI_ACROSS = { col:-2,row:2 };

function uiRigPlan(world,spot) {
const base = [{ sprite:'wall-top',accent:UI_SAFEHOUSE_ACCENT }];
const thing = world.things[spot.entry.id];
return { kind:'rig',id:spot.entry.id,accent:uiRigAccent(thing.rig,thing.family),base,layers:base };
}
function uiWallRun(world,from,run) {
return Array.from({ length:run },function (_,step) { return { col:from.col + step,row:from.row }; }).every(function (cell) { return uiWallAt(world,cell); });
}
function uiRigPlateAt(world,rig) {
const width = uiLabelWidth(rig.name);
const run = Math.ceil(width);
if (uiWallRun(world,{ col:rig.col - run,row:rig.row },run)) return { col:rig.col - width,row:rig.row };
if (uiWallRun(world,{ col:rig.col + 1,row:rig.row },run)) return { col:rig.col + 1,row:rig.row };
const under = { col:rig.col,row:rig.row + 1 };
if (uiWallAt(world,under)) return under;
const across = { col:rig.col + UI_ACROSS.col,row:rig.row + UI_ACROSS.row };
if (uiWallRun(world,across,run)) return across;
return uiWallRun(world,{ col:rig.col - run,row:rig.row - 1 },run) ? { col:rig.col - width,row:rig.row - 1 } :null;
}
function uiRigPlates(world) {
return Object.values(world.rigs).flatMap(function (rig) {
const cell = uiRigPlateAt(world,rig);
return cell ? [{ text:rig.name,col:cell.col,row:cell.row,accent:uiRigAccent(rig.rig,rig.family),rig:rig.rig }] :[];
});
}
function uiRigState(look) {
if (!look.met && look.cleared === 0) return { sprite:'rig-idle',pips:0,pulse:true };
const done = look.total > 0 && look.cleared >= look.total;
return { sprite:done ? 'rig-done' :'rig-lit',pips:Math.min(look.cleared,UI_RIG_PIPS),pulse:false };
}
function uiRigCleared(save,rigId) {
const stats = rigStars(save && save.labs ? save :UI_NO_SAVE,rigId);
return stats ? { cleared:stats.cleared,total:stats.levels } :{ cleared:0,total:0 };
}
function uiRigStateAt(frame,rig) {
return uiRigState({ met:frame.progress.met !== undefined && frame.progress.met.has(rig),...uiRigCleared(frame.save,rig) });
}
function uiRigLayers(frame,spot) {
const state = uiRigStateAt(frame,frame.world.things[spot.id].rig);
const layers = [...spot.base,{ sprite:state.sprite,accent:spot.accent }];
for (let pip = 1; pip <= state.pips; pip += 1) layers.push({ sprite:'rig-pip-' + pip,accent:spot.accent });
if (!state.pulse) return layers;
return [...layers,{ sprite:'rig-glow',accent:spot.accent,alpha:uiPulse(frame) },{ sprite:'rig-halo',accent:spot.accent,alpha:uiPulse(frame) }];
}
function uiRigMast(frame,rig) {
const above = { col:rig.col,row:rig.row - 1 };
if (uiIsGround(frame.world,above)) return [];
const state = uiRigStateAt(frame,rig.rig);
const accent = uiRigAccent(rig.rig,rig.family);
const mast = { sprite:state.sprite === 'rig-done' ? 'rig-mast-done' :'rig-mast',accent,alpha:1,...above };
return state.pulse ? [mast,{ sprite:'rig-beacon',accent,alpha:uiPulse(frame),...above }] :[mast];
}
function uiRigOverlays(frame) {
return Object.values(frame.world.rigs).flatMap(function (rig) { return uiRigMast(frame,rig); });
}

export { uiRigPlan, uiRigPlates, uiRigState, uiRigCleared, uiRigLayers, uiRigOverlays };
