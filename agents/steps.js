// steps.js — pure step engine for the agent column.
// Parses orchestrator/router trace lines into display rows, tracks one-clock
// run durations, and maps tool results to file/line sources. No DOM, no
// globals: everything here is a plain function over plain data.

export const FILE_NAMES = {
  about: 'about.md',
  work: 'work.md',
  repos: 'repos.json',
  skills: 'skills.md',
  writing: 'writing.md',
  contact: 'contact.md'
};

export const TOOL_FILES = {
  about: ['about.md', 'work.md'],
  repos: ['repos.json'],
  g1: ['repos.json'],
  skills: ['skills.md'],
  contact: ['contact.md'],
  blog: ['writing.md']
};

// ─── Page line map (must agree with index.astro) ──────────────────────────

const ABOUT_FILE_LINES = 5;
const WORK_FILE_LINES = 10;
const SKILLS_FILE_LINES = 4;
const CONTACT_FILE_LINES = 4;
const ABOUT_EDUCATION_LINE = 4;

const CRESTA_LAST_LINE = 5;
const GOODFINTECH_LINE = 6;
const VIVOO_LINE = 7;
const NOVIT_LINE = 8;
const EKALITE_LINE = 9;
const EMDI_LINE = 10;

function range(start, end) {
  const out = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

const ABOUT_OVERVIEW_LINES = range(1, ABOUT_FILE_LINES);
const WORK_HISTORY_LINES = [1].concat(range(GOODFINTECH_LINE, WORK_FILE_LINES));
const WORK_ALL_LINES = range(1, WORK_FILE_LINES);
const CRESTA_LINES = range(1, CRESTA_LAST_LINE);
const SKILLS_ALL_LINES = range(1, SKILLS_FILE_LINES);
const CONTACT_ALL_LINES = range(1, CONTACT_FILE_LINES);

const REPO_LINES = {
  even_glasses: 1,
  telegramGPT: 2,
  G1_voice_ai_assistant: 3,
  g1_flutter_blue_plus: 4,
  visionlink: 5,
  even_glasses_redis_control: 6,
  llm_adaptive_router: 7,
  smart_glass_mcp: 8
};

const DEFAULT_REPO_LINES = [
  REPO_LINES.even_glasses, REPO_LINES.telegramGPT, REPO_LINES.G1_voice_ai_assistant,
  REPO_LINES.g1_flutter_blue_plus, REPO_LINES.visionlink, REPO_LINES.llm_adaptive_router
];

const G1_REPO_LINES = [
  REPO_LINES.even_glasses, REPO_LINES.G1_voice_ai_assistant, REPO_LINES.g1_flutter_blue_plus,
  REPO_LINES.visionlink, REPO_LINES.even_glasses_redis_control, REPO_LINES.smart_glass_mcp
];

// ─── Small generic helpers ─────────────────────────────────────────────────

function startsWith(text, prefix) {
  return text.indexOf(prefix) === 0;
}

// ─── Trace parsing ──────────────────────────────────────────────────────────

const STEP_SEPARATOR = ' → ';
const CHECKING_PREFIX = 'checking';
const GROUNDED_CHAT_PREFIX = 'grounded chat response';
const FOLLOW_UP_PREFIX = 'contextual follow-up';

export function parseStep(text) {
  const idx = text.indexOf(STEP_SEPARATOR);
  if (idx > 0) {
    return { verb: text.slice(0, idx), detail: text.slice(idx + STEP_SEPARATOR.length) };
  }
  return { verb: '', detail: text };
}

export function isStartMarker(step) {
  if (step.verb === 'generate') return true;
  if (step.verb === 'eval') {
    return startsWith(step.detail, CHECKING_PREFIX) || startsWith(step.detail, GROUNDED_CHAT_PREFIX);
  }
  if (step.verb === 'think') return startsWith(step.detail, FOLLOW_UP_PREFIX);
  return false;
}

export function initialPhase(query) {
  return startsWith(query, '/') ? PHASE_PLANNING : PHASE_ROUTING;
}

// ─── Phase labels ────────────────────────────────────────────────────────

const PHASE_PLANNING = 'Planning…';
const PHASE_ROUTING = 'Routing…';
const PHASE_THINKING = 'Thinking…';
const PHASE_CHECKING_RESULT = 'Checking result…';
const PHASE_FINISHING = 'Finishing…';
const PHASE_ANSWERING = 'Answering…';
const PHASE_WRITING = 'Writing…';
const PHASE_CHECKING_ANSWER = 'Checking the answer…';
const PHASE_CHECKING_GROUNDING = 'Checking grounding…';
const PHASE_WORKING = 'Working…';

const VERB_PHASE = {
  align: PHASE_PLANNING,
  classify: PHASE_PLANNING,
  plan: PHASE_THINKING,
  act: PHASE_CHECKING_RESULT,
  observe: PHASE_CHECKING_RESULT,
  recover: PHASE_THINKING,
  replan: PHASE_THINKING,
  sink: PHASE_ANSWERING,
  summary: PHASE_FINISHING,
  stop: PHASE_FINISHING
};

const NEXT_TOOL_MARKER = 'next: ';

function nextToolFrom(detail) {
  const idx = detail.indexOf(NEXT_TOOL_MARKER);
  return idx === -1 ? '' : detail.slice(idx + NEXT_TOOL_MARKER.length).trim();
}

function thinkPhase(detail) {
  const tool = nextToolFrom(detail);
  if (!tool) return PHASE_WORKING;
  const files = TOOL_FILES[tool];
  return files ? `Reading ${files[0]}…` : `Running ${tool}()…`;
}

function evalPhase(detail) {
  if (detail.indexOf('pass') !== -1 || detail.indexOf('replan') !== -1) return PHASE_FINISHING;
  return PHASE_WORKING;
}

function markerPhase(step) {
  if (step.verb === 'generate' || step.verb === 'think') return PHASE_WRITING;
  if (startsWith(step.detail, CHECKING_PREFIX)) return PHASE_CHECKING_ANSWER;
  return PHASE_CHECKING_GROUNDING;
}

function verbPhase(step) {
  const { verb, detail } = step;
  if (verb === 'think') return thinkPhase(detail);
  if (verb === 'eval') return evalPhase(detail);
  return VERB_PHASE[verb] || PHASE_WORKING;
}

export function phaseAfter(step) {
  return isStartMarker(step) ? markerPhase(step) : verbPhase(step);
}

function isPlanningPhase(phase) {
  return phase === PHASE_PLANNING || phase === PHASE_ROUTING;
}

function isActPhase(phase) {
  return startsWith(phase, 'Reading') || startsWith(phase, 'Running');
}

function phaseVerb(phase) {
  if (phase === PHASE_WRITING) return 'generate';
  if (startsWith(phase, 'Checking')) return 'eval';
  if (isPlanningPhase(phase)) return 'plan';
  if (isActPhase(phase)) return 'act';
  return 'think';
}

// ─── Run lifecycle ──────────────────────────────────────────────────────

export function createRun(query, startMs) {
  return {
    query,
    startMs,
    lastAt: startMs,
    rows: [],
    phase: initialPhase(query),
    endAt: null,
    status: 'running'
  };
}

const ERROR_MARK = '✗';
const ERROR_DETAIL_PREFIX = 'error';
const ERROR_SPLIT = ' ✗ ';
// "classify → error · …" and "eval → error, stopping turn" carry no cross mark.
const ERROR_PREFIX_VERBS = new Set(['classify', 'eval']);

function stateFor(step) {
  if (isStartMarker(step)) return 'running';
  if (step.detail.indexOf(ERROR_MARK) !== -1) return 'error';
  if (ERROR_PREFIX_VERBS.has(step.verb) && startsWith(step.detail, ERROR_DETAIL_PREFIX)) return 'error';
  return 'done';
}

function actRowLabel(detail) {
  const parts = detail.split(ERROR_SPLIT);
  if (parts.length === 2) return `${parts[0]}() ✗ ${parts[1]}`;
  return `${detail.replace(/ ✓$/, '')}()`;
}

function labelFor(step) {
  return step.verb === 'act' ? actRowLabel(step.detail) : step.detail;
}

function buildRow(step, ms) {
  return { verb: step.verb, detail: step.detail, label: labelFor(step), state: stateFor(step), ms };
}

export function addEvent(run, text, atMs) {
  const step = parseStep(text);
  if (!step.verb) return null;
  let interval = atMs - run.lastAt;
  const last = run.rows[run.rows.length - 1];
  if (last && last.state === 'running') {
    last.ms += interval;
    last.state = 'done';
    interval = 0;
  }
  const row = buildRow(step, interval);
  run.rows.push(row);
  run.lastAt = atMs;
  run.phase = phaseAfter(step);
  return row;
}

function isErrorRow(row) {
  return row.state === 'error';
}

export function finishRun(run, atMs) {
  const tail = atMs - run.lastAt;
  const last = run.rows[run.rows.length - 1];
  if (last) {
    last.ms += tail;
    if (last.state === 'running') last.state = 'done';
  }
  run.endAt = atMs;
  run.status = run.rows.some(isErrorRow) ? 'error' : 'passed';
}

export function interruptRun(run, atMs) {
  const tail = atMs - run.lastAt;
  const last = run.rows[run.rows.length - 1];
  if (last && last.state === 'running') {
    last.ms += tail;
    last.state = 'interrupted';
  } else {
    run.rows.push({
      verb: phaseVerb(run.phase), detail: '', label: '',
      state: 'interrupted', ms: tail, synthetic: true
    });
  }
  run.endAt = atMs;
  run.status = 'stopped';
}

export function totalMs(run) {
  const end = run.endAt === null ? run.lastAt : run.endAt;
  return end - run.startMs;
}

export function stepCount(run) {
  return run.rows.filter((row) => row.state !== 'interrupted').length;
}

// ─── Duration + label formatting ───────────────────────────────────────

export function displayDurations(rows) {
  let cum = 0;
  let prevRounded = 0;
  const out = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].state === 'running') {
      out.push('');
      continue;
    }
    cum += rows[i].ms;
    const rounded = Math.round(cum);
    out.push(fmtMs(rounded - prevRounded));
    prevRounded = rounded;
  }
  return out;
}

const MS_PER_SECOND = 1000;
const CLOCK_PRECISION_THRESHOLD_S = 10;

export function fmtMs(ms) {
  if (ms < 1) return '<1 ms';
  if (ms < MS_PER_SECOND) return `${Math.round(ms)} ms`;
  return `${(ms / MS_PER_SECOND).toFixed(1)} s`;
}

export function fmtClock(ms) {
  const seconds = ms / MS_PER_SECOND;
  return seconds < CLOCK_PRECISION_THRESHOLD_S ? `${seconds.toFixed(2)} s` : `${seconds.toFixed(1)} s`;
}

function stepsSuffix(count) {
  if (count === 0) return '';
  return ` · ${count} step${count === 1 ? '' : 's'}`;
}

const STOPPED_STATUS = 'stopped';

export function foldLabel(run) {
  const suffix = stepsSuffix(stepCount(run));
  if (run.status === STOPPED_STATUS) return `Interrupted after ${fmtClock(totalMs(run))}${suffix}`;
  return `Worked ${fmtMs(totalMs(run))}${suffix}`;
}

// ─── Sources (tool result → file/line map) ─────────────────────────────

const COMPANY_MATCHERS = [
  { keys: ['cresta'], lines: CRESTA_LINES },
  { keys: ['goodfintech'], lines: [GOODFINTECH_LINE] },
  { keys: ['vivoo'], lines: [VIVOO_LINE] },
  { keys: ['novit', 'archangel'], lines: [NOVIT_LINE] },
  { keys: ['e-kalite', 'pharmacircle'], lines: [EKALITE_LINE] },
  { keys: ['emdi', 'indie'], lines: [EMDI_LINE] }
];

function matchesCompany(text, matcher) {
  return matcher.keys.some((key) => text.indexOf(key) !== -1);
}

function workLinesForCompany(data) {
  const text = `${data.company || ''} ${data.aka || ''}`.toLowerCase();
  const matched = COMPANY_MATCHERS.find((matcher) => matchesCompany(text, matcher));
  return matched ? matched.lines : WORK_ALL_LINES;
}

function aboutSources(data) {
  if (!data || data.type === 'timeline') {
    return [
      { file: 'about', lines: ABOUT_OVERVIEW_LINES },
      { file: 'work', lines: WORK_HISTORY_LINES }
    ];
  }
  if (data.type === 'company') return [{ file: 'work', lines: workLinesForCompany(data) }];
  if (data.type === 'education') return [{ file: 'about', lines: [ABOUT_EDUCATION_LINE] }];
  if (data.type === 'technologies') return [];
  if (data.type === 'blog') return [{ file: 'writing', lines: [] }];
  return [{ file: 'about', lines: ABOUT_OVERVIEW_LINES }];
}

function reposSources(data) {
  if (!data || !data.repos) return [{ file: 'repos', lines: DEFAULT_REPO_LINES }];
  const lines = data.repos
    .map((repo) => REPO_LINES[repo.slug] || REPO_LINES[repo.name])
    .filter((num) => typeof num === 'number')
    .sort((first, second) => first - second);
  return [{ file: 'repos', lines }];
}

export function sourcesFor(tool, data) {
  if (tool === 'about') return aboutSources(data);
  if (tool === 'repos') return reposSources(data);
  if (tool === 'g1') return [{ file: 'repos', lines: G1_REPO_LINES }];
  if (tool === 'skills') return [{ file: 'skills', lines: SKILLS_ALL_LINES }];
  if (tool === 'contact') return [{ file: 'contact', lines: CONTACT_ALL_LINES }];
  if (tool === 'blog') return [{ file: 'writing', lines: [] }];
  return [];
}

// ─── Source labels ───────────────────────────────────────────────────────

function toSpans(lines) {
  const spans = [];
  let start = lines[0];
  let prev = lines[0];
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === prev + 1) {
      prev = lines[i];
      continue;
    }
    spans.push([start, prev]);
    start = lines[i];
    prev = lines[i];
  }
  spans.push([start, prev]);
  return spans;
}

function spanLabel(span) {
  const [start, end] = span;
  return start === end ? `L${start}` : `L${start}–L${end}`;
}

export function lineRangeLabel(lines) {
  if (lines.length === 0) return '';
  return toSpans(lines).map(spanLabel).join(', ');
}

function labelForSource(src) {
  const name = FILE_NAMES[src.file];
  const rangeLabel = lineRangeLabel(src.lines);
  return rangeLabel ? `${name} ${rangeLabel}` : name;
}

export function sourceLabel(sources) {
  return sources.map(labelForSource).join(', ');
}

export function actLabel(tool, sources) {
  const label = `${tool}()`;
  if (!sources || sources.length === 0) return label;
  return `${label} → ${sourceLabel(sources)}`;
}

// ─── Merging sources ─────────────────────────────────────────────────────

function cloneSource(src) {
  return { file: src.file, lines: src.lines.slice() };
}

function uniqueSorted(nums) {
  return Array.from(new Set(nums)).sort((first, second) => first - second);
}

function mergeLines(existing, incoming) {
  if (existing.length === 0 || incoming.length === 0) return [];
  return uniqueSorted(existing.concat(incoming));
}

function mergeInto(list, src) {
  const existing = list.filter((item) => item.file === src.file)[0];
  if (!existing) {
    list.push(cloneSource(src));
    return;
  }
  existing.lines = mergeLines(existing.lines, src.lines);
}

export function mergeSources(sourcesA, sourcesB) {
  const result = sourcesA.map(cloneSource);
  sourcesB.forEach((src) => mergeInto(result, src));
  return result;
}

// ─── Answer text ─────────────────────────────────────────────────────────

const MAX_SENTENCE_CHARS = 160;
const SENTENCE_END = /[.!?](\s|$)/;

export function firstSentence(text) {
  const match = SENTENCE_END.exec(text);
  const end = match ? match.index + 1 : text.length;
  const sentence = text.slice(0, end).trim();
  if (sentence.length > MAX_SENTENCE_CHARS) {
    return `${sentence.slice(0, MAX_SENTENCE_CHARS).trim()}…`;
  }
  return sentence;
}

export function announceText(run, answerText) {
  const label = `${foldLabel(run)}.`;
  const sentence = answerText ? firstSentence(answerText) : '';
  return sentence ? `${label} ${sentence}` : label;
}
