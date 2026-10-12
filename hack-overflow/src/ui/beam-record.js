import { bestGain,bestIn,withBest } from '../game/ext-best.js';
import { beamBudget,beamStars } from '../game/rooms/beam.js';
import { uiCommitExt } from './ext-storage.js';


const ROOM = 'beam';

function uiBeamRunScore(state) {
return { score:state.score,combo:state.maxCombo,stars:beamStars(state),drones:beamBudget(state.wave) - state.probes };
}
function uiBeamRecordBest(app,arena) {
const where = { room:ROOM,mode:arena.mode };
const ext = app.game.ext;
if (arena.state.status !== 'won') return { best:bestIn(ext,ROOM,arena.mode),scoreImproved:false,starsImproved:false };
const run = uiBeamRunScore(arena.state);
const gain = bestGain(ext,where,run);
uiCommitExt(app,withBest(ext,where,run));
return { best:bestIn(app.game.ext,ROOM,arena.mode),scoreImproved:gain.score,starsImproved:gain.stars };
}

export { uiBeamRecordBest };
