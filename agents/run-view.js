// run-view.js — the agent column's turn engine (grafted from direction A).
// Each question gets one turn block: step rows are appended once as trace
// events arrive, one clock drives the status line (at most 4 updates a
// second), and the turn folds to "Worked 160 ms · 6 steps" with its page
// sources when it ends. Everything is rendered as text; no innerHTML here.
import * as Steps from './steps.js';

const TICK_MS = 250;
const MAX_TURNS = 20;
const CANCEL_LINE = '─── cancelled ───';
const ASK_PHASE = 'Waiting for your answer…';
const IDLE_SUMMARY = 'Ask the agent';
const ANSWER_SELECTORS = ['.llm-summary', '.stream-body', '.msg.agent .body', '.faq-response'];

function make(tag, className, text) {
  const elem = document.createElement(tag);
  if (className) elem.className = className;
  if (text !== undefined) elem.textContent = text;
  return elem;
}

function makeButton(className, text) {
  const button = make('button', className, text);
  button.type = 'button';
  return button;
}

function buildQuery(query, index) {
  const heading = make('h3', 'turn-query', 'You asked ');
  heading.id = 'turn-' + index + '-q';
  heading.tabIndex = -1;
  heading.append(make('b', '', query));
  return heading;
}

// The status line is aria-hidden: the clock would be noisy, and the
// announcer reports the finished turn instead.
function buildStatus(finePointer) {
  const root = make('p', 'turn-status');
  root.setAttribute('aria-hidden', 'true');
  const status = { root, phase: make('span', 'turn-phase'), clock: make('span', 'turn-clock') };
  root.append(make('span', 'run-dot'), status.phase, status.clock);
  if (finePointer) root.append(make('span', 'esc-hint', '· esc to stop'));
  return status;
}

function buildTurnBlock(query, index, finePointer) {
  const block = {
    root: make('section', 'turn-block'),
    summary: makeButton('turn-summary-row'),
    detail: make('div', 'turn-detail'),
    query: buildQuery(query, index),
    status: buildStatus(finePointer),
    fold: makeButton('fold-btn'),
    steps: make('ol', 'steps-list'),
    msgs: make('div', 'turn-msgs'),
    sources: make('div', 'sources'),
  };
  assembleTurnBlock(block, index);
  return block;
}

function assembleTurnBlock(block, index) {
  block.root.dataset.state = 'running';
  block.root.setAttribute('aria-labelledby', block.query.id);
  block.summary.hidden = true;
  block.fold.hidden = true;
  block.sources.hidden = true;
  block.steps.id = 'turn-' + index + '-steps';
  block.fold.setAttribute('aria-controls', block.steps.id);
  block.detail.append(block.query, block.status.root, block.fold, block.steps, block.msgs, block.sources);
  block.root.append(block.summary, block.detail);
}

function buildRow(row) {
  const glyph = make('span', 'step-glyph');
  glyph.setAttribute('aria-hidden', 'true');
  const node = {
    item: make('li', 'step'),
    label: make('span', 'step-label', row.label),
    ms: make('span', 'step-ms'),
  };
  node.item.append(glyph, make('span', 'step-verb', row.verb), node.label, node.ms);
  return node;
}

// Rows the step engine added (including an interrupt's synthetic row) get
// their node once; nodes are never rebuilt.
function syncNodes(turn) {
  while (turn.nodes.length < turn.run.rows.length) {
    const node = buildRow(turn.run.rows[turn.nodes.length]);
    turn.nodes.push(node);
    turn.block.steps.append(node.item);
  }
}

// Repaints only the last `count` rows: the row that just finished and the
// newest one. Earlier rows keep their durations (cumulative rounding).
function paintTail(turn, count) {
  const shown = Steps.displayDurations(turn.run.rows);
  for (let i = Math.max(0, turn.nodes.length - count); i < turn.nodes.length; i++) {
    const row = turn.run.rows[i];
    turn.nodes[i].item.dataset.state = row.state;
    turn.nodes[i].label.textContent = row.label;
    turn.nodes[i].ms.textContent = shown[i];
  }
}

function relabelAct(turn, tool, sources) {
  const plain = tool + '()';
  for (let i = turn.run.rows.length - 1; i >= 0; i--) {
    const row = turn.run.rows[i];
    if (row.verb !== 'act' || row.label !== plain) continue;
    row.label = Steps.actLabel(tool, sources);
    turn.nodes[i].label.textContent = row.label;
    return;
  }
}

function setStepsOpen(block, open) {
  block.fold.setAttribute('aria-expanded', String(open));
  block.steps.hidden = !open;
}

function toggleSteps(block) {
  setStepsOpen(block, block.steps.hidden);
}

function toggleDetail(block) {
  const open = block.detail.hidden;
  block.detail.hidden = !open;
  block.summary.setAttribute('aria-expanded', String(open));
}

function buildSourceChip(source) {
  const chip = makeButton('src-chip', Steps.sourceLabel([source]));
  chip.dataset.file = source.file;
  chip.dataset.line = String(source.lines[0] || 1);
  return chip;
}

function fillSources(container, sources, page) {
  if (!sources.length) return;
  const files = sources.length === 1 ? '1 file' : sources.length + ' files';
  const label = 'sources: ' + files + ' · ≈' + page.tokensFor(sources) + ' tok';
  container.append(make('span', 'sources-label', label));
  sources.forEach((source) => container.append(buildSourceChip(source)));
  container.hidden = false;
}

function showDone(turn, page) {
  const { block, run } = turn;
  block.root.dataset.state = run.status === 'stopped' ? 'interrupted' : 'done';
  block.status.root.hidden = true;
  block.fold.textContent = Steps.foldLabel(run);
  block.fold.hidden = false;
  setStepsOpen(block, run.status !== 'passed');
  fillSources(block.sources, turn.sources, page);
}

function stepsText(count) {
  return count + (count === 1 ? ' step' : ' steps');
}

function historyParts(turn) {
  const { run, index } = turn;
  return [
    make('span', 'ts-run', 'run #' + index),
    make('span', 'ts-state ts-' + run.status, run.status),
    make('span', 'ts-time', Steps.fmtMs(Steps.totalMs(run)) + ' · ' + stepsText(Steps.stepCount(run))),
    make('span', 'ts-query', run.query),
  ];
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
  // Only the OBSERVE that carries the tool's result has a `data` key; the
  // evaluator's follow-up OBSERVE for the same tool has none.
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

// opts: {store, list, scroller, idlePanel, announcer, page, sheet,
//        onRunStart, onRunEnd, finePointer}
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

  // Renderer hook: user queries and the cancel line are drawn by this view.
  containerFor(msg) {
    if (msg.role === 'user' || msg.type === 'react-step') return null;
    if (msg.role === 'system' && msg.content === CANCEL_LINE) return null;
    const turn = this.turn || this.last;
    return turn && turn.block.root.isConnected ? turn.block.msgs : this.opts.list;
  }

  stop() {
    if (!this.turn) return;
    window.Router.cancel();
    // cancel() is a no-op between a mid-turn THINKING hide and the turn's
    // end, so interrupt the view itself; the late turnEnd then finds no turn.
    if (this.turn && !this.opts.store.getState().ui.isProcessing) this.interruptTurn();
  }

  reset() {
    const hadTurn = this.turn !== null;
    clearInterval(this.ticker);
    this.turn = null;
    this.last = null;
    if (this.opts.idlePanel) this.opts.idlePanel.hidden = false;
    this.opts.page.clear();
    this.opts.sheet.setSummary(IDLE_SUMMARY);
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
    this.foldLast();
    this.count += 1;
    const block = buildTurnBlock(query, this.count, this.opts.finePointer);
    const run = Steps.createRun(query, performance.now());
    this.turn = { run, block, nodes: [], index: this.count, sources: [] };
    block.fold.addEventListener('click', () => toggleSteps(block));
    block.summary.addEventListener('click', () => toggleDetail(block));
    block.sources.addEventListener('click', (evt) => this.onSourceClick(evt));
    this.opts.list.insertBefore(block.root, this.opts.list.firstChild);
    this.trimTurns();
    this.afterStart();
  }

  afterStart() {
    const { idlePanel, scroller, page, sheet } = this.opts;
    if (idlePanel) idlePanel.hidden = true;
    if (scroller) scroller.scrollTop = 0;
    page.clear();
    if (sheet.state() !== 'expanded') sheet.peek();
    this.paintStatus();
    this.ticker = setInterval(() => this.paintStatus(), TICK_MS);
    this.opts.onRunStart();
  }

  paintStatus() {
    const turn = this.turn;
    if (!turn) return;
    const clock = Steps.fmtClock(performance.now() - turn.run.startMs);
    const { phase } = turn.block.status;
    if (phase.textContent !== turn.run.phase) phase.textContent = turn.run.phase;
    turn.block.status.clock.textContent = clock;
    this.opts.sheet.setSummary(turn.run.phase + ' ' + clock);
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
    if (!sources.length) return;
    turn.sources = Steps.mergeSources(turn.sources, sources);
    relabelAct(turn, tool, sources);
    this.opts.page.highlight(sources, tool);
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
    showDone(turn, this.opts.page);
    this.opts.page.settle();
    this.opts.announcer.textContent = Steps.announceText(turn.run, answerText(turn.block.msgs));
    this.opts.sheet.setSummary(Steps.foldLabel(turn.run));
    this.opts.onRunEnd();
  }

  foldLast() {
    const turn = this.last;
    if (!turn || !turn.block.root.isConnected) return;
    const { summary, detail } = turn.block;
    summary.replaceChildren(...historyParts(turn));
    summary.setAttribute('aria-expanded', 'false');
    summary.hidden = false;
    detail.hidden = true;
  }

  trimTurns() {
    const blocks = this.opts.list.querySelectorAll('.turn-block');
    for (let i = MAX_TURNS; i < blocks.length; i++) blocks[i].remove();
  }

  onSourceClick(evt) {
    const chip = evt.target.closest('.src-chip');
    if (!chip) return;
    if (this.opts.sheet.isPhone()) this.opts.sheet.idle();
    this.opts.page.reveal(chip.dataset.file, Number(chip.dataset.line));
  }
}
