import { NET_MODES } from '../game/rooms/data/net-waves.js';
import { createNet } from '../game/rooms/net.js';
import { buildPool, pickStream } from '../game/rooms/net-stream.js';


const LAB_ID = 'net';
const LAB_LEVEL = 'net-1';
const FIRST_MODE = NET_MODES[0];

function uiNetCleared(app) {
  const labs = app.game.save.labs;
  return Boolean(labs[LAB_ID] && labs[LAB_ID][LAB_LEVEL] && labs[LAB_ID][LAB_LEVEL].best > 0);
}
function uiNetFirstMode() {
  return FIRST_MODE;
}
function uiNetOtherModes(app, mode) {
  return uiNetCleared(app) ? NET_MODES.filter((id) => id !== mode) : [];
}
function uiNetModeOpen(app, mode) {
  return mode === FIRST_MODE || (NET_MODES.includes(mode) && uiNetCleared(app));
}
function uiNetRunFor(app, start) {
  const mode = uiNetModeOpen(app, start.mode) ? start.mode : FIRST_MODE;
  const picked = pickStream(buildPool(mode), start.lastIndex, Math.random);
  return { state: createNet(picked.stream, { wave: mode }), index: picked.index, mode };
}

export { uiNetCleared, uiNetFirstMode, uiNetOtherModes, uiNetRunFor };
