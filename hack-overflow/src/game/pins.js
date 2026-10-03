import { VERDICT_WORDS } from '../logic/index.js';

const PIN_TIMING = {
stepMaxMs:60,sweepMaxMs:900,jamHoldMs:420,shackleMs:180,revealHoldMs:900,
tracedHoldMs:700,probeStepMs:140,reducedHoldMs:300,
};

function stepMsFor(pinsAnimated) {
return Math.min(PIN_TIMING.stepMaxMs,Math.floor(PIN_TIMING.sweepMaxMs / pinsAnimated));
}
function jamIndexFor(lastSubmit,pinCount) {
if (lastSubmit.of === null) return 0;
return lastSubmit.test === null ? pinCount - 1 :lastSubmit.test - 1;
}
function pinState(index,jamIndex) {
if (index < jamIndex) return 'pass';
return index === jamIndex ? 'jam' :'idle';
}
function sweepPins(pinCount,jamIndex,stepMs) {
const pins = [];
for (let index = 0;index < pinCount;index += 1) {
pins.push({ state:pinState(index,jamIndex),atMs:index * stepMs });
}
return pins;
}
function acceptedPlan(pinCount,stepMs) {
const shackleAtMs = pinCount * stepMs + PIN_TIMING.shackleMs;
return {
pins:sweepPins(pinCount,pinCount,stepMs),jamIndex:null,shackleAtMs,
durationMs:shackleAtMs + PIN_TIMING.revealHoldMs,stepMs,
};
}
function jamPlan(pinCount,jamIndex,stepMs) {
const jamAtMs = jamIndex * stepMs;
return {
pins:sweepPins(pinCount,jamIndex,stepMs),jamIndex,shackleAtMs:null,
durationMs:jamAtMs + PIN_TIMING.jamHoldMs,stepMs,
};
}
function withReducedMotion(plan) {
const pins = plan.pins.map((pin) => ({ ...pin,atMs:0 }));
const shackleAtMs = plan.shackleAtMs === null ? null :0;
return { ...plan,pins,shackleAtMs,stepMs:0,durationMs:PIN_TIMING.reducedHoldMs };
}
function pinPlan(lastSubmit,options) {
const accepted = lastSubmit.verdict === VERDICT_WORDS.P;
const jamIndex = accepted ? null :jamIndexFor(lastSubmit,options.pinCount);
const pinsAnimated = accepted ? options.pinCount :jamIndex + 1;
const stepMs = stepMsFor(pinsAnimated);
const plan = accepted ? acceptedPlan(options.pinCount,stepMs) :jamPlan(options.pinCount,jamIndex,stepMs);
return options.reducedMotion ? withReducedMotion(plan) :plan;
}
function syntaxErrorProbePlan(options) {
const durationMs = options.reducedMotion ? PIN_TIMING.reducedHoldMs :PIN_TIMING.probeStepMs;
return { packets:[{ pass:false,atMs:0 }],durationMs };
}
function probePlan(lastRun,options) {
if (lastRun.ok === false) return syntaxErrorProbePlan(options);
const step = options.reducedMotion ? 0 :PIN_TIMING.probeStepMs;
const packets = lastRun.examples.map((example,index) => ({ pass:example.pass,atMs:index * step }));
const durationMs = options.reducedMotion ? PIN_TIMING.reducedHoldMs :packets.length * step;
return { packets,durationMs };
}

export { PIN_TIMING, pinPlan, probePlan };
