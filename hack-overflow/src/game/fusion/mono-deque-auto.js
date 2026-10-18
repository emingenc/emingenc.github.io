import { MONO_DEQUE } from './mono-deque.js';

function monoDequeAutoReady(run) {
return run.shots.length >= 1;
}
function frontLeft(run,puzzle) {
return run.deque.length > 0 && run.deque[0] <= run.t - puzzle.k;
}
function monoDequeForcedMove(run,puzzle = MONO_DEQUE) {
if (run.status !== 'running') return null;
if (run.pushed) return 'shoot';
if (frontLeft(run,puzzle)) return 'expire';
return run.deque.length === 0 ? 'push' :null;
}

export { monoDequeAutoReady,monoDequeForcedMove };
