import { ASSIST_PACE,PACE_MAX } from './data/turret-wave1.js';


function paceFor(elapsedMs,ghostMs,assist) {
if (assist) return ASSIST_PACE;
const left = ghostMs > 0 ? Math.min(1,Math.max(0,1 - elapsedMs / ghostMs)) :0;
return ASSIST_PACE + (PACE_MAX - ASSIST_PACE) * left;
}

export { paceFor };
