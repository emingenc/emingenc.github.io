import { questState } from '../game/ext/ops.js';
import { STAGE } from '../game/quest/quests.js';
import { BIN_SIZE,BINS,QUEST_ID,TEXT,binCount,binOf,dropInto,handTag,newState,solidsOf } from '../game/walk/anagram.js';
import { uiHooksOnce,uiPowerOf,uiPowerSay } from './grid-power.js';
import { uiPropGuard,uiQuestLive,uiQuestPaint,uiQuestSay } from './grid-quest-kit.js';
import { uiRect } from './grid-quest-marks.js';
import { uiSpotOf } from './grid-spot.js';
import { uiQuestEvent } from './quest-run.js';

const FONT = 'px VT323, monospace';
const TEXT_MODE = 'optimizeSpeed';
const HALF = 0.5;
const BIN_INSET = 0.06;
const BIN_EDGE = 2;
const KEY_SIZE = 0.32;
const KEY_ROWS = Object.freeze([{ down:0.2 },{ down:0.47 },{ down:0.74 }]);
const KEY_AT = 0.42;
const PIP = Object.freeze({ at:0.72,size:0.14,first:0.3,gap:0.22 });
const TAG = Object.freeze({ inset:0.05,rise:0.34,height:0.3,size:0.3 });

function uiBoardOf(game) {
if (questState(game.ext,QUEST_ID) !== STAGE.active) return null;
const power = uiPowerOf(game);
if (!power.anagram) power.anagram = newState();
return power.anagram;
}
function uiSolids(app) {
return uiBoardOf(app.game) ? solidsOf() :[];
}
function uiText(ctx,box) {
ctx.font = Math.round(box.size) + FONT;
ctx.textRendering = TEXT_MODE;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = box.colour;
ctx.fillText(box.text,box.left,box.top);
}
function uiPaintBin(ctx,frame,spot) {
const tile = frame.tile;
const inset = tile * BIN_INSET;
const size = tile - inset * 2;
const colour = spot.count >= BIN_SIZE ? frame.palette.dim :frame.palette.cyan;
uiRect(ctx,{ left:spot.left + inset,top:spot.top + inset,width:size,height:size,colour });
uiRect(ctx,{ left:spot.left + inset + BIN_EDGE,top:spot.top + inset + BIN_EDGE,width:size - BIN_EDGE * 2,height:size - BIN_EDGE * 2,colour:frame.palette.bg });
spot.bin.key.match(/[a-z]\d+/g).forEach((pair,row) => {
uiText(ctx,{ left:spot.left + tile * KEY_AT,top:spot.top + tile * KEY_ROWS[row].down,size:tile * KEY_SIZE,colour,text:pair });
});
for (let pip = 0; pip < BIN_SIZE; pip += 1) {
const size = tile * PIP.size;
const box = { left:spot.left + tile * PIP.at,top:spot.top + tile * (PIP.first + PIP.gap * pip),width:size,height:size };
uiRect(ctx,{ ...box,colour:pip < spot.count ? frame.palette.amber :colour });
if (pip >= spot.count) uiRect(ctx,{ left:box.left + BIN_EDGE,top:box.top + BIN_EDGE,width:size - BIN_EDGE * 2,height:size - BIN_EDGE * 2,colour:frame.palette.bg });
}
}
function uiPaintCarried(ctx,app,frame) {
const board = uiBoardOf(app.game);
const tag = board && handTag(board);
const spot = tag && uiSpotOf(app.game.avatar.pos,frame);
if (!spot) return;
const tile = frame.tile;
const left = spot.left + tile * TAG.inset;
const top = spot.top - tile * TAG.rise;
uiRect(ctx,{ left,top,width:tile * (1 - TAG.inset * 2),height:tile * TAG.height,colour:frame.palette.amber });
uiText(ctx,{ left:spot.left + tile * HALF,top:top + tile * TAG.height * HALF,size:tile * TAG.size,colour:frame.palette.bg,text:tag });
}
function uiPaintBoard(ctx,app,frame) {
const board = uiBoardOf(app.game);
if (!board) return;
BINS.forEach((bin) => {
const spot = uiSpotOf(bin,frame);
if (spot) uiPaintBin(ctx,frame,{ ...spot,bin,count:binCount(board,bin.id) });
});
uiPaintCarried(ctx,app,frame);
}
function uiSay(app,text) {
uiPowerSay(app,{ text });
}
async function uiBinFull(app) {
const result = await uiQuestEvent(app,QUEST_ID,{ kind:'progress' });
if (result.done) await uiQuestSay(app,{ text:TEXT.done,kind:'reward' });
}
async function uiDrop(app,board,bin) {
const drop = dropInto(board,bin.id);
uiPowerOf(app.game).anagram = drop.state;
if (drop.kind === 'full') {
uiSay(app,TEXT.full);
return;
}
if (drop.kind === 'wrong') {
uiSay(app,TEXT.wrong);
await uiQuestEvent(app,QUEST_ID,{ kind:'slip' });
return;
}
uiSay(app,TEXT.binCount(bin.key,drop.count));
if (drop.count >= BIN_SIZE) await uiBinFull(app);
}
async function uiBinBump(app,board,bin) {
if (board.hand.length) await uiDrop(app,board,bin);
else uiSay(app,TEXT.binCode(bin.key));
}
function uiOnBump(info) {
const app = info.app;
const prop = info.event && info.event.prop;
if (!prop || !uiQuestLive(app)) return;
const board = uiBoardOf(app.game);
if (!board) return;
if (binOf(prop)) uiBinBump(app,board,binOf(prop)).catch(console.error);
}
const uiHook = uiHooksOnce({ bump:uiOnBump });
function uiInstallAnagram(app) {
uiPropGuard(app,uiSolids);
uiQuestPaint(app,uiPaintBoard);
uiHook();
}

export { uiInstallAnagram };
