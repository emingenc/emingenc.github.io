import { EXAMPLE_KIND } from '../judge/counts.js';
import { PIN_TIMING } from '../game/pins.js';
import { uiEl } from './dom.js';
import { uiVerdictHeld } from './render-submit-panel.js';

const UI_LOCK_LOOKS = { probe:'probe',fail:'jam',traced:'jam',accepted:'open' };
const UI_LOCK_WORDS = { idle:'LOCKED',jam:'JAMMED',open:'OPEN' };
const UI_PIN_STATES = { pass:' breach-pin-set',jam:' breach-pin-jam',idle:'' };

function uiAtMs(node,atMs,lock) {
node.style.animationDelay = (atMs - lock.elapsed) + 'ms';
return node;
}
function uiExampleIndices(cases) {
return cases.map(function (testCase,index) { return testCase.kind === EXAMPLE_KIND ? index :-1; })
.filter(function (index) { return index !== -1; });
}
function uiLockModel(app) {
const breach = app.game.breach;
const anim = breach.anim;
return {
anim,pinCount:breach.pinCount,look:anim ? UI_LOCK_LOOKS[anim.kind] :'idle',held:uiVerdictHeld(app),
elapsed:anim ? Math.round(performance.now() - anim.startedAt) :0,
examples:uiExampleIndices(app.game.catalog.problemByKey.get(breach.key).cases),
};
}
function uiPinClass(lock,index) {
let className = 'breach-pin';
if (lock.examples.indexOf(index) !== -1) className += ' breach-pin-example';
if (index === lock.pinCount - 1) className += ' breach-pin-max';
return className;
}
function uiSweepPin(lock,index) {
const pin = lock.anim.plan.pins[index];
const node = uiEl('span',{ className:uiPinClass(lock,index) + UI_PIN_STATES[pin.state] });
return pin.state === 'idle' ? node :uiAtMs(node,pin.atMs,lock);
}
function uiPacket(packet,lock) {
return uiAtMs(uiEl('span',{ className:'breach-packet' + (packet.pass ? '' :' breach-packet-fail') }),packet.atMs,lock);
}
function uiProbePin(lock,index) {
const packet = lock.anim.plan.packets[lock.examples.indexOf(index)];
if (!packet) return uiEl('span',{ className:uiPinClass(lock,index) });
const node = uiEl('span',{
className:uiPinClass(lock,index) + (packet.pass ? ' breach-pin-pass' :' breach-pin-fail'),
children:[uiPacket(packet,lock)],
});
return uiAtMs(node,packet.atMs + PIN_TIMING.probeStepMs,lock);
}
function uiPin(lock,index) {
if (lock.look === 'probe') return uiProbePin(lock,index);
return lock.anim ? uiSweepPin(lock,index) :uiEl('span',{ className:uiPinClass(lock,index) });
}
function uiPinRow(lock) {
const pins = [];
for (let index = 0;index < lock.pinCount;index += 1) pins.push(uiPin(lock,index));
return uiEl('div',{ className:'breach-lock-pins',children:pins });
}
function uiJamAtMs(plan) {
return plan.pins[plan.jamIndex].atMs;
}
function uiVerdictAtMs(lock) {
const plan = lock.anim.plan;
if (lock.look === 'probe') return plan.durationMs;
return lock.look === 'open' ? plan.shackleAtMs :uiJamAtMs(plan);
}
function uiShackle(lock) {
const shackle = uiEl('span',{ className:'breach-lock-shackle' });
return lock.look === 'open' ? uiAtMs(shackle,lock.anim.plan.shackleAtMs,lock) :shackle;
}
function uiPadlock(lock) {
const lockCase = uiEl('div',{ className:'breach-lock-case',children:[uiEl('span',{ className:'breach-lock-keyhole' }),uiPinRow(lock)] });
const body = uiEl('div',{ className:'breach-lock-body',children:[uiShackle(lock),lockCase] });
return lock.look === 'jam' || lock.look === 'open' ? uiAtMs(body,uiVerdictAtMs(lock),lock) :body;
}
function uiPinsSet(lock) {
if (!lock.anim || lock.look === 'probe') return 0;
return lock.anim.plan.pins.filter(function (pin) { return pin.state === 'pass'; }).length;
}
function uiProbePassed(lock) {
return lock.anim.plan.packets.filter(function (packet) { return packet.pass; }).length;
}
function uiLockWord(lock) {
return lock.look === 'probe' ? 'PROBE ' + uiProbePassed(lock) + '/' + lock.examples.length :UI_LOCK_WORDS[lock.look];
}
function uiLockCaption(lock,set) {
const caption = uiEl('div',{
className:'breach-lock-caption',
children:[
uiEl('span',{ className:'breach-pins',text:'PINS ' + set + '/' + lock.pinCount }),
uiEl('span',{ className:'breach-lock-word',text:uiLockWord(lock) }),
],
});
return lock.anim ? uiAtMs(caption,uiVerdictAtMs(lock),lock) :caption;
}
function uiJamText(lock) {
const jamIndex = lock.anim.plan.jamIndex;
return jamIndex === lock.pinCount - 1 ? 'jammed at the max test pin' :'jammed at pin ' + (jamIndex + 1);
}
function uiLockLabel(lock,set) {
if (lock.held) return 'Lock, ' + lock.pinCount + ' pins, breaching';
const pins = 'Lock, ' + set + ' of ' + lock.pinCount + ' pins set, ';
if (lock.look === 'probe') return pins + 'PROBE: ' + uiProbePassed(lock) + ' of ' + lock.examples.length + ' examples pass';
return pins + (lock.look === 'jam' ? uiJamText(lock) :UI_LOCK_WORDS[lock.look].toLowerCase());
}
function uiLockTimings(root,lock) {
root.style.setProperty('--probe-step',PIN_TIMING.probeStepMs + 'ms');
root.style.setProperty('--jam-hold',PIN_TIMING.jamHoldMs + 'ms');
if (lock.anim && lock.anim.plan.pins) root.style.setProperty('--pin-step',lock.anim.plan.stepMs + 'ms');
}
function uiBreachLock(app) {
const lock = uiLockModel(app);
const set = uiPinsSet(lock);
const root = uiEl('div',{
className:'breach-lock breach-lock-' + lock.look + (app.judging ? ' breach-lock-busy' :''),
attrs:{ role:'img','aria-label':uiLockLabel(lock,set) },
children:[uiPadlock(lock),uiLockCaption(lock,set)],
});
uiLockTimings(root,lock);
return root;
}

export { uiBreachLock };
