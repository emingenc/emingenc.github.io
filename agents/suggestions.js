// suggestions.js — what the page offers to ask next. A pure list of the
// questions worth asking about Emin and the choice of which to show: those
// the visitor has not asked yet, the ones that follow from the tool that just
// answered first, at most five. src/data/chips.mjs derives the build-time
// chips from it, agent-ui.js repaints the chips and the "ask next" rows from
// it after every turn, and suggest-view.js draws them. No DOM here.
//
// chip: the phone label (at most 14 characters), run: the full question the
// chip submits, label and desc: the desktop "ask next" row. Every run is a
// phrasing that reaches a card or an authored answer: tests/suggestions.test.mjs
// plays each one through the real agent.

export const AUTO_QUESTION = 'What does Emin do at Cresta?';
export const MAX_SHOWN = 5;
export const MAX_CHIP_CHARS = 14;

export const SUGGESTIONS = Object.freeze([
  { key: 'experience', chip: 'at Cresta', run: 'What did Emin build at Cresta?', same: [AUTO_QUESTION], label: 'what did he build at Cresta?', desc: 'production AI agents for Fortune 500 companies, with receipts' },
  { key: 'hire', chip: 'reach him', run: 'Is Emin available, and how do I reach him?', same: [], label: 'is he available?', desc: 'how to reach him, and what he is open to' },
  { key: 'results', chip: 'his results', run: 'What results has Emin delivered?', same: [], label: 'what results has he delivered?', desc: 'measured results from his earlier jobs' },
  { key: 'glasses', chip: 'smart glasses', run: 'Show me the smart glasses projects', same: [], label: 'his smart-glasses projects', desc: 'the G1 SDK and the code around it' },
  { key: 'how', chip: 'how it works', run: 'How does this work?', same: [], label: 'how does this agent work?', desc: 'a question matcher and a few files, all in this tab' },
  { key: 'game', chip: 'play the game', run: '/game', same: [], label: 'play the game', desc: 'HACK://OVERFLOW opens inside the page' },
  { key: 'repos', chip: 'open source', run: 'Show me his open-source repos', same: [], label: 'his open-source repos', desc: 'repos with stars, language and source rows' },
  { key: 'stack', chip: 'tech stack', run: 'What is his tech stack?', same: [], label: 'what is his tech stack?', desc: 'languages, frameworks and tools he uses' },
  { key: 'writing', chip: 'his writing', run: 'What does he write about?', same: [], label: 'what does he write about?', desc: 'his blog posts on AI engineering' },
]);

// After a tool answered, these come first: where a visitor who just saw it
// goes next. A tool not listed keeps the default order.
// The suggestion a tool's answer already gave, so a question typed in other
// words does not come back as an offer.
const ANSWERED = Object.freeze({ skills: 'stack', g1: 'glasses', contact: 'hire', repos: 'repos', blog: 'writing', game: 'game' });

const FOLLOWS = Object.freeze({
  repos: ['stack', 'writing', 'hire'],
  g1: ['repos', 'stack', 'hire'],
  skills: ['repos', 'results', 'hire'],
  contact: ['experience', 'results', 'glasses'],
  faq: ['experience', 'results', 'repos'],
  blog: ['repos', 'hire', 'experience'],
  game: ['hire', 'results', 'experience'],
});

const normalize = (text) => String(text || '').trim().toLowerCase().replace(/[\s?!.]+$/, '');

// The keys of the suggestions the visitor has already asked, from the
// session's messages: a question that is a suggestion's run (or its auto-run
// twin) counts, however it got there.
export function askedKeys(messages) {
  const texts = new Set((messages || []).filter((message) => message.role === 'user').map((message) => normalize(message.content)));
  const wasAsked = (item) => [item.run, ...item.same].some((phrase) => texts.has(normalize(phrase)));
  return new Set(SUGGESTIONS.filter(wasAsked).map((item) => item.key));
}

// The key of the suggestion `tool`'s answer covered, or ''.
export const answeredKey = (tool) => ANSWERED[tool] || '';

// The suggestions to show now: not asked yet, those that follow from `tool`
// (the one that answered last) first. asked is a Set of keys.
export function nextSuggestions({ asked = new Set(), tool = '', limit = MAX_SHOWN } = {}) {
  const first = FOLLOWS[tool] || [];
  const rank = (item) => {
    const index = first.indexOf(item.key);
    return index === -1 ? first.length + SUGGESTIONS.indexOf(item) : index;
  };
  return SUGGESTIONS.filter((item) => !asked.has(item.key)).sort((left, right) => rank(left) - rank(right)).slice(0, limit);
}
