import { uiLoadSoundOn, uiSaveSoundOn } from './storage.js';

let uiAudioCtx = null;
let uiSoundOn = true;
function uiInitAudio() {
uiSoundOn = uiLoadSoundOn();
}
function uiToggleSound() {
uiSoundOn = !uiSoundOn;
uiSaveSoundOn(uiSoundOn);
return uiSoundOn;
}
function uiEnsureAudioCtx() {
if (uiAudioCtx) return uiAudioCtx;
const AudioCtor = window.AudioContext || window.webkitAudioContext;
uiAudioCtx = AudioCtor ? new AudioCtor() :null;
return uiAudioCtx;
}
const UI_TONE_GAIN = 0.08;
const UI_TONE_FLOOR = 0.0001;
const UI_TONE_TAIL_S = 0.02;
function uiPlayTone(spec) {
if (!uiSoundOn) return;
const ctx = uiEnsureAudioCtx();
if (!ctx) return;
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.type = spec.wave;
osc.frequency.setValueAtTime(spec.freq,ctx.currentTime);
if (spec.sweepTo) osc.frequency.exponentialRampToValueAtTime(spec.sweepTo,ctx.currentTime + spec.duration);
gain.gain.setValueAtTime(UI_TONE_GAIN,ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(UI_TONE_FLOOR,ctx.currentTime + spec.duration);
osc.connect(gain);
gain.connect(ctx.destination);
osc.start(ctx.currentTime);
osc.stop(ctx.currentTime + spec.duration + UI_TONE_TAIL_S);
}
function uiSoundChipAdd() {
uiPlayTone({ wave:'square',freq:660,duration:0.05 });
}
function uiSoundBackspace() {
uiPlayTone({ wave:'square',freq:300,duration:0.05 });
}
const UI_RUN_TICK_PASS_FREQ = 880;
const UI_RUN_TICK_FAIL_FREQ = 440;
function uiSoundRunTick(pass) {
uiPlayTone({ wave:'sine',freq:pass ? UI_RUN_TICK_PASS_FREQ :UI_RUN_TICK_FAIL_FREQ,duration:0.04 });
}
function uiSoundSubmitTick() {
uiPlayTone({ wave:'sine',freq:520,duration:0.03 });
}
function uiSoundWrong() {
uiPlayTone({ wave:'sawtooth',freq:180,duration:0.18,sweepTo:90 });
}
function uiSoundTle() {
uiPlayTone({ wave:'sawtooth',freq:220,duration:0.3,sweepTo:55 });
}
function uiSoundSyntax() {
uiPlayTone({ wave:'square',freq:140,duration:0.12 });
}
const UI_CHORD_FREQS = { root:523.25,third:659.25,fifth:783.99 };
const UI_CHORD_NOTE_DURATION = 0.35;
function uiSoundAccepted() {
Object.keys(UI_CHORD_FREQS).forEach(function (note) {
uiPlayTone({ wave:'triangle',freq:UI_CHORD_FREQS[note],duration:UI_CHORD_NOTE_DURATION });
});
}

export { uiInitAudio, uiToggleSound, uiSoundChipAdd, uiSoundBackspace, uiSoundRunTick, uiSoundSubmitTick, uiSoundWrong, uiSoundTle, uiSoundSyntax, uiSoundAccepted };
