import { markBeatsSeen } from '../game/save.js';
import { TURRET_LAB_ID, rigMeeting } from '../game/story/story.js';
import { uiCommitSave } from './game-state.js';
import { uiLinkStyle } from './lazy-style.js';


const HINT_SHEET = 'styles/rooms/ghost.css';

async function uiRoomMeeting(app, rig, labId) {
  const machine = labId === TURRET_LAB_ID ? undefined : await import('../game/story/machine-beats.js');
  const meeting = rigMeeting(rig.id, labId, machine);
  const seen = app.game.save.story;
  const fresh = meeting.show.filter((beat) => !seen.includes(beat.id));
  const unseen = [...meeting.show.map((beat) => beat.id), ...meeting.skip].filter((id) => !seen.includes(id));
  if (unseen.length > 0) uiCommitSave(app, markBeatsSeen(app.game.save, unseen));
  app.roomHint = fresh.length > 0 ? { rigId: rig.id, text: fresh.flatMap((beat) => beat.lines.map((line) => line.text)).join(' ') } : null;
  if (app.roomHint) await uiLinkStyle(HINT_SHEET);
}

export { HINT_SHEET, uiRoomMeeting };
