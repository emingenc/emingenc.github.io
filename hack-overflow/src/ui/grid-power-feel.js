import { pressLook,trackSeen,trackValue } from '../game/power-feel.js';
import { uiGridBurst } from './grid-draw-fx.js';
import { uiPrefersReducedMotion } from './dom.js';

const BURST_COUNT = { spark:6,fizz:5,pop:1 };
const CELL_CENTRE = 0.5;
const FLASH_ALPHA = 0.7;
const IDLE = { flash:0,shake:0 };

const uiPulses = new Map();
let uiBurstSeed = 0;

function uiPressPulse(key,press) {
uiPulses.set(key,{ at:performance.now(),wrong:press.wrong });
}
function uiPulseLook(key,frame) {
const pulse = uiPulses.get(key);
if (!pulse) return IDLE;
const look = pressLook(frame.now - pulse.at,pulse.wrong && !frame.reducedMotion);
return look.flash > 0 || look.shake !== 0 ? look :IDLE;
}
function uiPressBurst(cell,kind) {
if (uiPrefersReducedMotion()) return;
uiBurstSeed += 1;
uiGridBurst({
kind,count:BURST_COUNT[kind],seed:uiBurstSeed,atMs:performance.now(),
origin:{ col:cell.col + CELL_CENTRE,row:cell.row + CELL_CENTRE },
});
}
function uiGlideIndex(track,key,pointer) {
trackSeen(track,key,{ value:pointer.index,now:pointer.frame.now });
return pointer.frame.reducedMotion ? pointer.index :trackValue(track,key,pointer.frame.now);
}
function uiFlashBox(ctx,box) {
if (box.flash <= 0) return;
ctx.globalAlpha = box.flash * FLASH_ALPHA;
ctx.fillStyle = box.ink;
ctx.fillRect(box.left,box.top,box.side,box.side);
ctx.globalAlpha = 1;
}

export { uiPressPulse,uiPulseLook,uiPressBurst,uiGlideIndex,uiFlashBox };
