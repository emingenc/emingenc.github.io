import { GAME_EVENT } from '../game/game-events.js';
import { withAssist } from '../game/save-ext.js';
import { uiArenaPayRank, uiArenaRecordWin } from './arena-reward.js';
import { uiArenaClearToast } from './arena-shell.js';
import { uiEmit } from './bus.js';
import { uiCommitExt } from './ext-storage.js';


function uiRoomPlayable(app) {
  const arena = app.rig && app.rig.arena;
  if (!arena || arena.view !== 'play') return false;
  return arena.state.status === 'running' && !app.story && !app.menuOpen;
}

function uiRoomWin(app, arena, win) {
  const { rigId, clearLevel, stars } = win;
  let reward = null;
  if (arena.mode === 'w1') {
    reward = uiArenaRecordWin(app, { rig: arena.rig, levelId: arena.levelId, stars });
    uiArenaPayRank(app, { rig: arena.rig, stars }, reward);
  }
  uiEmit(GAME_EVENT.RIG_CLEAR, { rigId, levelId: clearLevel, stars });
  return { result: { won: true, stars, firstClear: Boolean(reward) && reward.bestBefore === 0 }, reward };
}

function uiRoomCardView(app) {
  const arena = app.rig.arena;
  arena.view = 'card';
  arena.coach = '';
  uiArenaClearToast(app.rig);
  return arena;
}

function uiRoomSetAssist(app, on) {
  uiCommitExt(app, withAssist(app.game.ext, on));
  const arena = app.rig && app.rig.arena;
  if (!arena) return;
  arena.state = Object.assign({}, arena.state, { assist: on });
}

export { uiRoomPlayable, uiRoomWin, uiRoomCardView, uiRoomSetAssist };
