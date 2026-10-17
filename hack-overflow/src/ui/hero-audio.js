import { audioWanted } from '../game/ext/audio-ops.js';
import { HERO_CUES, ambientPlan, cuesAllowed } from '../game/hero-cues.js';
import { uiIsSoundOn, uiAudioContext } from './audio.js';
import { uiPrefersReducedMotion } from './dom.js';
import { uiGameDebug, uiDebugPush } from './game-state.js';
import { uiPlayRecipe } from './synth.js';

const UI_BED_LEVEL = 0.03;
const UI_BED_FADE_IN_S = 1.5;
const UI_BED_FADE_OUT_S = 0.4;
const UI_BED_STOP_TAIL_S = 0.05;
const UI_TREMOLO_DEPTH = 0.35;
const UI_GESTURE_EVENTS = ['pointerdown','pointerup','keydown'];
let uiBed = null;
let uiHeroApp = null;
let uiWaiting = false;
let uiWatching = false;
function uiHeroWanted(app) {
return audioWanted(app && app.game && app.game.ext) && uiIsSoundOn();
}
function uiReducedMotion() {
return typeof window !== 'undefined' && Boolean(uiPrefersReducedMotion());
}
function uiTabHidden() {
return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}
function uiBedVoice(ctx,spec,out) {
const osc = ctx.createOscillator();
const level = ctx.createGain();
osc.type = spec.type;
osc.frequency.value = spec.freq;
level.gain.value = spec.gain;
osc.connect(level);
level.connect(out);
osc.start(ctx.currentTime);
return osc;
}
function uiBedTremolo(ctx,hz,out) {
const lfo = ctx.createOscillator();
const depth = ctx.createGain();
lfo.frequency.value = hz;
depth.gain.value = UI_BED_LEVEL * UI_TREMOLO_DEPTH;
lfo.connect(depth);
depth.connect(out.gain);
lfo.start(ctx.currentTime);
return { lfo,depth };
}
function uiBuildBed(ctx) {
const plan = ambientPlan(uiReducedMotion());
const now = ctx.currentTime;
const out = ctx.createGain();
out.gain.setValueAtTime(0,now);
out.gain.linearRampToValueAtTime(UI_BED_LEVEL,now + UI_BED_FADE_IN_S);
out.connect(ctx.destination);
const voices = plan.oscillators.map((spec) => uiBedVoice(ctx,spec,out));
const params = [out.gain];
if (plan.tremoloHz > 0) {
const tremolo = uiBedTremolo(ctx,plan.tremoloHz,out);
voices.push(tremolo.lfo);
params.push(tremolo.depth.gain);
}
return { ctx,voices,params };
}
function uiStopBed() {
if (!uiBed) return;
const { ctx,voices,params } = uiBed;
const now = ctx.currentTime;
uiBed = null;
params.forEach(function (param) {
param.cancelScheduledValues(now);
param.setValueAtTime(param.value,now);
param.linearRampToValueAtTime(0,now + UI_BED_FADE_OUT_S);
});
voices.forEach(function (osc) { osc.stop(now + UI_BED_FADE_OUT_S + UI_BED_STOP_TAIL_S); });
}
function uiOnGesture(event) {
if (event.type === 'pointerdown' && event.pointerType !== 'mouse') return;
uiHeroAudioSync(uiHeroApp);
}
function uiWaitForGesture() {
if (uiWaiting) return;
uiWaiting = true;
UI_GESTURE_EVENTS.forEach(function (type) { window.addEventListener(type,uiOnGesture,true); });
}
function uiStopWaiting() {
if (!uiWaiting) return;
uiWaiting = false;
UI_GESTURE_EVENTS.forEach(function (type) { window.removeEventListener(type,uiOnGesture,true); });
}
function uiOnVisibility() {
if (uiTabHidden()) {
uiStopBed();
uiStopWaiting();
return;
}
uiHeroAudioSync(uiHeroApp);
}
function uiWatchTab() {
if (uiWatching || typeof document === 'undefined') return;
uiWatching = true;
document.addEventListener('visibilitychange',uiOnVisibility);
}
function uiUnwatchTab() {
if (!uiWatching) return;
uiWatching = false;
document.removeEventListener('visibilitychange',uiOnVisibility);
}
function uiStartBed() {
const ctx = uiAudioContext();
if (!ctx) return;
if (ctx.state !== 'running') {
uiWaitForGesture();
const resumed = typeof ctx.resume === 'function' ? ctx.resume() :null;
if (resumed && resumed.then) resumed.then(function () { uiHeroAudioSync(uiHeroApp); },function () {});
return;
}
uiStopWaiting();
uiBed = uiBuildBed(ctx);
}
function uiHeroAudioSync(app) {
uiHeroApp = app;
if (!uiHeroWanted(app)) {
uiStopBed();
uiStopWaiting();
uiUnwatchTab();
return;
}
uiWatchTab();
if (uiTabHidden()) {
uiStopBed();
uiStopWaiting();
return;
}
if (!uiBed) uiStartBed();
}
function uiHeroAudioStart(app) {
if (uiHeroWanted(app)) uiHeroAudioSync(app);
}
function uiHeroCue(app,name) {
if (!Object.hasOwn(HERO_CUES,name)) return;
uiDebugPush(uiGameDebug().sfx,{ cue:name,t:Math.round(performance.now()) });
const allowed = cuesAllowed(name,{ wanted:audioWanted(app && app.game && app.game.ext),soundOn:uiIsSoundOn(),reducedMotion:uiReducedMotion() });
if (allowed) uiPlayRecipe(HERO_CUES[name]);
}

export { uiHeroAudioStart,uiHeroAudioSync,uiHeroCue };
