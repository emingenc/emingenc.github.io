import { uiAudioContext } from './audio.js';

const SYNTH_VOICE_GAIN = 0.08;
const SYNTH_GAIN_FLOOR = 0.0001;
const SYNTH_TAIL_S = 0.02;
const MS_PER_SECOND = 1000;
const SYNTH_COMPRESSOR_SETTINGS = { threshold:-6,knee:0,ratio:20,attack:0.002,release:0.1 };
const SYNTH_MASTER_GAIN = 0.674;
const uiCompressors = new WeakMap();
const uiMasters = new WeakMap();
function uiSynthMaster(ctx) {
if (uiMasters.has(ctx)) return uiMasters.get(ctx);
const master = ctx.createGain();
master.gain.value = SYNTH_MASTER_GAIN;
master.connect(ctx.destination);
uiMasters.set(ctx,master);
return master;
}
function uiSynthCompressor(ctx) {
if (uiCompressors.has(ctx)) return uiCompressors.get(ctx);
const compressor = ctx.createDynamicsCompressor();
Object.keys(SYNTH_COMPRESSOR_SETTINGS).forEach((setting) => { compressor[setting].value = SYNTH_COMPRESSOR_SETTINGS[setting]; });
compressor.connect(uiSynthMaster(ctx));
uiCompressors.set(ctx,compressor);
return compressor;
}
function uiSynthPrime(ctx) {
uiSynthCompressor(ctx);
}
function uiSynthEnvelope(ctx,startAt,durationS) {
const gain = ctx.createGain();
gain.gain.setValueAtTime(SYNTH_VOICE_GAIN,startAt);
gain.gain.exponentialRampToValueAtTime(SYNTH_GAIN_FLOOR,startAt + durationS);
gain.connect(uiSynthCompressor(ctx));
return gain;
}
function uiStartOscillator(ctx,{ wave,freq,sweepTo,durationS,startAt }) {
const osc = ctx.createOscillator();
osc.type = wave;
osc.frequency.setValueAtTime(freq,startAt);
if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo,startAt + durationS);
osc.connect(uiSynthEnvelope(ctx,startAt,durationS));
osc.start(startAt);
osc.stop(startAt + durationS + SYNTH_TAIL_S);
}
function uiNoiseBuffer(ctx,durationS) {
const frames = Math.round(ctx.sampleRate * durationS);
const buffer = ctx.createBuffer(1,frames,ctx.sampleRate);
const data = buffer.getChannelData(0);
for (let frame = 0;frame < frames;frame += 1) data[frame] = Math.random() * 2 - 1;
return buffer;
}
function uiStartNoise(ctx,startAt,durationS) {
const source = ctx.createBufferSource();
source.buffer = uiNoiseBuffer(ctx,durationS);
source.connect(uiSynthEnvelope(ctx,startAt,durationS));
source.start(startAt);
}
function uiTone(spec) {
const ctx = uiAudioContext();
if (!ctx) return;
uiStartOscillator(ctx,{ ...spec,durationS:spec.durationMs / MS_PER_SECOND,startAt:ctx.currentTime });
}
function uiNoiseBurst(spec) {
const ctx = uiAudioContext();
if (!ctx) return;
uiStartNoise(ctx,ctx.currentTime,spec.durationMs / MS_PER_SECOND);
}
function uiChord(spec) {
const ctx = uiAudioContext();
if (!ctx) return;
const durationS = spec.durationMs / MS_PER_SECOND;
Object.values(spec.notes).forEach((freq) => uiStartOscillator(ctx,{ wave:spec.wave,freq,durationS,startAt:ctx.currentTime }));
}
function uiArpeggioNote(spec,freq) {
const ctx = uiAudioContext();
if (!ctx) return;
uiStartOscillator(ctx,{ wave:spec.wave,freq,durationS:spec.durationMs / MS_PER_SECOND,startAt:ctx.currentTime });
}
function uiArpeggio(spec) {
Object.values(spec.notes).forEach((freq,index) => window.setTimeout(() => uiArpeggioNote(spec,freq),index * spec.stepMs));
}
const SYNTH_PLAYERS = { tone:uiTone,sweep:uiTone,noise:uiNoiseBurst,chord:uiChord,arpeggio:uiArpeggio };
function uiPlayRecipe(recipe,overrides) {
if (!recipe) return;
const spec = overrides ? { ...recipe,...overrides } :recipe;
const play = SYNTH_PLAYERS[spec.type];
if (play) play(spec);
}

export { uiPlayRecipe, uiSynthPrime };
