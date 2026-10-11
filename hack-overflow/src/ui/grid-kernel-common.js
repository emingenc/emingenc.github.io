import { KERNEL_FRONT } from '../game/finale/roadback.js';
import { uiCastCarry } from './grid-cast-act.js';
import { uiHangKernel } from './grid-kernel-chips.js';
import { uiKernelPaint } from './grid-kernel-paint.js';
import { uiShowToast } from './grid-toast.js';

const FACING = 'up';

function uiSay(app,text,kind) {
uiShowToast(app,{ text,kind,replace:true });
}
function uiSeams(app) {
const ui = uiHangKernel(app);
ui.paint = uiKernelPaint(app);
return ui;
}
function uiCarryToFront(app) {
uiCastCarry(app,{ cell:KERNEL_FRONT,facing:FACING });
}

export { uiSay,uiSeams,uiCarryToFront };
