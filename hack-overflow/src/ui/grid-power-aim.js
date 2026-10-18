import { uiActiveMode,uiPowerOf } from './grid-power.js';
import { uiPaintAimMark } from './grid-power-aim-draw.js';


function uiPaintMark(ctx,app,frame) {
const power = uiPowerOf(app.game);
const mode = power.aim ? uiActiveMode(app.game) :null;
const mark = mode && mode.aimMark ? mode.aimMark(app) :null;
if (mark) uiPaintAimMark(ctx,frame,mark);
}
function uiWrapPaint(game) {
const inner = game.drawCast;
if (inner && inner.isAimMark) return;
const paint = function (ctx,app,frame) {
if (inner) inner(ctx,app,frame);
uiPaintMark(ctx,app,frame);
};
paint.isAimMark = true;
game.drawCast = paint;
}
function uiInstallAimMark(app) {
const power = uiPowerOf(app.game);
if (power.aimMark) return;
power.aimMark = true;
uiWrapPaint(app.game);
}

export { uiInstallAimMark };
