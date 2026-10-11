import { actorIntent,intentLabel } from '../game/actors.js';
import { FIND,SIGN,holdsReceipt,isForkActor } from '../game/cast/fork.js';
import { TALLY_CELL,tallyPlan } from '../game/cast/tally.js';
import { pulseAt } from '../game/wayfinding.js';
import { uiDrawBurst,uiDroneClock,uiNoteHit } from './grid-drone-fx.js';

const HALF = 0.5;
const PLATE_TILES = 0.62;
const WING_TILES = 0.12;
const BOB_TILES = 0.04;
const BOB_MS = 300;
const NUMBER_TILES = 0.55;
const TAG_TILES = 0.6;
const TAG_GAP_TILES = 0.3;
const TAG_OUTLINE_PX = 3;
const FONT = 'px VT323, monospace';
const TEXT_MODE = 'optimizeSpeed';
const LANE_ALPHA = 0.12;
const NEXT_ALPHA_LOW = 0.18;
const NEXT_ALPHA_SWING = 0.22;
const ALERT_BEAT = 1;
const SIGN_TEXT_TILES = 0.46;
const MARK_TILES = 0.42;
const MARKS = { offer:'!',thanks:'!',waiting:'...',done:'OK' };
const TALLY_ART = ['..xxxx..','.xxxxxx.','.xexxex.','.xxxxxx.','..xxxx..','.xxxxxx.','xx.xx.xx'];
const TALLY_TILES = 0.78;
const PAPER_TILES = 0.46;
const PLAQUE = { inset:0.1,span:0.8,lineWidth:2,upper:0.36,lower:0.68 };
const MARK_AT = { across:0.8,down:0.06 };
const PAPER_SHAPE = { tall:1.2,ruleSteps:4,ruleInset:0.15,ruleSpan:0.7,ruleThick:0.06 };

function uiSpotOf(cell,frame) {
return { left:(cell.col - frame.camera.col) * frame.tile,top:(cell.row - frame.camera.row) * frame.tile };
}
function uiInView(spot,frame) {
return spot.left + frame.tile > 0 && spot.top + frame.tile > 0 && spot.left < frame.width && spot.top < frame.height;
}
function uiBob(frame) {
return frame.reducedMotion ? 0 :Math.sin(frame.now / BOB_MS) * BOB_TILES * frame.tile;
}
function uiText(ctx,frame,spot) {
ctx.font = Math.round(frame.tile * spot.tiles) + FONT;
ctx.textRendering = TEXT_MODE;
ctx.textAlign = 'center';
ctx.textBaseline = spot.baseline || 'middle';
if (spot.outline) {
ctx.lineWidth = TAG_OUTLINE_PX;
ctx.strokeStyle = frame.palette.bg;
ctx.strokeText(spot.text,spot.x,spot.y);
}
ctx.fillStyle = spot.colour;
ctx.fillText(spot.text,spot.x,spot.y);
}
function uiDroneColour(frame,drone) {
if (!drone.awake) return frame.palette.dim;
return drone.beat <= ALERT_BEAT ? frame.palette.red :frame.palette.cyan;
}
function uiDrawPlate(ctx,frame,spot) {
const tile = frame.tile;
const size = tile * PLATE_TILES;
const wing = tile * WING_TILES;
const top = spot.top + (tile - size) * HALF + uiBob(frame);
ctx.fillStyle = spot.colour;
ctx.fillRect(spot.left + (tile - size) * HALF,top,size,size);
ctx.fillRect(spot.left + (tile - size) * HALF - wing,top + size * HALF * HALF,wing,size * HALF);
ctx.fillRect(spot.left + (tile + size) * HALF,top + size * HALF * HALF,wing,size * HALF);
uiText(ctx,frame,{ text:String(spot.num),tiles:NUMBER_TILES,x:spot.left + tile * HALF,y:top + size * HALF,colour:frame.palette.bg });
}
function uiDrawTag(ctx,frame,spot) {
const intent = actorIntent(spot.drone);
if (!spot.drone.awake || !intent) return;
const gap = frame.tile * TAG_GAP_TILES;
const above = spot.top >= frame.tile * TAG_TILES + gap;
uiText(ctx,frame,{
text:intentLabel(intent),tiles:TAG_TILES,x:spot.left + frame.tile * HALF,y:above ? spot.top - gap :spot.top + frame.tile + gap,
baseline:above ? 'bottom' :'top',colour:frame.palette.amber,outline:true,
});
}
function uiDrawLane(ctx,frame,drone) {
ctx.globalAlpha = LANE_ALPHA;
ctx.fillStyle = frame.palette.dim;
drone.lane.forEach(function (cell) {
const spot = uiSpotOf(cell,frame);
if (uiInView(spot,frame)) ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
});
ctx.globalAlpha = 1;
}
function uiDrawNext(ctx,frame,drone) {
const ahead = drone.at + drone.dir;
const cell = drone.lane[ahead >= 0 && ahead < drone.lane.length ? ahead :drone.at - drone.dir];
const spot = uiSpotOf(cell,frame);
if (!uiInView(spot,frame)) return;
ctx.globalAlpha = NEXT_ALPHA_LOW + NEXT_ALPHA_SWING * pulseAt(frame.now,frame.reducedMotion);
ctx.fillStyle = frame.palette.red;
ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
ctx.globalAlpha = 1;
}
function uiDrawDrone(ctx,frame,drone) {
if (drone.awake) {
uiDrawLane(ctx,frame,drone);
uiDrawNext(ctx,frame,drone);
}
const spot = uiSpotOf(drone,frame);
if (!uiInView(spot,frame)) return;
uiDrawPlate(ctx,frame,{ ...spot,num:drone.num,colour:uiDroneColour(frame,drone) });
uiDrawTag(ctx,frame,{ ...spot,drone });
}
function uiDrawDrones(ctx,app,frame) {
const fight = app.game.fight;
if (!fight) return;
const notes = uiNoteHit(fight,frame.now);
fight.actors.filter(isForkActor).forEach(function (drone) {
const clock = uiDroneClock(notes,drone,frame.now);
if (drone.hp > 0) uiDrawDrone(ctx,frame,drone);
else uiDrawBurst(ctx,frame,{ actor:drone,age:frame.now - clock.died });
});
}
function uiDrawSign(ctx,frame) {
const spot = uiSpotOf(SIGN,frame);
if (!uiInView(spot,frame)) return;
const tile = frame.tile;
const box = { left:spot.left + tile * PLAQUE.inset,top:spot.top + tile * PLAQUE.inset,size:tile * PLAQUE.span };
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(box.left,box.top,box.size,box.size);
ctx.lineWidth = PLAQUE.lineWidth;
ctx.strokeStyle = frame.palette.amber;
ctx.strokeRect(box.left,box.top,box.size,box.size);
const centre = spot.left + tile * HALF;
uiText(ctx,frame,{ text:'SUM',tiles:SIGN_TEXT_TILES,x:centre,y:spot.top + tile * PLAQUE.upper,colour:frame.palette.amber });
uiText(ctx,frame,{ text:'12',tiles:SIGN_TEXT_TILES,x:centre,y:spot.top + tile * PLAQUE.lower,colour:frame.palette.bright });
}
function uiMarkOf(game) {
const state = game.fork || {};
if (state.markFor !== game.ext) Object.assign(state,{ markFor:game.ext,mark:MARKS[tallyPlan(game.ext).kind] });
return state.mark;
}
function uiDrawTally(ctx,app,frame) {
const spot = uiSpotOf(TALLY_CELL,frame);
if (!uiInView(spot,frame)) return;
const tile = frame.tile;
ctx.fillStyle = frame.palette.panel;
ctx.fillRect(spot.left,spot.top,tile,tile);
const pixel = (tile * TALLY_TILES) / TALLY_ART[0].length;
const left = spot.left + (tile - pixel * TALLY_ART[0].length) * HALF;
const top = spot.top + (tile - pixel * TALLY_ART.length) * HALF;
TALLY_ART.forEach(function (line,row) {
[...line].forEach(function (glyph,col) {
if (glyph === '.') return;
ctx.fillStyle = glyph === 'e' ? frame.palette.bg :frame.palette.amber;
ctx.fillRect(left + col * pixel,top + row * pixel,pixel,pixel);
});
});
uiText(ctx,frame,{
text:uiMarkOf(app.game),tiles:MARK_TILES,x:spot.left + tile * MARK_AT.across,y:spot.top + tile * MARK_AT.down,
baseline:'top',colour:frame.palette.bright,outline:true,
});
}
function uiDrawReceipt(ctx,app,frame) {
const spot = uiSpotOf(FIND,frame);
if (!uiInView(spot,frame) || holdsReceipt(app.game.ext)) return;
const tile = frame.tile;
const size = tile * PAPER_TILES;
const left = spot.left + (tile - size) * HALF;
const top = spot.top + (tile - size) * HALF + uiBob(frame);
ctx.fillStyle = frame.palette.text;
ctx.fillRect(left,top,size,size * PAPER_SHAPE.tall);
ctx.fillStyle = frame.palette.bg;
Array.from({ length:PAPER_SHAPE.ruleSteps - 1 },(unused,index) => index + 1).forEach(function (at) {
ctx.fillRect(left + size * PAPER_SHAPE.ruleInset,top + size * (at / PAPER_SHAPE.ruleSteps) * PAPER_SHAPE.tall,size * PAPER_SHAPE.ruleSpan,Math.max(1,size * PAPER_SHAPE.ruleThick));
});
}
function uiDrawFork(ctx,app,frame) {
uiDrawSign(ctx,frame);
uiDrawTally(ctx,app,frame);
uiDrawReceipt(ctx,app,frame);
uiDrawDrones(ctx,app,frame);
}

export { uiDrawFork };
