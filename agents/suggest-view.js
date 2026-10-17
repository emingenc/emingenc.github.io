// suggest-view.js — draws the suggestions (suggestions.js) in the two places
// the page offers them: the dock's chips, each a short label that submits the
// full question, and from 900px also the "ask next" rows under the last answer, a label and a line saying what it shows. Both are buttons
// carrying the question in data-run; agent-ui.js runs it through one
// delegated click handler on each container. Rendered as text; no innerHTML.
import { make, makeButton } from './dom.js';
import { answeredKey, askedKeys, nextSuggestions } from './suggestions.js';

const ROWS_HEADING = 'ask next';

function chipButton(item) {
  const chip = makeButton('chip', item.chip);
  chip.dataset.run = item.run;
  return chip;
}

function rowItem(item) {
  const row = makeButton('an-r');
  row.dataset.run = item.run;
  row.append(make('span', 'an-l', item.label), make('span', 'an-d', item.desc));
  const entry = make('li', 'an-li');
  entry.append(row);
  return entry;
}

// parts: {chips, rows} — the dock's chip row and the ask-next group. Either
// may be missing; its part is then a no-op.
export function createSuggestView({ chips, rows } = {}) {
  return {
    // list: the suggestions to show; empty hides both.
    paint(list) {
      if (chips) {
        chips.replaceChildren(...list.map(chipButton));
        chips.hidden = list.length === 0;
        chips.scrollLeft = 0;
      }
      if (!rows) return;
      const items = make('ul', 'an-list');
      items.append(...list.map(rowItem));
      rows.replaceChildren(make('p', 'an-h', ROWS_HEADING), items);
      rows.hidden = list.length === 0;
    },
    // A turn running makes the rows stale, so they leave until it settles.
    hideRows() {
      if (rows) rows.hidden = true;
    },
  };
}

// What the session has asked, kept beside the store: it holds only the last 30
// messages, so a reload would forget the earlier questions and offer them again.
const ASKED_KEY = 'agent-asked';
const askedMemory = { sid: '', keys: new Set() };

function savedAsked(sid) {
  try {
    const saved = JSON.parse(localStorage.getItem(ASKED_KEY));
    return saved && saved.sid === sid ? saved.keys : [];
  } catch (error) {
    return [];
  }
}

// Adds keys to this session's memory and returns it as a Set.
function rememberAsked(sid, keys) {
  if (askedMemory.sid !== sid) Object.assign(askedMemory, { sid, keys: new Set(savedAsked(sid)) });
  keys.filter(Boolean).forEach((key) => askedMemory.keys.add(key));
  try {
    localStorage.setItem(ASKED_KEY, JSON.stringify({ sid, keys: [...askedMemory.keys] }));
  } catch (error) {
    // private mode or a full store: the suggestions still follow the messages
  }
  return askedMemory.keys;
}

// Draws what to ask next into parts ({chips, rows}). turn: the session's
// messages and id, and the tool that answered last.
export function paintNext(parts, { messages, sid, tool }) {
  const asked = rememberAsked(sid, [...askedKeys(messages), answeredKey(tool)]);
  createSuggestView(parts).paint(nextSuggestions({ asked, tool }));
}
