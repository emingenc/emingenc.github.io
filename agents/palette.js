// Pure command-palette data + ranking. No DOM, no window globals here —
// palette-view.js wires this into the actual menu markup.
//
// COMMANDS mirrors tools.js tool_help: same groups, order and descriptions
// for the 20 commands it prints. tool_help never lists itself, so 'help'
// goes last in 'discover' as 'list every command'.

export const GROUPS = ['discover', 'your machine', 'fun', 'session', 'files'];

export const COMMANDS = [
  { kind: 'cmd', name: 'about', group: 'discover', desc: 'who is Emin?', destructive: false },
  { kind: 'cmd', name: 'repos', group: 'discover', desc: 'open source projects', destructive: false },
  { kind: 'cmd', name: 'contact', group: 'discover', desc: 'get in touch', destructive: false },
  { kind: 'cmd', name: 'skills', group: 'discover', desc: 'tech stack', destructive: false },
  { kind: 'cmd', name: 'blog', group: 'discover', desc: 'writing & posts', destructive: false },
  { kind: 'cmd', name: 'g1', group: 'discover', desc: 'G1 smart glasses (Even Realities)', destructive: false },
  { kind: 'cmd', name: 'game', group: 'discover', desc: 'play deployed games (pick one)', destructive: false },
  { kind: 'cmd', name: 'ask', group: 'discover', desc: 'pick a topic to explore', destructive: false },
  { kind: 'cmd', name: 'help', group: 'discover', desc: 'list every command', destructive: false },
  { kind: 'cmd', name: 'device', group: 'your machine', desc: 'hardware fingerprint', destructive: false },
  { kind: 'cmd', name: 'screen', group: 'your machine', desc: 'display specs', destructive: false },
  { kind: 'cmd', name: 'network', group: 'your machine', desc: 'connection speed', destructive: false },
  { kind: 'cmd', name: 'time', group: 'your machine', desc: 'clock & timezone', destructive: false },
  { kind: 'cmd', name: 'status', group: 'your machine', desc: 'everything at a glance', destructive: false },
  { kind: 'cmd', name: 'lucky', group: 'fun', desc: 'random fact about this site', destructive: false },
  { kind: 'cmd', name: 'session', group: 'session', desc: 'uptime & stats', destructive: false },
  { kind: 'cmd', name: 'new', group: 'session', desc: 'new session', destructive: false },
  { kind: 'cmd', name: 'sessions', group: 'session', desc: 'saved history', destructive: false },
  { kind: 'cmd', name: 'resume', group: 'session', desc: 'reopen a saved session', destructive: false },
  { kind: 'cmd', name: 'forget', group: 'session', desc: 'clear all data (confirm)', destructive: true },
  { kind: 'cmd', name: 'clear', group: 'session', desc: 'reset transcript', destructive: true }
];

const DESTRUCTIVE_NAMES = new Set(COMMANDS.filter((entry) => entry.destructive).map((entry) => entry.name));
const KIND_ORDER = { cmd: 0, file: 1 };
const RANK_EXACT = 0;
const RANK_PREFIX = 1;
const RANK_SUBSTRING = 2;
const RANK_FUZZY = 3;
const RANK_NONE = -1;

// trim, lowercase, strip a leading '/' — the shape every query and every
// ranked name is compared in.
export function normalize(query) {
  return String(query || '').trim().toLowerCase().replace(/^\//, '');
}

function isFuzzySubsequence(name, query) {
  let queryIndex = 0;
  for (let charIndex = 0; charIndex < name.length && queryIndex < query.length; charIndex += 1) {
    if (name[charIndex] === query[queryIndex]) queryIndex += 1;
  }
  return queryIndex === query.length;
}

// exact 0 · prefix 1 · destructive names stop here · substring 2 · fuzzy
// subsequence 3 · else -1. A file's `name` is its filename ("work.md"), so a
// query like "work" already ranks it via the same prefix check.
export function rank(name, query) {
  if (!query) return RANK_EXACT;
  if (name === query) return RANK_EXACT;
  if (name.indexOf(query) === 0) return RANK_PREFIX;
  if (DESTRUCTIVE_NAMES.has(name)) return RANK_NONE;
  if (name.indexOf(query) !== -1) return RANK_SUBSTRING;
  return isFuzzySubsequence(name, query) ? RANK_FUZZY : RANK_NONE;
}

export function filterEntries(entries, query) {
  const normalized = normalize(query);
  return entries
    .map((entry) => ({ entry, tier: rank(entry.name, normalized) }))
    .filter((row) => row.tier >= 0)
    .sort((rowA, rowB) => (rowA.tier - rowB.tier) || (KIND_ORDER[rowA.entry.kind] - KIND_ORDER[rowB.entry.kind]))
    .map((row) => row.entry);
}

function isBlockedDestructive(entry) {
  return entry.kind === 'cmd' && entry.destructive;
}

// First non-destructive row. If every row left is a blocked destructive
// command, an exact typed match selects itself; otherwise the top row still
// gets the default so a non-empty list never has an invalid selection.
export function defaultIndex(list, query) {
  const openRow = list.findIndex((entry) => !isBlockedDestructive(entry));
  if (openRow !== -1) return openRow;
  const typed = normalize(query);
  const exactRow = list.findIndex((entry) => entry.name === typed);
  if (exactRow !== -1) return exactRow;
  return list.length ? 0 : -1;
}

export function canRunOnEnter(entry, query) {
  if (!isBlockedDestructive(entry)) return true;
  return normalize(query) === entry.name;
}

export function destructiveHint(entry) {
  return `Type /${entry.name} in full to run it`;
}

export function completionFor(entry) {
  return entry.kind === 'cmd' ? `/${entry.name} ` : entry.name;
}
