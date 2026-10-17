import { uiEl } from './dom.js';


const HINT_SPEAKER = 'GHOSTWRITER';

function uiRoomHintTake(app, session, rigId) {
  if (!Object.hasOwn(session, 'hint')) {
    const mine = app.roomHint && app.roomHint.rigId === rigId;
    session.hint = mine ? app.roomHint.text : null;
    if (mine) app.roomHint = null;
  }
  return session.hint;
}

function uiRoomHintNode(app, session, rigId) {
  const text = uiRoomHintTake(app, session, rigId);
  if (!text) return null;
  const who = uiEl('span', { className: 'arena-ghost-who', text: HINT_SPEAKER });
  return uiEl('p', { className: 'arena-ghost', children: [who, ' ', text] });
}

const HOST_SESSION = { context: 'lab', forge: 'forge', stream: 'stream' };

function uiRoomHintInto(app, rigId, section) {
  const node = uiRoomHintNode(app, app[HOST_SESSION[rigId]], rigId);
  if (node) section.insertBefore(node, section.children[1] ?? null);
  return section;
}

export { uiRoomHintTake, uiRoomHintNode, uiRoomHintInto };
