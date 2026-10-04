const SEMITONES_PER_OCTAVE = 12;
const PIN_BASE_FREQ = 523.25;
const PIN_CLIMB_OCTAVES = 2;
const PIN_CLIMB_SEMITONES = PIN_CLIMB_OCTAVES * SEMITONES_PER_OCTAVE;
const STAR_BASE_FREQ = 415.3;
const XP_TICK_FREQ = 740;
const XP_TICK_INTERVAL_MS = 40;
const RIG_CHAIN_CAP = 8;
const SFX_CUES = {
STEP_A:{ type:'tone',wave:'triangle',freq:220,durationMs:18 },
STEP_B:{ type:'tone',wave:'triangle',freq:262,durationMs:18 },
BUMP:{ type:'tone',wave:'square',freq:90,durationMs:70 },
BLOCKED:{ type:'arpeggio',wave:'sawtooth',notes:{ first:220,second:160 },durationMs:60,stepMs:70 },
GATE_OPEN:{ type:'sweep',wave:'triangle',freq:200,sweepTo:520,durationMs:220 },
KERNEL_OPEN:{ type:'arpeggio',wave:'triangle',notes:{ root:130.81,third:164.81,fifth:196,octave:261.63 },durationMs:300,stepMs:80 },
CACHE:{ type:'arpeggio',wave:'square',notes:{ first:988,second:1318.5 },durationMs:50,stepMs:60 },
JACK_IN:{ type:'sweep',wave:'sawtooth',freq:300,sweepTo:1200,durationMs:120 },
CHIP_ADD:{ type:'tone',wave:'square',freq:660,durationMs:50 },
CHIP_REMOVE:{ type:'tone',wave:'square',freq:300,durationMs:50 },
PROBE_PASS:{ type:'sweep',wave:'square',freq:660,sweepTo:990,durationMs:40 },
PROBE_FAIL:{ type:'sweep',wave:'square',freq:440,sweepTo:330,durationMs:40 },
PIN_PASS:{ type:'tone',wave:'triangle',freq:PIN_BASE_FREQ,durationMs:45 },
PIN_JAM:{ type:'sweep',wave:'sawtooth',freq:140,sweepTo:90,durationMs:160 },
TRACE:{ type:'tone',wave:'square',freq:350,durationMs:35 },
TRACED_SWEEP:{ type:'sweep',wave:'sawtooth',freq:520,sweepTo:120,durationMs:260 },
TRACED_NOISE:{ type:'noise',durationMs:150 },
ACCEPTED:{ type:'chord',wave:'triangle',notes:{ root:523.25,third:659.25,fifth:783.99,octave:1046.5 },durationMs:350 },
STAR:{ type:'tone',wave:'square',freq:STAR_BASE_FREQ,durationMs:55 },
XP_TICK:{ type:'tone',wave:'square',freq:XP_TICK_FREQ,durationMs:20 },
LEVEL_UP:{ type:'arpeggio',wave:'square',notes:{ first:392,second:523.25,third:659.25,fourth:783.99 },durationMs:200,stepMs:150 },
SECTOR_CLEAR:{ type:'arpeggio',wave:'triangle',notes:{ first:523.25,second:659.25,third:783.99,fourth:1046.5,fifth:1318.5 },durationMs:220,stepMs:140 },
EXPLOIT:{ type:'sweep',wave:'sawtooth',freq:1000,sweepTo:200,durationMs:90 },
DISCONNECT:{ type:'sweep',wave:'triangle',freq:700,sweepTo:200,durationMs:200 },
ENDING:{ type:'chord',wave:'triangle',notes:{ root:261.63,third:329.63,fifth:392,seventh:523.25,octave:659.25 },durationMs:900 },
SHOW_LINE:{ type:'arpeggio',wave:'triangle',notes:{ first:466.16,second:392 },durationMs:110,stepMs:110 },
RIG_ENTER:{ type:'arpeggio',wave:'square',notes:{ first:329.63,second:493.88 },durationMs:80,stepMs:90 },
RIG_STORE:{ type:'sweep',wave:'triangle',freq:392,sweepTo:784,durationMs:80 },
RIG_DROP:{ type:'sweep',wave:'sine',freq:520,sweepTo:180,durationMs:140 },
RIG_EVICT:{ type:'arpeggio',wave:'square',notes:{ first:587.33,second:293.66 },durationMs:50,stepMs:60 },
RIG_STALE:{ type:'arpeggio',wave:'triangle',notes:{ first:349.23,second:329.63,third:311.13 },durationMs:90,stepMs:80 },
RIG_BOUNTY:{ type:'arpeggio',wave:'square',notes:{ first:1046.5,second:1318.5,third:1568 },durationMs:60,stepMs:50 },
};
function semitoneFreq(base,semitones) {
return base * Math.pow(2,semitones / SEMITONES_PER_OCTAVE);
}
function cuesForStep(payload) {
const parity = (payload.pos.col + payload.pos.row) % 2;
return [{ cue:parity === 0 ? 'STEP_A' :'STEP_B',atMs:0 }];
}
function probeCue(packet) {
return { cue:packet.pass ? 'PROBE_PASS' :'PROBE_FAIL',atMs:packet.atMs };
}
function cuesCoincide(cues) {
return cues.length > 1 && cues.every((cue) => cue.atMs === cues[0].atMs);
}
function cuesForProbe(payload) {
const cues = payload.plan.packets.map(probeCue);
if (!cuesCoincide(cues)) return cues;
const allPassed = payload.plan.packets.every((packet) => packet.pass);
return [{ cue:allPassed ? 'PROBE_PASS' :'PROBE_FAIL',atMs:cues[0].atMs }];
}
function pinSemitones(index,pinCount) {
const lastIndex = pinCount - 1;
return lastIndex > PIN_CLIMB_SEMITONES ? index * PIN_CLIMB_SEMITONES / lastIndex :index;
}
function pinCue(pin,index,pinCount) {
if (pin.state !== 'pass') return pin.state === 'jam' ? { cue:'PIN_JAM',atMs:pin.atMs } :null;
return { cue:'PIN_PASS',atMs:pin.atMs,freq:semitoneFreq(PIN_BASE_FREQ,pinSemitones(index,pinCount)) };
}
function lastPerInstant(cues) {
const lastAtMs = new Map();
cues.forEach((cue) => lastAtMs.set(cue.atMs,cue));
return [...lastAtMs.values()];
}
function cuesForBreach(payload) {
const pins = payload.plan.pins;
return lastPerInstant(pins.map((pin,index) => pinCue(pin,index,pins.length)).filter(Boolean));
}
function cuesForStar(payload) {
return [{ cue:'STAR',atMs:0,freq:semitoneFreq(STAR_BASE_FREQ,payload.index) }];
}
function cuesForXp(payload) {
const ticks = Math.floor(payload.durationMs / XP_TICK_INTERVAL_MS) + 1;
return Array.from({ length:ticks },(_,tick) => ({ cue:'XP_TICK',atMs:tick * XP_TICK_INTERVAL_MS }));
}
function cuesForRigGood(payload) {
const links = Math.min(Math.max(Number(payload.chain) || 0,0),RIG_CHAIN_CAP);
return [{ cue:'PIN_PASS',atMs:0,freq:semitoneFreq(PIN_BASE_FREQ,links) }];
}
const RIG_PLACE_CUES = { store:'RIG_STORE',drop:'RIG_DROP',evict:'RIG_EVICT',stale:'RIG_STALE','bounty-pair':'RIG_BOUNTY',arm:'CHIP_ADD',disarm:'CHIP_REMOVE' };
function cuesForRigPlace(payload) {
const verb = payload ? payload.verb :undefined;
return [{ cue:Object.hasOwn(RIG_PLACE_CUES,verb) ? RIG_PLACE_CUES[verb] :'CHIP_ADD',atMs:0 }];
}
const STATIC_CUE_FOR_EVENT = {
BUMP:'BUMP',BLOCKED:'BLOCKED',GATE_OPEN:'GATE_OPEN',KERNEL_OPEN:'KERNEL_OPEN',CACHE:'CACHE',JACK_IN:'JACK_IN',
CHIP_ADD:'CHIP_ADD',CHIP_REMOVE:'CHIP_REMOVE',LINE_CLEAR:'CHIP_REMOVE',TRACE:'TRACE',ACCEPTED:'ACCEPTED',SHOW_LINE:'SHOW_LINE',
LEVEL_UP:'LEVEL_UP',SECTOR_CLEAR:'SECTOR_CLEAR',EXPLOIT:'EXPLOIT',DISCONNECT:'DISCONNECT',ENDING:'ENDING',
RIG_ENTER:'RIG_ENTER',RIG_BAD:'PIN_JAM',RIG_CLEAR:'ACCEPTED',RIG_FAIL:'TRACED_SWEEP',
};
const DYNAMIC_CUES_FOR_EVENT = {
STEP:cuesForStep,PROBE:cuesForProbe,BREACH:cuesForBreach,STAR:cuesForStar,XP:cuesForXp,
TRACED:() => [{ cue:'TRACED_SWEEP',atMs:0 },{ cue:'TRACED_NOISE',atMs:0 }],NEAR:() => [],RIG_GOOD:cuesForRigGood,RIG_PLACE:cuesForRigPlace,
};
function cuesForEvent(type,payload) {
const dynamic = DYNAMIC_CUES_FOR_EVENT[type];
if (dynamic) return dynamic(payload);
const cue = STATIC_CUE_FOR_EVENT[type];
return cue ? [{ cue,atMs:0 }] :[];
}

export { SFX_CUES, cuesForEvent };
