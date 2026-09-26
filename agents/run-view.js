// run-view.js — the session's turn engine. Each question becomes one turn in
// the scrollback, newest last, drawn like a coding agent's in a terminal: the
// prompt line, one tool call per tool the agent ran or page it opened, a busy
// line with one clock while it works (at most 4 updates a second), the answer
// and its cards, then a foot line with the turn's time and steps. A tool call
// that read knowledge-file lines gets a result line ("└ work.md L1–L5") that
// shows them, cited, when clicked; the foot's "details" shows every step.
// Rendered as text; no innerHTML here.
import * as Steps from './steps.js';
import { make, makeButton } from './dom.js';
import { readFigure } from './figures.js';
import { repoList, repoCard, postCard, gameCard } from './cards.js';

const TICK_MS = 250;
const MAX_TURNS = 20;
const CANCEL_LINE = '─── cancelled ───';
const ASK_PHASE = 'Waiting for your answer…';
const ANSWER_SELECTORS = ['.llm-summary', '.stream-body', '.msg.agent .body', '.faq-response'];
const GLYPHS = { running: '•', done: '✓', error: '✗', interrupted: '■' };
const FOOT_MARKS = { passed: ['ok', '✓'], stopped: ['bad', '■'], error: ['bad', '✗'] };
const TOOL_VERBS = new Set(['act', 'open']);
const REPO_TOOLS = new Set(['repos', 'g1']);
const POST_PATH = /^\/blog\/(.+?)\/?$/;

// The query line, drawn like the prompt it was typed at.
function buildQuery(query, id) {
  const line = make('h2', 'q');
  const caret = make('span', 'p', '❯');
  caret.setAttribute('aria-hidden', 'true');
  line.append(caret, make('span', 'sr', 'You asked: '), make('span', 'cmd', query));
  if (id) line.id = id;
  line.tabIndex = -1;
  return line;
}

// The busy line is aria-hidden: the clock would be noisy, and the announcer
// reports the finished turn instead.
function buildBusy(finePointer) {
  const busy = { root: make('p', 'busy'), phase: make('span', 'phase'), clock: make('span', 'clk') };
  busy.root.setAttribute('aria-hidden', 'true');
  busy.root.append(make('span', 'dot'), busy.phase, busy.clock);
  if (finePointer) busy.root.append(make('span', 'esc', 'esc to stop'));
  return busy;
}

function buildTurn(query, index, finePointer) {
  const id = 'turn-' + index;
  const block = {
    id,
    root: make('section', 'turn'),
    query: buildQuery(query, id + '-q'),
    tools: make('ol', 'tools'),
    busy: buildBusy(finePointer),
    msgs: make('div', 'out'),
    cards: make('div', 'out-cards'),
    foot: make('p', 'foot'),
    trace: make('ol', 'trace'),
  };
  assembleTurn(block);
  return block;
}

function assembleTurn(block) {
  const body = make('div', 'turn-body');
  block.root.dataset.state = 'running';
  block.root.setAttribute('aria-labelledby', block.query.id);
  block.tools.setAttribute('aria-label', 'What the agent read and opened');
  block.trace.id = block.id + '-steps';
  block.trace.setAttribute('aria-label', 'Agent steps');
  block.tools.hidden = true;
  block.foot.hidden = true;
  block.trace.hidden = true;
  body.append(block.tools, block.busy.root, block.msgs, block.cards, block.foot, block.trace);
  block.root.append(block.query, body);
}

function buildStep(row) {
  const node = { item: make('li'), glyph: make('span', 'gl'), label: make('span', 'd', row.label), ms: make('span', 'ms') };
  node.glyph.setAttribute('aria-hidden', 'true');
  node.item.append(node.glyph, make('span', 'v', row.verb), node.label, node.ms);
  return node;
}

// A tool call is one line until its tool's file lines are known; then a
// result line under it names them. The call keeps its first label: the act
// row's label later gains the lines, which the result line shows instead.
function buildTool(row) {
  const tool = { item: make('li'), call: make('span', 'tool'), glyph: make('span', 'gl'), res: null };
  Object.assign(tool, { name: '', sources: [], figures: null });
  tool.glyph.setAttribute('aria-hidden', 'true');
  tool.call.append(tool.glyph, make('span', 'lbl', toolLabel(row)));
  tool.item.append(tool.call);
  paintTool(tool, row);
  return tool;
}

function toolLabel(row) {
  return row.verb === 'open' ? 'open ' + row.label : row.label;
}

function paintTool(tool, row) {
  tool.item.dataset.state = row.state;
  tool.glyph.textContent = GLYPHS[row.state] || '·';
}

// Rows the step engine added (including an interrupt's synthetic row) get
// their node once; nodes are never rebuilt. Tool and page rows also get a
// row of their own above the answer.
function syncNodes(turn) {
  while (turn.nodes.length < turn.run.rows.length) {
    const index = turn.nodes.length;
    const row = turn.run.rows[index];
    const node = buildStep(row);
    turn.nodes.push(node);
    turn.block.trace.append(node.item);
    if (TOOL_VERBS.has(row.verb) && !row.synthetic) addTool(turn, index, row);
  }
}

function addTool(turn, index, row) {
  const tool = buildTool(row);
  turn.tools.set(index, tool);
  turn.block.tools.append(tool.item);
  turn.block.tools.hidden = false;
}

function paintStep(turn, index, shown) {
  const row = turn.run.rows[index];
  const node = turn.nodes[index];
  node.item.dataset.state = row.state;
  node.glyph.textContent = GLYPHS[row.state] || '·';
  node.label.textContent = row.label;
  node.ms.textContent = shown[index];
  const tool = turn.tools.get(index);
  if (tool) paintTool(tool, row);
}

// Repaints only the last `count` rows: the row that just finished and the
// newest one. Earlier rows keep their durations (cumulative rounding).
function paintTail(turn, count) {
  const shown = Steps.displayDurations(turn.run.rows);
  for (let i = Math.max(0, turn.nodes.length - count); i < turn.nodes.length; i++) paintStep(turn, i, shown);
}

// The act row of `tool` names the file lines it read; returns its tool call.
function relabelAct(turn, tool, sources) {
  const plain = tool + '()';
  for (let i = turn.run.rows.length - 1; i >= 0; i--) {
    const row = turn.run.rows[i];
    if (row.verb !== 'act' || row.label !== plain) continue;
    row.label = Steps.actLabel(tool, sources);
    paintStep(turn, i, Steps.displayDurations(turn.run.rows));
    return turn.tools.get(i) || null;
  }
  return null;
}

// The prose already says what these tools' ASCII cards show: the bio, the
// company when the question named it, the stack. Their rows keep the lines.
function proseCovers(tool, data) {
  if (tool === 'skills') return true;
  if (tool !== 'about') return false;
  if (!data) return true;
  if (data.type === 'company') return Boolean(data.namedInQuestion);
  return data.type === 'timeline' || data.type === 'education';
}

function fillFoot(turn) {
  const { block, run } = turn;
  const [className, mark] = FOOT_MARKS[run.status] || FOOT_MARKS.error;
  const label = make('span');
  label.append(make('span', className, mark), ' ' + Steps.foldLabel(run));
  block.foot.append(label);
  if (turn.nodes.length) block.foot.append(detailsButton(block));
  block.foot.hidden = false;
}

function detailsButton(block) {
  const button = makeButton('more', 'details');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', block.trace.id);
  button.addEventListener('click', () => {
    block.trace.hidden = !block.trace.hidden;
    button.setAttribute('aria-expanded', String(!block.trace.hidden));
  });
  return button;
}

function answerText(msgs) {
  for (const selector of ANSWER_SELECTORS) {
    const found = msgs.querySelector(selector);
    if (found && found.textContent.trim()) return found.textContent;
  }
  return '';
}

const HANDLERS = {
  MESSAGE_ADD(view, state, action) {
    const msg = action.message;
    if (msg.role === 'user') view.onUserMessage(state, msg);
    else if (msg.type === 'react-step') view.onStep(msg.text || msg.content || '');
  },
  // Only the OBSERVE that carries the tool's result has a `data` key;
  // LoopPolicy's follow-up self-contained OBSERVE for the same tool has none.
  OBSERVE: (view, state, action) => {
    if ('data' in action) view.onObserve(action.tool, action.data);
  },
  ASK_USER: (view) => view.setPhase(ASK_PHASE),
  THINKING(view, state, action) {
    if (!action.turnEnd) return;
    if (action.cancelled) view.interruptTurn();
    else view.finishTurn();
  },
  CLEAR: (view) => view.reset(),
  NEW_SESSION: (view) => view.reset(),
};

// opts: {store, list, announcer, page, onRunStart, onRunEnd, finePointer}
export class RunView {
  constructor(opts) {
    this.opts = opts;
    this.turn = null;
    this.last = null;
    this.count = 0;
    this.ticker = 0;
    opts.store.subscribe((state, action) => this.onAction(state, action));
  }

  isRunning() {
    return this.turn !== null;
  }

  // Renderer hook: user queries and the cancel line are drawn by this view,
  // and an ASCII card is left out when the turn shows its content otherwise.
  containerFor(msg) {
    if (msg.role === 'user' || msg.type === 'react-step') return null;
    if (msg.role === 'system' && msg.content === CANCEL_LINE) return null;
    const turn = this.turn || this.last;
    if (!turn || !turn.block.root.isConnected) return this.opts.list;
    return msg.type === 'tool-call' && turn.drawn.has(msg.toolName) ? null : turn.block.msgs;
  }

  stop() {
    if (!this.turn) return;
    window.Router.cancel();
  }

  reset() {
    const hadTurn = this.turn !== null;
    clearInterval(this.ticker);
    this.turn = null;
    this.last = null;
    if (hadTurn) this.opts.onRunEnd();
  }

  onAction(state, action) {
    const handler = HANDLERS[action.type];
    if (handler) handler(this, state, action);
  }

  // An answer typed into an ask_user pause stays in the same turn.
  onUserMessage(state, msg) {
    const text = String(msg.content || '');
    if (this.turn && state.ui.needsHumanInput) return this.onStep('answer → ' + text);
    if (this.turn) this.finishTurn();
    return this.startTurn(text);
  }

  startTurn(query) {
    this.count += 1;
    const block = buildTurn(query, this.count, this.opts.finePointer);
    const run = Steps.createRun(query, performance.now());
    this.turn = { run, block, nodes: [], tools: new Map(), drawn: new Set(), repoLines: new Set(), repoList: null };
    this.opts.list.append(block.root);
    this.trimTurns();
    this.opts.page.pin(block.root);
    this.paintStatus();
    this.ticker = setInterval(() => this.paintStatus(), TICK_MS);
    this.opts.onRunStart();
  }

  paintStatus() {
    const turn = this.turn;
    if (!turn) return;
    const { phase, clock } = turn.block.busy;
    if (phase.textContent !== turn.run.phase) phase.textContent = turn.run.phase;
    clock.textContent = Steps.fmtClock(performance.now() - turn.run.startMs);
  }

  setPhase(text) {
    if (this.turn) this.turn.run.phase = text;
  }

  onStep(text) {
    const turn = this.turn;
    if (!turn || !Steps.addEvent(turn.run, text, performance.now())) return;
    syncNodes(turn);
    paintTail(turn, 2);
  }

  onObserve(tool, data) {
    const turn = this.turn;
    if (!turn) return;
    const sources = Steps.sourcesFor(tool, data);
    if (sources.length) this.noteSources(turn, tool, sources);
    const carded = this.addCards(turn, tool, data);
    if (carded || (sources.length && proseCovers(tool, data))) turn.drawn.add(tool);
  }

  noteSources(turn, tool, sources) {
    const toolRow = relabelAct(turn, tool, sources);
    if (!toolRow || toolRow.res) return;
    Object.assign(toolRow, { name: tool, sources });
    this.addResult(turn, toolRow);
  }

  // The result line under a tool call: a button that shows the lines it read.
  addResult(turn, tool) {
    const button = makeButton('res');
    const elbow = make('span', 'el', '└');
    const twisty = make('span', 'tw', '▸');
    elbow.setAttribute('aria-hidden', 'true');
    twisty.setAttribute('aria-hidden', 'true');
    const tok = make('span', 'tok', '· ≈' + this.opts.page.tokensFor(tool.sources) + ' tok');
    button.append(elbow, make('span', 'src', Steps.sourceLabel(tool.sources)), tok, twisty);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => this.toggleLines(turn, tool));
    tool.item.append(button);
    tool.res = button;
  }

  toggleLines(turn, tool) {
    if (!tool.figures) {
      tool.figures = tool.sources.map((source) => this.figureFor(tool, source));
      tool.figures.forEach((figure, index) => { figure.id = `${turn.block.id}-${tool.name}-${index}`; });
      tool.res.setAttribute('aria-controls', tool.figures.map((figure) => figure.id).join(' '));
      tool.item.append(...tool.figures);
    }
    const open = tool.res.getAttribute('aria-expanded') !== 'true';
    tool.res.setAttribute('aria-expanded', String(open));
    tool.figures.forEach((figure) => { figure.hidden = !open; });
  }

  // The rows a source names, cited.
  figureFor(tool, source) {
    const { page } = this.opts;
    const rows = page.rowsFor(source).map((row) => ({ line: row.line, text: row.text, hit: true }));
    const range = Steps.lineRangeLabel(source.lines) || 'all lines';
    return readFigure({ name: Steps.FILE_NAMES[source.file], range, tool: tool.name + '()', tok: page.tokensFor([source]) }, rows);
  }

  addCards(turn, tool, data) {
    if (REPO_TOOLS.has(tool)) return this.addRepoCards(turn, Steps.sourcesFor(tool, data));
    if (tool !== 'game' || !data || !data.games) return false;
    data.games.forEach((game) => turn.block.cards.append(gameCard(game, false)));
    return true;
  }

  // One card per repo a turn's tools read, in the order they read them.
  addRepoCards(turn, sources) {
    const fresh = sources.flatMap((source) => this.opts.page.rowsFor(source)).filter((row) => !turn.repoLines.has(row.line));
    if (fresh.length && !turn.repoList) turn.repoList = turn.block.cards.appendChild(repoList());
    fresh.forEach((row) => {
      turn.repoLines.add(row.line);
      turn.repoList.append(repoCard(row));
    });
    return turn.repoLines.size > 0;
  }

  // Orchestrator hook: a post or a game the agent would navigate to opens
  // in this turn instead. False leaves the navigation to the orchestrator.
  open(result) {
    const card = this.turn ? this.cardFor(result) : null;
    if (card) this.turn.block.cards.append(card);
    return Boolean(card);
  }

  cardFor(result) {
    const path = String(result.redirect || '');
    const post = POST_PATH.exec(path);
    if (result.toolName === 'blog' && post) {
      const row = this.opts.page.rowsFor({ file: 'writing', lines: [] }).find((item) => item.data.slug === post[1]);
      return row ? postCard(row) : null;
    }
    const game = result.toolName === 'game' ? (window.Tools.games || []).find((item) => item.path === path) : null;
    return game ? gameCard(game, true) : null;
  }

  finishTurn() {
    const turn = this.turn;
    if (!turn) return this.opts.onRunEnd();
    Steps.finishRun(turn.run, performance.now());
    return this.settle(turn);
  }

  interruptTurn() {
    const turn = this.turn;
    if (!turn) return this.opts.onRunEnd();
    Steps.interruptRun(turn.run, performance.now());
    return this.settle(turn);
  }

  settle(turn) {
    clearInterval(this.ticker);
    this.turn = null;
    this.last = turn;
    syncNodes(turn);
    paintTail(turn, 2);
    turn.block.root.dataset.state = turn.run.status === 'stopped' ? 'interrupted' : 'done';
    turn.block.busy.root.hidden = true;
    fillFoot(turn);
    this.opts.announcer.textContent = Steps.announceText(turn.run, answerText(turn.block.msgs));
    this.opts.onRunEnd();
  }

  // Oldest first: the scrollback keeps the newest MAX_TURNS turns.
  trimTurns() {
    const blocks = this.opts.list.querySelectorAll('.turn');
    for (let i = 0; i < blocks.length - MAX_TURNS; i++) blocks[i].remove();
  }

  // `cat <file>` from the command menu: the whole file, as a turn of its own
  // that never reaches the agent.
  showFile(fileId) {
    const name = Steps.FILE_NAMES[fileId];
    if (!name) return;
    const { page, list } = this.opts;
    const source = { file: fileId, lines: [] };
    const rows = page.rowsFor(source).map((row) => ({ line: row.line, text: row.text, hit: false }));
    const figure = readFigure({ name, range: 'L1–L' + rows.length, tool: 'cat', tok: page.tokensFor([source]) }, rows);
    const block = make('section', 'turn cat');
    const body = make('div', 'turn-body');
    body.append(figure);
    block.append(buildQuery('cat ' + name, ''), body);
    list.append(block);
    this.trimTurns();
    page.pin(block);
  }
}
