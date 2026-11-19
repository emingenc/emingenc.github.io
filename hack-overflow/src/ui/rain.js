import { rainFadeAlpha,rainFrameScale } from '../game/rain-time.js';
import { uiPrefersReducedMotion } from './dom.js';

const UI_RAIN_FONT_PX = 16;
const UI_RAIN_DROP_STEP = 0.5;
const UI_RAIN_RESET_CHANCE = 0.02;
const UI_RAIN_ALPHA_DIGITS = 3;
const UI_RAIN_COLOR = '#19f0c8';
const UI_RAIN_HANDOVER_MS = 400;
let uiRainLast = null;
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
function uiRainFade(state,scale) {
state.ctx.fillStyle = 'rgba(7, 11, 20, ' + rainFadeAlpha(scale).toFixed(UI_RAIN_ALPHA_DIGITS) + ')';
state.ctx.fillRect(0,0,state.size.width,state.size.height);
}
function uiRainDrawColumn(state,column,scale) {
const { drop,index } = column;
const posX = index * UI_RAIN_FONT_PX;
const posY = drop * UI_RAIN_FONT_PX;
state.ctx.fillText(uiRainGlyph(),posX,posY);
const pastBottom = posY > state.size.height && Math.random() < UI_RAIN_RESET_CHANCE;
return pastBottom ? 0 :drop + UI_RAIN_DROP_STEP * scale;
}
function uiRainStep(state,now) {
const scale = rainFrameScale(state.last === null ? 0 :now - state.last);
state.last = now;
uiRainFade(state,scale);
state.ctx.fillStyle = UI_RAIN_COLOR;
state.ctx.font = UI_RAIN_FONT_PX + 'px monospace';
state.drops = state.drops.map(function (drop,index) { return uiRainDrawColumn(state,{ drop,index },scale); });
state.raf = window.requestAnimationFrame(function (next) { uiRainStep(state,next); });
}
function uiRainInherit(state) {
const prev = uiRainLast;
const fresh = prev && performance.now() - prev.stoppedAt < UI_RAIN_HANDOVER_MS;
const same = fresh && prev.size.width === state.size.width && prev.size.height === state.size.height;
if (!same || prev.drops.length !== state.drops.length) return;
state.ctx.drawImage(prev.ctx.canvas,0,0,prev.size.width,prev.size.height);
state.drops = prev.drops;
}
function uiStartRain(canvas) {
if (uiPrefersReducedMotion()) return null;
const ctx = canvas.getContext('2d');
const size = uiRainResize(canvas);
ctx.setTransform(size.ratio,0,0,size.ratio,0,0);
const state = { ctx:ctx,size:size,drops:uiRainColumns(size),raf:null,last:null,stoppedAt:0 };
uiRainInherit(state);
uiRainStep(state,performance.now());
return state;
}
function uiStopRain(state) {
if (!state) return;
if (state.raf) window.cancelAnimationFrame(state.raf);
state.stoppedAt = performance.now();
uiRainLast = state;
}

export { uiStartRain, uiStopRain };
