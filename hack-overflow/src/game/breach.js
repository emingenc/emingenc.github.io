import { GAME_EVENT } from './game-events.js';
import { pinPlan, probePlan } from './pins.js';
import { traceAfterSubmit } from './trace.js';
import { VERDICT_WORDS } from '../logic/index.js';

const STAR_CAP_WITH_EXPLOIT = 2;
const BREACH_OUTCOME = { NONE:'none',PROBE:'probe',FAIL:'fail',TRACED:'traced',ACCEPTED:'accepted' };
const CHIP_ACTION = /^chip-(\d+)$/;
const LINE_REMOVE_ACTION = /^line-remove-\d+$/;

function actionKind(actionId) {
if (CHIP_ACTION.test(actionId)) return 'chip';
if (actionId === 'backspace' || LINE_REMOVE_ACTION.test(actionId)) return 'remove';
if (actionId === 'clear' || actionId === 'run' || actionId === 'submit') return actionId;
return 'other';
}
function atEvent(type,payload) {
return { type,payload,atMs:0 };
}
function noneResult(trace) {
return { trace,outcome:BREACH_OUTCOME.NONE,stars:null,plan:null,events:[] };
}
function chipAddResult(after,actionId,trace) {
const position = Number(CHIP_ACTION.exec(actionId)[1]);
const label = after.lock.tray.labels[position];
return { ...noneResult(trace),events:[atEvent(GAME_EVENT.CHIP_ADD,{ position,label })] };
}
function removeResult(trace) {
return { ...noneResult(trace),events:[atEvent(GAME_EVENT.CHIP_REMOVE,{})] };
}
function clearResult(trace) {
return { ...noneResult(trace),events:[atEvent(GAME_EVENT.LINE_CLEAR,{})] };
}
function probeResult(after,trace,options) {
const { examples } = after.lock.lastRun;
const plan = probePlan(after.lock.lastRun,options);
const passed = examples.filter((example) => example.pass).length;
const payload = { passed,total:examples.length,plan };
return { trace,outcome:BREACH_OUTCOME.PROBE,stars:null,plan,events:[atEvent(GAME_EVENT.PROBE,payload)] };
}
function acceptedResult(after,ctx) {
const plan = pinPlan(after.lock.lastSubmit,{ pinCount:ctx.pinCount,reducedMotion:ctx.reducedMotion });
const rawStars = after.lock.stars;
const exploitUsed = Object.values(ctx.used || {}).some(Boolean);
const stars = exploitUsed ? Math.min(rawStars,STAR_CAP_WITH_EXPLOIT) :rawStars;
const events = [
atEvent(GAME_EVENT.BREACH,{ verdict:after.lock.lastSubmit.verdict,plan }),
{ type:GAME_EVENT.ACCEPTED,payload:{ key:after.lock.key,stars },atMs:plan.shackleAtMs },
];
return { trace:ctx.trace,outcome:BREACH_OUTCOME.ACCEPTED,stars,plan,events };
}
function failResult(after,ctx) {
const plan = pinPlan(after.lock.lastSubmit,{ pinCount:ctx.pinCount,reducedMotion:ctx.reducedMotion });
const { trace,traced } = traceAfterSubmit(ctx.trace,after.lock.lastSubmit.verdict);
const jamAtMs = plan.pins[plan.jamIndex].atMs;
const events = [
atEvent(GAME_EVENT.BREACH,{ verdict:after.lock.lastSubmit.verdict,plan }),
{ type:GAME_EVENT.TRACE,payload:{ filled:trace.filled,capacity:trace.capacity },atMs:jamAtMs },
];
if (traced) events.push({ type:GAME_EVENT.TRACED,payload:{ key:after.lock.key },atMs:plan.durationMs });
return { trace,outcome:traced ? BREACH_OUTCOME.TRACED :BREACH_OUTCOME.FAIL,stars:null,plan,events };
}
function submitResult(after,ctx) {
return after.lock.lastSubmit.verdict === VERDICT_WORDS.P ? acceptedResult(after,ctx) :failResult(after,ctx);
}
function breachStep(change,ctx) {
const kind = actionKind(change.actionId);
if (kind === 'chip') return chipAddResult(change.after,change.actionId,ctx.trace);
if (kind === 'remove') return removeResult(ctx.trace);
if (kind === 'clear') return clearResult(ctx.trace);
if (kind === 'run' && !change.after.lock.lastRun) return noneResult(ctx.trace);
if (kind === 'run') return probeResult(change.after,ctx.trace,{ reducedMotion:ctx.reducedMotion });
if (kind === 'submit' && !change.after.lock.lastSubmit) return noneResult(ctx.trace);
if (kind === 'submit') return submitResult(change.after,ctx);
return noneResult(ctx.trace);
}

export { STAR_CAP_WITH_EXPLOIT, breachStep };
