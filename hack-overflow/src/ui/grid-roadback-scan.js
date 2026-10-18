import { ringCells } from '../game/finale/siege.js';
import {
  SCAN_TOASTS,createScan,scanDone,scanFlooded,scanFraction,scanResolve,scanTick,
} from '../game/finale/roadback-scan.js';
import { uiRenderKeepingFocus } from './app.js';
import { uiSay } from './grid-kernel-common.js';
import { uiSpotOf } from './grid-spot.js';

const TICK_MS = 60;
const CHIP_KEY = 'kernel-chip-patch-0';
const ENTER_KEYS = ['Enter',' ','Spacebar'];
const FRONT_FILL = 'rgba(180,30,60,0.55)';
const CAPTURE = true;

function uiOnChip(event) {
const node = event.target;
if (!node) return false;
const chip = node.closest ? node.closest('[data-focus-key="' + CHIP_KEY + '"]') :node;
return Boolean(chip && chip.getAttribute && chip.getAttribute('data-focus-key') === CHIP_KEY);
}
function uiHoldLive(app,hold) {
return app.game === hold.game && app.game.gen === hold.gen;
}
function uiHoldShow(app,hold) {
hold.port.show(hold.scan,hold.run);
uiRenderKeepingFocus(app);
}
function uiHoldClose(hold) {
window.clearTimeout(hold.timer);
hold.timer = 0;
hold.holding = false;
hold.off.forEach((off) => off());
hold.off = [];
}
function uiHoldFinish(hold) {
uiHoldClose(hold);
hold.port.show(hold.scan,hold.run);
hold.resolve(scanResolve(hold.port.lookup));
}
function uiHoldDt(hold) {
const now = performance.now();
const dt = now - hold.last;
hold.last = now;
return dt;
}
function uiHoldBeat(app,hold) {
hold.timer = 0;
if (!uiHoldLive(app,hold)) return uiHoldClose(hold);
hold.scan = scanTick(hold.scan,uiHoldDt(hold),hold.holding && !hold.port.parked());
if (scanDone(hold.scan)) return uiHoldFinish(hold);
uiHoldShow(app,hold);
if (hold.holding || hold.scan.progress > 0) hold.timer = window.setTimeout(() => uiHoldBeat(app,hold),TICK_MS);
}
function uiHoldPress(app,hold) {
if (hold.port.parked()) return;
hold.holding = true;
if (!hold.told) { hold.told = true; uiSay(app,SCAN_TOASTS.start,'info'); }
if (hold.timer) return;
hold.last = performance.now();
hold.timer = window.setTimeout(() => uiHoldBeat(app,hold),TICK_MS);
}
function uiHoldRelease(hold) {
hold.holding = false;
}
function uiHoldAtOnce(app,hold) {
if (hold.port.parked() || !uiHoldLive(app,hold)) return;
hold.scan = { ...hold.scan,progress:hold.scan.total };
uiHoldFinish(hold);
}
function uiHoldKeys(app,hold) {
return function (event) {
if (!uiOnChip(event) || !ENTER_KEYS.includes(event.key)) return;
if (event.preventDefault) event.preventDefault();
if (event.stopPropagation) event.stopPropagation();
uiHoldAtOnce(app,hold);
};
}
function uiHoldPointer(app,hold) {
return {
pointerdown:(event) => { if (uiOnChip(event) && !hold.scan.tagged) { hold.pointerClick = false; uiHoldPress(app,hold); } },
pointerup:() => uiHoldRelease(hold),
pointercancel:() => uiHoldRelease(hold),
click:(event) => { if (uiOnChip(event) && event.detail > 0 && !hold.scan.tagged) hold.pointerClick = true; },
keydown:uiHoldKeys(app,hold),
};
}
function uiHoldListen(app,hold) {
const handlers = uiHoldPointer(app,hold);
Object.entries(handlers).forEach(function ([type,run]) {
document.addEventListener(type,run,CAPTURE);
hold.off.push(() => document.removeEventListener(type,run,CAPTURE));
});
const blur = () => uiHoldRelease(hold);
window.addEventListener('blur',blur);
hold.off.push(() => window.removeEventListener('blur',blur));
}
function uiHoldRun(app,hold) {
return function () {
if (hold.pointerClick) { hold.pointerClick = false; return; }
uiHoldAtOnce(app,hold);
};
}
function uiScanHold(app,port) {
return new Promise(function (resolve) {
const hold = {
game:app.game,gen:app.game.gen,port,resolve,scan:createScan(port.lookup),holding:false,told:false,pointerClick:false,timer:0,last:0,off:[],
};
hold.run = uiHoldRun(app,hold);
uiHoldListen(app,hold);
uiHoldShow(app,hold);
});
}
function uiScanPainter(app,shown) {
let ring = null;
return function (ctx,frame) {
if (!shown.scan) return;
ring = ring || ringCells(app.game.world);
ctx.fillStyle = FRONT_FILL;
scanFlooded(ring,app.game.avatar.pos,scanFraction(shown.scan)).forEach(function (cell) {
const spot = uiSpotOf(cell,frame);
if (spot) ctx.fillRect(spot.left,spot.top,frame.tile,frame.tile);
});
};
}

export { uiScanHold,uiScanPainter };
