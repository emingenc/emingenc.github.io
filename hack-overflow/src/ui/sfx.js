import { GAME_EVENT } from '../game/game-events.js';
import { SFX_CUES, cuesForEvent } from '../game/sfx-cues.js';
import { uiIsSoundOn, uiAudioContext, uiOnSoundOn } from './audio.js';
import { uiPlayRecipe, uiSynthPrime } from './synth.js';
import { uiGameDebug, uiDebugPush } from './game-state.js';

const UI_CUE_REPEAT_GUARD_MS = 5;
const UI_GUARDED_CUE = 'GATE_OPEN';
const uiLastPlayedAt = {};
const uiPendingCueTimers = new Set();
function uiRecentlyPlayed(name,now) {
const last = uiLastPlayedAt[name];
return last !== undefined && now - last < UI_CUE_REPEAT_GUARD_MS;
}
const UI_COALESCE_CUES = new Set(['STAR']);
const UI_COALESCE_WINDOW_MS = 16;
const uiCoalesced = {};
function uiRenderCue(cue) {
uiLastPlayedAt[cue.cue] = performance.now();
uiPlayRecipe(SFX_CUES[cue.cue],cue.freq === undefined ? undefined :{ freq:cue.freq });
}
function uiFlushCoalesced(name) {
const cue = uiCoalesced[name];
delete uiCoalesced[name];
if (cue) uiRenderCue(cue);
}
function uiCoalesceCue(cue) {
if (!uiCoalesced[cue.cue]) setTimeout(function () { uiFlushCoalesced(cue.cue); },UI_COALESCE_WINDOW_MS);
uiCoalesced[cue.cue] = cue;
}
function uiPlayCue(cue) {
const now = performance.now();
uiDebugPush(uiGameDebug().sfx,{ cue:cue.cue,t:Math.round(now) });
if (!uiIsSoundOn()) return;
if (UI_COALESCE_CUES.has(cue.cue)) { uiCoalesceCue(cue); return; }
if (cue.cue === UI_GUARDED_CUE && uiRecentlyPlayed(cue.cue,now)) return;
uiRenderCue(cue);
}
function uiCancelPendingCues() {
uiPendingCueTimers.forEach(function (id) { clearTimeout(id); });
uiPendingCueTimers.clear();
}
function uiScheduleCue(cue) {
if (cue.atMs <= 0) { uiPlayCue(cue); return; }
const id = setTimeout(function () { uiPendingCueTimers.delete(id); uiPlayCue(cue); },cue.atMs);
uiPendingCueTimers.add(id);
}
function uiSectorClearRingMs() {
const recipe = SFX_CUES.SECTOR_CLEAR;
return recipe.stepMs * (Object.keys(recipe.notes).length - 1) + recipe.durationMs;
}
let uiSectorClearPending = false;
function uiPlayEvent(type,payload) {
const delay = type === GAME_EVENT.LEVEL_UP && uiSectorClearPending ? uiSectorClearRingMs() :0;
if (type === GAME_EVENT.SECTOR_CLEAR) {
uiSectorClearPending = true;
queueMicrotask(function () { uiSectorClearPending = false; });
}
cuesForEvent(type,payload).forEach((cue) => uiScheduleCue({ ...cue,atMs:cue.atMs + delay }));
}
const UI_PRIME_EVENTS = ['pointerdown','pointerup','keydown'];
function uiPrimeAudioContext(event) {
if (event.type === 'pointerdown' && event.pointerType !== 'mouse') return;
const ctx = uiAudioContext();
if (!ctx) return;
uiSynthPrime(ctx);
if (ctx.state !== 'running') return;
UI_PRIME_EVENTS.forEach(function (type) { window.removeEventListener(type,uiPrimeAudioContext,true); });
}
function uiWireSfx(bus) {
UI_PRIME_EVENTS.forEach(function (type) { window.addEventListener(type,uiPrimeAudioContext,true); });
uiOnSoundOn(uiSynthPrime);
bus.on(GAME_EVENT.DISCONNECT,uiCancelPendingCues);
bus.on(GAME_EVENT.JACK_IN,uiCancelPendingCues);
bus.on(GAME_EVENT.LEVEL_UP,uiCancelPendingCues);
Object.keys(GAME_EVENT).forEach(function (type) {
bus.on(type,function (payload) { uiPlayEvent(type,payload); });
});
}

export { uiWireSfx };
