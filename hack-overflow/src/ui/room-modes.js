
function uiRoomLabCleared(app, room, level) {
  const levels = app.game.save.labs[room];
  return Boolean(levels && levels[level] && levels[level].best > 0);
}

function uiRoomPools(buildW1, w2, w3) {
  return { w1: buildW1, w2: () => w2, w3: () => w3 };
}

export { uiRoomLabCleared, uiRoomPools };
