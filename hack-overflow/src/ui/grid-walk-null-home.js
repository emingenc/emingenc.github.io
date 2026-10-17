import { HOME,homeBump,homeProps } from '../game/walk/null-home.js';
import { uiHooksOnce } from './grid-power.js';
import { uiPropGuard,uiQuestLive,uiQuestPaint } from './grid-quest-kit.js';
import { uiShowToast } from './grid-toast.js';
import { uiSpotOf } from './grid-spot.js';

const HALF = 0.5;
const BOX_INSET = 0.18;
const BOX_BORDER = 2;
const LABEL_TILES = 0.28;
const FONT = 'px VT323, monospace';

function uiProps(app) {
return homeProps(app.game.ext);
}
function uiRect(ctx,box) {
ctx.fillStyle = box.colour;
ctx.fillRect(box.left,box.top,box.size,box.size);
}
function uiPaintHome(ctx,app,frame) {
if (!uiProps(app).length) return;
const spot = uiSpotOf(HOME,frame);
if (!spot) return;
const inset = frame.tile * BOX_INSET;
const size = frame.tile - inset * 2;
uiRect(ctx,{ left:spot.left + inset,top:spot.top + inset,size,colour:frame.palette.magenta });
uiRect(ctx,{ left:spot.left + inset + BOX_BORDER,top:spot.top + inset + BOX_BORDER,size:size - BOX_BORDER * 2,colour:frame.palette.bg });
ctx.font = Math.round(frame.tile * LABEL_TILES) + FONT;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = frame.palette.magenta;
ctx.fillText('NULL',spot.left + frame.tile * HALF,spot.top + frame.tile * HALF);
}
function uiOnBump(info) {
const app = info.app;
if (!uiQuestLive(app)) return;
const line = homeBump(app.game.ext,info.event && info.event.prop);
if (line) uiShowToast(app,{ text:line,kind:'info' });
}
const uiHook = uiHooksOnce({ bump:uiOnBump });
function uiInstallNullHome(app) {
uiPropGuard(app,uiProps);
uiQuestPaint(app,uiPaintHome);
uiHook();
}

export { uiInstallNullHome };
