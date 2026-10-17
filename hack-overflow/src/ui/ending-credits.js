import { creditsCast,creditsFrame } from '../game/credits.js';
import { uiEl,uiPrefersReducedMotion } from './dom.js';
import { uiBitWears,uiPaintMember,uiReadPalette,uiSizeCanvas } from './ending-credits-art.js';

const SKIP_KEY = 'ending-skip';
const MIN_PIXEL = 2;
const MAX_PIXEL = 6;
const CELLS_PER_MEMBER = 11;
const FLOOR_MARGIN = 14;
const PLATE_WIDTH = 64;
const HATCH_SHARE = 0.33;
const HATCH_MAX = 64;
const HATCH_ALPHA = 0.55;
const HATCH_THICK = 3;

function pixelFor(width,count) {
return Math.min(MAX_PIXEL,Math.max(MIN_PIXEL,Math.floor(width / (count * CELLS_PER_MEMBER))));
}
function paintFloor(view,palette) {
const { ctx,width,height } = view;
const floor = height - FLOOR_MARGIN;
ctx.clearRect(0,0,width,height);
ctx.fillStyle = palette.panel;
ctx.fillRect(0,floor,width,FLOOR_MARGIN);
ctx.fillStyle = palette.border;
ctx.fillRect(0,floor,width,1);
for (let left = 0; left < width; left += PLATE_WIDTH) ctx.fillRect(left,floor,1,FLOOR_MARGIN);
return floor;
}
function paintHatch(view,palette,floor) {
const { ctx } = view;
const width = Math.min(view.width * HATCH_SHARE,HATCH_MAX);
ctx.fillStyle = palette.primary;
ctx.globalAlpha = HATCH_ALPHA;
ctx.fillRect((view.width - width) / 2,floor,width,HATCH_THICK);
ctx.globalAlpha = 1;
}
function uiPaintStage(canvas,scene) {
const view = uiSizeCanvas(canvas);
if (!view) return;
const palette = uiReadPalette(canvas);
const floor = paintFloor(view,palette);
const frame = creditsFrame(scene.elapsed,scene.cast);
if (!frame.done) paintHatch(view,palette,floor);
const pixel = pixelFor(view.width,scene.cast.length);
frame.figures.forEach(function (figure) {
const spot = { palette,pixel,center:figure.x * view.width,floor,now:scene.now,wears:scene.wears };
uiPaintMember(view.ctx,spot,{ id:scene.cast[figure.index].id,walking:figure.walking });
});
}
function uiCaptionText(frame,cast) {
if (frame.speaker === null) return '';
const member = cast[frame.speaker];
return member.name + '  ' + member.line.slice(0,frame.typed);
}
function uiCastItem(member) {
return uiEl('li',{ className:'ending-cast-item',children:[uiEl('span',{ className:'ending-cast-name',text:member.name }),' ' + member.line] });
}
function uiSkipButton() {
return uiEl('button',{
className:'btn btn-ghost ending-skip',text:'SKIP CREDITS',
attrs:{ type:'button','data-action':SKIP_KEY,'data-focus-key':SKIP_KEY },
});
}
function uiRenderCredits(credits) {
const stage = uiEl('canvas',{ className:'ending-stage',attrs:credits.done ? { 'aria-hidden':'true' } :{ 'aria-hidden':'true','data-action':SKIP_KEY } });
return uiEl('section',{
className:'ending-credits' + (credits.done ? ' is-done' :''),
attrs:{ 'aria-label':'Credits' },
children:[
stage,
uiEl('p',{ className:'ending-caption',attrs:{ 'aria-hidden':'true' } }),
...(credits.done ? [] :[uiSkipButton()]),
uiEl('ol',{ className:'ending-cast',children:credits.cast.map(uiCastItem) }),
],
});
}
function uiElapsed(credits,now) {
if (credits.skipped || uiPrefersReducedMotion()) return Infinity;
return credits.startedAt === null ? 0 :now - credits.startedAt;
}
function uiSyncCredits(root,credits,now) {
const stage = root.querySelector('.ending-stage');
const caption = root.querySelector('.ending-caption');
const elapsed = uiElapsed(credits,now);
if (stage) uiPaintStage(stage,{ cast:credits.cast,wears:credits.wears,elapsed,now });
const frame = creditsFrame(elapsed,credits.cast);
if (caption) caption.textContent = uiCaptionText(frame,credits.cast);
return frame.done;
}
function uiCreditsDone(credits,now) {
return creditsFrame(uiElapsed(credits,now),credits.cast).done;
}
function uiNewCredits(ext,stats) {
return { cast:creditsCast(ext,stats),wears:uiBitWears(ext),startedAt:null,skipped:false,done:false,looping:false,landed:false };
}

export { SKIP_KEY,uiCreditsDone,uiNewCredits,uiRenderCredits,uiSyncCredits };
