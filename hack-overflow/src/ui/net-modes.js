import { NET_MODES } from '../game/rooms/data/net-waves.js';
import { createNet } from '../game/rooms/net.js';
import { buildPool, pickStream } from '../game/rooms/net-stream.js';
import { uiNetHasBest } from './net-record.js';
import { uiRoomLabCleared, uiRoomModeOpen } from './room-modes.js';


const LAB_ID = 'net';
const LAB_LEVEL = 'net-1';
const FIRST_MODE = NET_MODES[0];

function uiNetCleared(app) {
  return uiRoomLabCleared(app, LAB_ID, LAB_LEVEL);
}
function uiNetWaveCleared(app, mode) {
  return mode === FIRST_MODE ? uiNetCleared(app) : uiNetHasBest(app, mode);
}
function uiNetModeOpen(app, mode) {
  return uiRoomModeOpen(mode, (wave) => uiNetWaveCleared(app, wave));
}
function uiNetFirstMode() {
  return FIRST_MODE;
}
function uiNetOtherModes(app, mode) {
  return NET_MODES.filter((id) => id !== mode && uiNetModeOpen(app, id));
}
function uiNetRunFor(app, start) {
  const mode = uiNetModeOpen(app, start.mode) ? start.mode : FIRST_MODE;
  const picked = pickStream(buildPool(mode), start.lastIndex, Math.random);
  return { state: createNet(picked.stream, { wave: mode }), index: picked.index, mode };
}

export { uiNetCleared, uiNetFirstMode, uiNetOtherModes, uiNetRunFor };
