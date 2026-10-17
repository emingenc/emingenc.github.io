
function uiRoomLabCleared(app, room, level) {
  const levels = app.game.save.labs[room];
  return Boolean(levels && levels[level] && levels[level].best > 0);
}

const ROOM_OPENED_BY = { w1: null, w2: 'w1', w3: 'w2' };

function uiRoomModeOpen(mode, waveCleared) {
  if (!Object.hasOwn(ROOM_OPENED_BY, mode)) return false;
  return ROOM_OPENED_BY[mode] === null || waveCleared(ROOM_OPENED_BY[mode]);
}

function uiRoomPools(buildW1, w2, w3) {
  return { w1: buildW1, w2: () => w2, w3: () => w3 };
}

export { uiRoomLabCleared, uiRoomModeOpen, uiRoomPools };
