import { rigOf } from '../game/rig-catalog.js';
import {
  ARENA_FOCUS_KEY, uiArenaCoach, uiArenaHeader, uiArenaLeave, uiArenaLeaveTooSoon, uiArenaOpen, uiArenaRule, uiArenaToastNode,
} from './arena-shell.js';
import { uiEl } from './dom.js';
import { uiLinkStyles } from './lazy-style.js';


function uiRoomShell(app, arena, parts) {
  const { rigId, title, fullTitle, body } = parts;
  const view = { hearts: arena.state.integrity, score: arena.state.score, title, assist: app.game.ext.assist };
  const header = uiArenaHeader(app, view);
  if (fullTitle) {
    const label = header.children[1].children[1];
    label.setAttribute('aria-label', fullTitle);
    label.setAttribute('title', fullTitle);
  }
  return uiEl('section', {
    className: 'screen rig-screen arena-screen ' + rigId + '-screen' + (arena.view === 'card' ? ' is-card' : ''),
    attrs: { 'data-screen': 'rig', 'data-rig': rigId, tabindex: '-1', 'data-focus-key': ARENA_FOCUS_KEY },
    children: [header, uiArenaToastNode(app), ...body],
  });
}

function uiRoomOpen(app, rigId, create) {
  const rig = rigOf(rigId);
  if (!rig) throw new Error('unknown rig: ' + rigId);
  uiArenaOpen(app, { rigId, create: (opened) => create(opened, rig) });
}

function uiRoomReady(sheets) {
  return uiLinkStyles(sheets);
}

function uiRoomHead(rule, coach) {
  return [uiArenaRule(rule), uiArenaCoach(coach)];
}

function uiRoomLeave(app, release) {
  if (uiArenaLeaveTooSoon(app)) return false;
  release();
  uiArenaLeave(app, null);
  return true;
}

function uiRoomEmpty() {
  return uiEl('section', { className: 'screen rig-screen', attrs: { 'data-screen': 'rig' } });
}

export { uiRoomEmpty, uiRoomShell, uiRoomOpen, uiRoomReady, uiRoomHead, uiRoomLeave };
