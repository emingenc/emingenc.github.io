import { GAME_EVENT } from '../game/game-events.js';
import { PIN_TIMING } from '../game/pins.js';
import { lerp } from '../game/ease.js';
import { seededRandom, spawnParticles, updateParticles } from '../game/particles.js';
import { tileSizeFor } from '../game/viewport.js';
import { uiEl, uiPrefersReducedMotion } from './dom.js';
import { uiGameDebug, uiDebugPush } from './game-state.js';
import { uiGridBurst, uiDrawParticles } from './grid-draw-fx.js';


const UI_SHAKES = {
grid:{ selector:'.grid-stage .grid-canvas',px:4,ms:180,beats:5 },
jam:{ selector:'.breach-status',px:7,ms:340,beats:7 },
};
const UI_SHAKE_KICK = 0.5;
const UI_EFFECTS = {
accepted:{ className:'fx-flash fx-flash-accepted',ms:480,delayMs:0 },
levelUp:{ className:'fx-flash fx-flash-level',ms:760,delayMs:0 },
ending:{ className:'fx-flash fx-flash-level',ms:900,delayMs:0 },
jackZoom:{ className:'fx-jack',ms:340,delayMs:0 },
jackFlash:{ className:'fx-flash fx-flash-jack',ms:320,delayMs:220 },
disconnect:{ className:'fx-fade fx-fade-disconnect',ms:240,delayMs:0 },
};
const UI_CELEBRATION_BURST = [{ kind:'ring',delayMs:0 },{ kind:'burst',delayMs:90,colors:['bright','amber','primary'] }];
const UI_BURSTS = {
accepted:[{ kind:'ring',delayMs:0 },{ kind:'burst',delayMs:0 },{ kind:'confetti',delayMs:40 }],
levelUp:UI_CELEBRATION_BURST,
ending:UI_CELEBRATION_BURST,
cache:[{ kind:'pop',delayMs:0 },{ kind:'sparkle',delayMs:0 }],
gate:[{ kind:'dust',delayMs:0 }],
sector:[{ kind:'ring',delayMs:0 },{ kind:'burst',delayMs:0 },{ kind:'sparkle',delayMs:150 }],
};
const UI_GLITCH = { bars:9,minPx:3,maxPx:28,shiftPx:36,lastStartMs:480,percent:100,tailMs:260 };
const UI_EFFECT_GRACE_MS = 80;
const UI_ACCEPTED_ANCHORS = ['.breach-lock-body','.breach-lock','.breach-pins','.breach-status'];
const UI_JACK_ANCHORS = ['.grid-stage'];
const UI_FX_COLOURS = ['border','primary','bright','cyan','magenta','amber','red','text','dim'];
const UI_CELL_CENTRE = 0.5;

let uiFxStore = null;
function uiFxState() {
if (!uiFxStore) uiFxStore = { layer:null,canvas:null,ctx:null,palette:null,pool:[],raf:0,effects:0,seed:0,jamTimer:0,shakes:{} };
return uiFxStore;
}
function uiFxDebug() {
const debug = uiGameDebug();
if (!debug.fx) debug.fx = { frames:0,running:false,log:[] };
return debug.fx;
}
function uiFxNote(effect) {
uiDebugPush(uiFxDebug().log,{ effect,t:Math.round(performance.now()) });
}
function uiFxSeed() {
const state = uiFxState();
state.seed += 1;
return state.seed;
}
function uiFxSetVars(node,vars) {
Object.keys(vars).forEach(function (name) { node.style.setProperty('--fx-' + name,vars[name]); });
}

function uiShakeOffsets(shake,seed) {
const random = seededRandom(seed);
const offsets = [];
for (let beat = 0; beat < shake.beats; beat += 1) {
const reach = shake.px * (1 - beat / shake.beats);
const side = beat % 2 === 0 ? 1 :-1;
const across = side * Math.max(1,Math.round(reach * lerp(UI_SHAKE_KICK,1,random())));
offsets.push({ across,down:Math.round((random() * 2 - 1) * reach * UI_SHAKE_KICK) });
}
return [...offsets,{ across:0,down:0 }];
}
function uiShakeFrame(offset) {
return { transform:'translate(' + offset.across + 'px,' + offset.down + 'px)' };
}
function uiFxShakeAnimate(node,entry) {
const animation = node.animate(entry.frames,{ duration:entry.ms,easing:'linear' });
animation.currentTime = performance.now() - entry.startedAt;
entry.animation = animation;
}
function uiFxShakeRetarget(entry) {
if (entry.animation && entry.animation.effect.target.isConnected) return;
const node = document.querySelector(entry.selector);
if (node && typeof node.animate === 'function') uiFxShakeAnimate(node,entry);
}
function uiFxShakeStop(kind) {
const entry = uiFxState().shakes[kind];
if (!entry) return;
if (entry.animation) entry.animation.cancel();
if (entry.observer) entry.observer.disconnect();
}
function uiFxShakeExpire(kind,entry) {
if (uiFxState().shakes[kind] === entry) uiFxShakeStop(kind);
}
function uiFxShakeObserve(kind,entry) {
const app = document.getElementById('app');
if (!app) return null;
const observer = new MutationObserver(function () { uiFxShakeRetarget(entry); });
observer.observe(app,{ childList:true,subtree:true });
return observer;
}
function uiFxShake(kind) {
const shake = UI_SHAKES[kind];
const target = document.querySelector(shake.selector);
if (!target || typeof target.animate !== 'function') return;
uiFxShakeStop(kind);
const entry = { frames:uiShakeOffsets(shake,uiFxSeed()).map(uiShakeFrame),ms:shake.ms,selector:shake.selector,startedAt:performance.now(),animation:null,observer:null };
uiFxState().shakes[kind] = entry;
uiFxShakeAnimate(target,entry);
entry.observer = uiFxShakeObserve(kind,entry);
window.setTimeout(function () { uiFxShakeExpire(kind,entry); },shake.ms);
uiFxNote('shake-' + kind);
}
function uiFxCancelJam() {
const state = uiFxState();
if (state.jamTimer) window.clearTimeout(state.jamTimer);
state.jamTimer = 0;
}
function uiFxJam() {
uiFxState().jamTimer = 0;
if (!uiPrefersReducedMotion() && document.querySelector('[data-screen="breach"]')) uiFxShake('jam');
}
function uiFxOnBreach(payload) {
uiFxCancelJam();
const plan = payload.plan;
if (!plan || typeof plan.jamIndex !== 'number') return;
const pin = plan.pins[plan.jamIndex];
uiFxState().jamTimer = window.setTimeout(uiFxJam,pin ? pin.atMs :0);
}

function uiFxViewport() {
const root = document.documentElement;
return { width:root.clientWidth,height:root.clientHeight,dpr:window.devicePixelRatio || 1,unit:tileSizeFor(root.clientWidth) };
}
function uiFxPalette() {
const style = window.getComputedStyle(document.documentElement);
return Object.fromEntries(UI_FX_COLOURS.map(function (name) { return [name,style.getPropertyValue('--' + name).trim()]; }));
}
function uiFxLayer() {
const state = uiFxState();
if (state.layer) return state.layer;
state.canvas = uiEl('canvas',{ className:'fx-canvas' });
state.ctx = state.canvas.getContext('2d');
state.layer = uiEl('div',{ className:'fx-layer',attrs:{ 'aria-hidden':'true' },children:[state.canvas] });
document.body.appendChild(state.layer);
if (!state.palette) state.palette = uiFxPalette();
return state.layer;
}
function uiFxSettle() {
const state = uiFxState();
uiFxDebug().running = state.raf !== 0;
if (state.raf || state.effects > 0 || !state.layer) return;
state.layer.remove();
Object.assign(state,{ layer:null,canvas:null,ctx:null });
}
function uiFxPaint(state) {
const view = uiFxViewport();
const canvas = state.canvas;
const width = Math.round(view.width * view.dpr);
const height = Math.round(view.height * view.dpr);
if (canvas.width !== width || canvas.height !== height) Object.assign(canvas,{ width,height });
state.ctx.setTransform(view.dpr,0,0,view.dpr,0,0);
state.ctx.clearRect(0,0,view.width,view.height);
uiDrawParticles(state.ctx,state.pool,{ left:0,top:0,unit:view.unit,dpr:view.dpr,palette:state.palette });
}
function uiFxTick(now) {
const state = uiFxState();
state.raf = 0;
state.pool = updateParticles(state.pool,now);
uiFxPaint(state);
uiFxDebug().frames += 1;
if (state.pool.length > 0) state.raf = window.requestAnimationFrame(uiFxTick);
uiFxSettle();
}
function uiFxStartLoop() {
const state = uiFxState();
if (!state.raf) state.raf = window.requestAnimationFrame(uiFxTick);
uiFxDebug().running = true;
}
function uiFxEmissions(name,origin,now) {
return UI_BURSTS[name].map(function (spec) {
return { kind:spec.kind,origin,atMs:now + spec.delayMs,seed:uiFxSeed(),colors:spec.colors };
});
}
function uiOverlayBurst(name,point) {
const state = uiFxState();
const unit = uiFxViewport().unit;
uiFxLayer();
uiFxEmissions(name,{ col:point.x / unit,row:point.y / unit },performance.now()).forEach(function (emission) {
state.pool = spawnParticles(state.pool,emission);
});
uiFxStartLoop();
}
function uiFxEffectDone(node) {
node.remove();
uiFxState().effects -= 1;
uiFxSettle();
}
function uiFxEffect(effect) {
const node = uiEl('div',{ className:'fx-effect ' + effect.className });
uiFxSetVars(node,{ ms:effect.ms + 'ms' });
node.style.animationDelay = effect.delayMs + 'ms';
uiFxLayer().appendChild(node);
uiFxState().effects += 1;
window.setTimeout(function () { uiFxEffectDone(node); },effect.delayMs + effect.ms + UI_EFFECT_GRACE_MS);
return node;
}
function uiFxCentre(rect) {
return { x:rect.left + rect.width / 2,y:rect.top + rect.height / 2 };
}
function uiFxOnScreen(point,view) {
return point.x >= 0 && point.x <= view.width && point.y >= 0 && point.y <= view.height;
}
function uiFxAnchor(selectors,view) {
for (const selector of selectors) {
const node = document.querySelector(selector);
const rect = node ? node.getBoundingClientRect() :null;
if (rect && rect.width > 0 && uiFxOnScreen(uiFxCentre(rect),view)) return uiFxCentre(rect);
}
return { x:view.width / 2,y:view.height / 2 };
}

function uiFxOnAccepted() {
const point = uiFxAnchor(UI_ACCEPTED_ANCHORS,uiFxViewport());
uiFxSetVars(uiFxEffect(UI_EFFECTS.accepted),{ x:Math.round(point.x) + 'px',y:Math.round(point.y) + 'px' });
uiOverlayBurst('accepted',point);
uiFxNote('accepted');
}
function uiFxCelebrate(effect,burst,note) {
const view = uiFxViewport();
uiFxEffect(effect);
uiOverlayBurst(burst,{ x:view.width / 2,y:view.height / 2 });
uiFxNote(note);
}
function uiFxOnLevelUp() {
uiFxCelebrate(UI_EFFECTS.levelUp,'levelUp','level-up');
}
function uiFxOnEnding() {
uiFxCelebrate(UI_EFFECTS.ending,'ending','ending');
}
function uiFxOnJackIn() {
uiFxCancelJam();
const view = uiFxViewport();
const point = uiFxAnchor(UI_JACK_ANCHORS,view);
const half = view.unit / 2;
uiFxSetVars(uiFxEffect(UI_EFFECTS.jackZoom),{
top:Math.round(point.y - half) + 'px',left:Math.round(point.x - half) + 'px',
right:Math.round(view.width - point.x - half) + 'px',bottom:Math.round(view.height - point.y - half) + 'px',
});
uiFxEffect(UI_EFFECTS.jackFlash);
uiFxNote('jack-in');
}
function uiFxOnDisconnect() {
uiFxCancelJam();
uiFxEffect(UI_EFFECTS.disconnect);
uiFxNote('disconnect');
}
function uiGlitchBar(random,index) {
const bar = uiEl('div',{ className:index % 2 === 0 ? 'fx-glitch-bar' :'fx-glitch-bar fx-glitch-bar-alt' });
bar.style.top = (random() * UI_GLITCH.percent).toFixed(1) + '%';
bar.style.height = Math.round(lerp(UI_GLITCH.minPx,UI_GLITCH.maxPx,random())) + 'px';
bar.style.animationDelay = Math.round(random() * UI_GLITCH.lastStartMs) + 'ms';
uiFxSetVars(bar,{ shift:Math.round((random() * 2 - 1) * UI_GLITCH.shiftPx) + 'px' });
return bar;
}
function uiFxOnTraced() {
const glitch = uiFxEffect({ className:'fx-glitch',ms:PIN_TIMING.tracedHoldMs + UI_GLITCH.tailMs,delayMs:0 });
const random = seededRandom(uiFxSeed());
for (let index = 0; index < UI_GLITCH.bars; index += 1) glitch.appendChild(uiGlitchBar(random,index));
uiFxNote('traced');
}

function uiCellCentre(cell) {
return { col:cell.col + UI_CELL_CENTRE,row:cell.row + UI_CELL_CENTRE };
}
function uiGridEffect(name,cells) {
const now = performance.now();
cells.flatMap(function (cell) { return uiFxEmissions(name,uiCellCentre(cell),now); }).forEach(uiGridBurst);
uiFxNote(name);
}
function uiFxOnBump() {
uiFxShake('grid');
}
function uiFxOnCache(payload) {
uiGridEffect('cache',[payload.cell]);
}
function uiFxOnGate(payload) {
uiGridEffect('gate',payload.cells || []);
}
function uiFxOnSector(payload) {
uiGridEffect('sector',[payload.cell]);
}
const UI_FX_ROUTES = {
[GAME_EVENT.BUMP]:uiFxOnBump,
[GAME_EVENT.BLOCKED]:uiFxOnBump,
[GAME_EVENT.BREACH]:uiFxOnBreach,
[GAME_EVENT.DISCONNECT]:uiFxOnDisconnect,
[GAME_EVENT.JACK_IN]:uiFxOnJackIn,
[GAME_EVENT.CACHE]:uiFxOnCache,
[GAME_EVENT.GATE_OPEN]:uiFxOnGate,
[GAME_EVENT.SECTOR_CLEAR]:uiFxOnSector,
[GAME_EVENT.ACCEPTED]:uiFxOnAccepted,
[GAME_EVENT.LEVEL_UP]:uiFxOnLevelUp,
[GAME_EVENT.TRACED]:uiFxOnTraced,
[GAME_EVENT.ENDING]:uiFxOnEnding,
};
function uiFxOnEvent(type,payload) {
if (!Object.hasOwn(UI_FX_ROUTES,type) || uiPrefersReducedMotion()) return;
UI_FX_ROUTES[type](payload || {});
}
function uiWireFx(bus) {
uiFxDebug();
return bus.on('*',uiFxOnEvent);
}

export { UI_BURSTS, uiWireFx };
