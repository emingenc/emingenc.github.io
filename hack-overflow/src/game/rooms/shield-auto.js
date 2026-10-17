import { END_GLYPH } from './data/shield-wave1.js';
import { W1_SPEC } from './data/shield-waves.js';
import { answerFor,applyShield,createShield,glyphOf,isOpener } from './shield.js';


function autoMove(state) {
if (state.status !== 'running') return '';
if (state.spec.towers) return towersAuto(state);
const glyph = glyphOf(state);
if (isOpener(glyph)) return 'push';
return glyph === END_GLYPH && state.stack.length === 0 ? 'clear' :'';
}
function towersAuto(state) {
const top = state.stack[state.stack.length - 1];
if (top === undefined) return 'push';
const volley = state.wave[state.vi];
return Number(volley[top]) > Number(volley[state.gi]) ? 'push' :'';
}
function shieldCallRun(wave,spec = W1_SPEC) {
let state = createShield(wave,{ spec });
let calls = 0;
while (state.status === 'running') {
const forced = autoMove(state);
if (!forced) calls += 1;
state = applyShield(state,forced || answerFor(state));
}
return { state,calls };
}
function shieldCallPar(wave,spec = W1_SPEC) {
return shieldCallRun(wave,spec).calls;
}

export { autoMove,shieldCallPar,shieldCallRun };
