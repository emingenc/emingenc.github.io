import { CRATE,debrisPiece,debrisSource } from '../game/foe-motion.js';
import { uiArtCanvas } from './art-hook.js';

const PLANK_SHARE = 0.8;
const PLANK_INKS = ['amber','dim'];
const HALF = 0.5;

function uiCrateArt(frame) {
return uiArtCanvas('crate',{ accent:'amber',devicePx:Math.round(frame.tile * frame.dpr),palette:frame.palette });
}
function uiDrawPiece(ctx,frame,piece) {
const wide = frame.tile / CRATE.cols;
const high = frame.tile / CRATE.rows;
if (piece.art) {
const source = debrisSource(piece.index);
const art = piece.art;
ctx.drawImage(art,source.x * art.width,source.y * art.height,source.w * art.width,source.h * art.height,-wide * HALF,-high * HALF,wide,high);
return;
}
ctx.fillStyle = frame.palette[PLANK_INKS[piece.index % PLANK_INKS.length]];
ctx.fillRect(-wide * HALF * PLANK_SHARE,-high * HALF * PLANK_SHARE,wide * PLANK_SHARE,high * PLANK_SHARE);
}
function uiDrawDebris(ctx,frame,spot) {
const art = uiCrateArt(frame);
const centre = { x:(spot.actor.col - frame.camera.col + HALF) * frame.tile,y:(spot.actor.row - frame.camera.row + HALF) * frame.tile };
for (let index = 0;index < CRATE.pieces;index += 1) {
const flight = debrisPiece(index,{ progress:spot.look.debris,away:spot.look.away });
ctx.save();
ctx.globalAlpha = flight.alpha;
ctx.translate(centre.x + flight.x * frame.tile,centre.y + flight.y * frame.tile);
ctx.rotate(flight.turn);
uiDrawPiece(ctx,frame,{ index,art });
ctx.restore();
}
}

export { uiDrawDebris };
