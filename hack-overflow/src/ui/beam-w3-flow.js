import { GAME_EVENT } from '../game/game-events.js';
import { rotatedEnds } from '../game/rooms/beam-rotated.js';


function uiBeamW3Values(state) {
const ends = rotatedEnds(state);
const probe = state.pending ? { cell:state.pending.cell,value:state.pending.value } :{};
return { al:ends.lo,ah:ends.hi,t:state.stream.target,...probe };
}
function uiBeamW3Toast(last) {
if (last.kind === 'keep') return { text:last.toast,kind:last.wrong ? 'bad' :'good' };
return { text:last.toast,kind:last.slip ? 'bad' :'info' };
}
function uiBeamW3Cue(state) {
const last = state.last;
if (last.kind === 'keep' && last.wrong) return { type:GAME_EVENT.RIG_BAD,detail:{ reason:'decoy' } };
if (last.kind === 'shot' && last.slip) return { type:GAME_EVENT.RIG_BAD,detail:{ reason:'slip' } };
if (last.kind === 'keep' || last.hit) return { type:GAME_EVENT.RIG_GOOD,detail:{ chain:state.combo } };
return null;
}

export { uiBeamW3Values,uiBeamW3Toast,uiBeamW3Cue };
