import { bestIn } from '../game/ext-best.js';
import { W3_STREAMS } from '../game/rooms/data/beam-w3-pool.js';
import { uiRoomLabCleared,uiRoomModeOpen } from './room-modes.js';


const LAB_ID = 'beam';
const LAB_LEVEL = 'beam-1';
const BEAM_MODES = ['w1','w2','w3'];

function uiBeamCleared(app) {
return uiRoomLabCleared(app,LAB_ID,LAB_LEVEL);
}
function uiBeamWaveCleared(app,mode) {
if (mode === 'w1') return uiBeamCleared(app);
return bestIn(app.game.ext,LAB_ID,mode).stars > 0;
}
function uiBeamUnlocked(app,mode) {
return uiRoomModeOpen(mode,(wave) => uiBeamWaveCleared(app,wave));
}
function uiBeamFirstMode(app) {
return BEAM_MODES.filter((mode) => uiBeamUnlocked(app,mode)).pop();
}
function uiBeamOtherModes(app,mode) {
return BEAM_MODES.filter((id) => id !== mode && uiBeamUnlocked(app,id));
}
function uiBeamRunFor(start,next = Math.random) {
if (start.mode !== 'w3') return { options:{},index:null };
const choices = W3_STREAMS.map((unused,index) => index).filter((index) => index !== start.lastIndex);
const index = choices[Math.floor(next() * choices.length)];
return { options:{ stream:W3_STREAMS[index] },index };
}

export { BEAM_MODES,uiBeamCleared,uiBeamUnlocked,uiBeamFirstMode,uiBeamOtherModes,uiBeamRunFor };
