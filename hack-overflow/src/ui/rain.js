import { uiPrefersReducedMotion } from './dom.js';

const UI_RAIN_FONT_PX = 16;
const UI_RAIN_DROP_STEP = 0.5;
const UI_RAIN_RESET_CHANCE = 0.02;
const UI_RAIN_COLOR = '#00e680';
const UI_RAIN_GLYPHS = '01{}[]<>/\\$#@+-';
function uiRainResize(canvas) {
const ratio = window.devicePixelRatio || 1;
const rect = canvas.parentElement.getBoundingClientRect();
canvas.width = Math.floor(rect.width * ratio);
canvas.height = Math.floor(rect.height * ratio);
canvas.style.width = rect.width + 'px';
canvas.style.height = rect.height + 'px';
return { width:rect.width,height:rect.height,ratio:ratio };
}
function uiRainColumns(size) {
const count = Math.ceil(size.width / UI_RAIN_FONT_PX);
const drops = [];
for (let column = 0; column < count; column += 1) {
drops.push(Math.random() * (size.height / UI_RAIN_FONT_PX));
}
return drops;
}
function uiRainGlyph() {
return UI_RAIN_GLYPHS.charAt(Math.floor(Math.random() * UI_RAIN_GLYPHS.length));
}
function uiRainFade(state) {
state.ctx.fillStyle = 'rgba(3, 8, 5, 0.15)';
state.ctx.fillRect(0,0,state.size.width,state.size.height);
}
function uiRainDrawColumn(state,drop,index) {
const posX = index * UI_RAIN_FONT_PX;
const posY = drop * UI_RAIN_FONT_PX;
state.ctx.fillText(uiRainGlyph(),posX,posY);
const pastBottom = posY > state.size.height && Math.random() < UI_RAIN_RESET_CHANCE;
return pastBottom ? 0 :drop + UI_RAIN_DROP_STEP;
}
function uiRainStep(state) {
uiRainFade(state);
state.ctx.fillStyle = UI_RAIN_COLOR;
state.ctx.font = UI_RAIN_FONT_PX + 'px monospace';
state.drops = state.drops.map(function (drop,index) { return uiRainDrawColumn(state,drop,index); });
state.raf = window.requestAnimationFrame(function () { uiRainStep(state); });
}
function uiStartRain(canvas) {
if (uiPrefersReducedMotion()) return null;
const ctx = canvas.getContext('2d');
const size = uiRainResize(canvas);
ctx.setTransform(size.ratio,0,0,size.ratio,0,0);
const state = { ctx:ctx,size:size,drops:uiRainColumns(size),raf:null };
uiRainStep(state);
return state;
}
function uiStopRain(state) {
if (state && state.raf) window.cancelAnimationFrame(state.raf);
}

export { uiStartRain, uiStopRain };
