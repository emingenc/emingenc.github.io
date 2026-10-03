import { uiLoadSoundOn, uiSaveSoundOn } from './storage.js';

let uiAudioCtx = null;
let uiAudioOn = true;
const uiPrimeHooks = new Set();
function uiInitAudio() {
uiAudioOn = uiLoadSoundOn();
}
function uiOnSoundOn(fn) {
uiPrimeHooks.add(fn);
}
function uiToggleSound() {
uiAudioOn = !uiAudioOn;
uiSaveSoundOn(uiAudioOn);
if (uiAudioOn) uiPrimeOnToggle();
return uiAudioOn;
}
function uiPrimeOnToggle() {
const ctx = uiEnsureAudioCtx();
if (ctx) uiPrimeHooks.forEach(function (fn) { fn(ctx); });
}
function uiEnsureAudioCtx() {
if (uiAudioCtx) {
if (uiAudioCtx.state === 'suspended') uiAudioCtx.resume();
return uiAudioCtx;
}
const AudioCtor = window.AudioContext || window.webkitAudioContext;
uiAudioCtx = AudioCtor ? new AudioCtor() :null;
return uiAudioCtx;
}
function uiIsSoundOn() {
return uiAudioOn;
}
function uiAudioContext() {
return uiAudioOn ? uiEnsureAudioCtx() :null;
}

export { uiInitAudio, uiOnSoundOn, uiToggleSound, uiIsSoundOn, uiAudioContext };
