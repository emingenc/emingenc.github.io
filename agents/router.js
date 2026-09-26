// router.js — the agent's front door. Every input enters here: typed in the
// composer, clicked on a card, or sent by a link ({source: 'url'}). While a
// chooser is open, typed text answers it. Otherwise the router begins a turn,
// echoes the input, and either runs a session command itself or decides
// which tool answers: the one a slash command names, the FAQ for a
// well-known site question, or the tool the classifier proposes and the
// alignment gate accepts. LoopPolicy turns that decision into a plan and the
// orchestrator runs it. Turn owns every turn from begin() to its end, so
// input that arrives while one runs is dropped: agent-ui has queued it.
'use strict';

var Router;

{
  const COMMAND_CONFIDENCE = 1;
  const FAST_PATH_CONFIDENCE = 100;
  const FAST_PATH_REASON = 'knowledge fast-path';
  const FAST_PATH_LABEL = 'routing';
  const CLASSIFY_LABEL = 'thinking...';
  const SESSIONS_LABEL = 'listing sessions';
  const SESSIONS_DELAY_MS = 200;
  const FORGET_CONFIRMATIONS = new Set(['confirm', 'yes', 'y']);
  // The classifier had no answer: its model is not ready, or it was too slow.
  const NO_INTENT = Object.freeze({ type: 'faq', label: 'faq', score: 0 });

  let store = null;

  const addMessage = (message) => ({ type: 'MESSAGE_ADD', message });
  const userSays = (content) => addMessage({ role: 'user', type: 'text', content, ts: '' });
  const errorSays = (content) => addMessage({ role: 'error', type: 'text', content, ts: '' });
  const agentSays = (content) => addMessage({ role: 'agent', type: 'faq', content, ts: '' });
  const toolCard = (toolName, content) => addMessage({ role: 'tool', type: 'tool-call', toolName, content, ts: '', noTs: false });

  // ─── Input ───────────────────────────────────────────────────────────────

  // An open chooser takes typed text as its answer. The echo comes first:
  // run-view files a visitor line that arrives while the chooser is open as
  // the paused turn's answer step. A slash command closes the chooser and
  // runs like any other input.
  function handleInput(text, { source } = {}) {
    if (Turn.isPaused()) {
      if (!Tools.isSlash(text)) return answerChooser(text);
      Turn.abandon();
    }
    if (Turn.isBusy()) return;
    const turn = Turn.begin();
    turn.dispatch(userSays(text));
    if (source === 'url' && Tools.isDestructiveCommand(text)) return refuseLink(turn, text);
    if (Tools.isSlash(text)) return runCommand(turn, text);
    return routeQuestion(turn, text);
  }

  function answerChooser(text) {
    store.dispatch(userSays(text));
    Turn.answer(text);
  }

  // The chooser's buttons, and the inline onclick of saved transcripts,
  // answer by index. A button left from an earlier turn has nothing to answer.
  function answerByButton(index) {
    Turn.answer(index);
    focusInput();
  }

  function focusInput() {
    document.getElementById('input')?.focus();
  }

  // A link may run any command but these: ?q=/forget --confirm would wipe
  // every saved session, and ?q=/clear right after the auto-restore would
  // prune the session just restored. /new and /resume stay reachable, since
  // neither deletes a saved session.
  function refuseLink(turn, text) {
    const command = Tools.parseSlash(text);
    const loss = command === 'clear' ? 'clear the transcript' : 'delete saved sessions';
    failCommand(turn, `Type /${command} yourself in the chat box — a link can't ${loss}.`);
  }

  function failCommand(turn, message) {
    turn.dispatch(errorSays(message));
    turn.end();
  }

  // ─── Slash commands ──────────────────────────────────────────────────────

  // The commands the router runs itself. A Map, not an object: the command
  // is whatever the visitor typed, and /constructor must find nothing.
  const COMMANDS = new Map([
    ['clear', clearTranscript],
    ['new', startNewSession],
    ['sessions', listSessions],
    ['resume', resumeSession],
    ['r', resumeSession],
    ['forget', forgetSessions],
    ['ask', (turn, text) => runTool(turn, text, 'ask_user')],
  ]);

  function runCommand(turn, text) {
    const command = Tools.parseSlash(text);
    const run = COMMANDS.get(command) ?? runTool;
    run(turn, text, command);
  }

  // Any other command names the tool that answers it: /help, /blog, or a
  // mistyped one, which the loop reports as not found.
  function runTool(turn, text, tool) {
    runLoop(turn, text, { tool, confidence: COMMAND_CONFIDENCE });
  }

  // A cleared transcript or a new session no longer shows the last question,
  // so a follow-up has nothing to lean on.
  function clearTranscript(turn) {
    turn.dispatch({ type: 'CLEAR' });
    Orchestrator.resetFollowupState();
    turn.end();
  }

  function startNewSession(turn) {
    turn.dispatch({ type: 'NEW_SESSION' });
    Orchestrator.resetFollowupState();
    Renderer.showWelcome();
    turn.end();
  }

  // The card persists the session it lands in, so a turn stopped meanwhile
  // must not write it after a /forget --confirm: its timer dies with it.
  function listSessions(turn) {
    turn.busy('executing', SESSIONS_LABEL);
    turn.after(SESSIONS_DELAY_MS, () => {
      turn.dispatch(toolCard('sessions', Tools.sessions(store.listSessions(), store.getSize()).content));
      turn.end();
    });
  }

  // A resumed session keeps the rolling summary it was saved with. The id is
  // raw visitor or link text, left unescaped: renderer.js escapes an error
  // line once, live and restored, so escaping here would show it encoded.
  function resumeSession(turn, text, command) {
    const id = argumentOf(text, command).trim().replace(/^\//, '');
    if (!id) return failCommand(turn, 'Usage: /resume <session-id>  (use /sessions to list)');
    if (!store.restoreById(id)) return failCommand(turn, `Session ${id} not found. Use /sessions to list.`);
    Renderer.showRestored(store.getState());
    turn.end({ summarize: false });
    focusInput();
  }

  // Wiping every saved session cannot be undone, so it takes a typed
  // confirmation. The message persists the session it lands in, so the wipe
  // comes after it.
  function forgetSessions(turn, text, command) {
    const confirmed = FORGET_CONFIRMATIONS.has(confirmationOf(argumentOf(text, command)));
    turn.dispatch(agentSays(confirmed ? 'All saved sessions cleared. Storage freed.' : forgetWarning(store.listSessions().length)));
    if (confirmed) store.forgetAll();
    turn.end();
  }

  function forgetWarning(count) {
    const doomed = count > 0 ? `${count} saved session${count === 1 ? '' : 's'}` : 'all saved sessions';
    return `This will permanently delete ${doomed}. Type <b>/forget --confirm</b> to proceed, or <b>/sessions</b> to review first.`;
  }

  // What follows "/command" and the one space or slash that ends it.
  const argumentOf = (text, command) => text.slice(`/${command} `.length);

  // "--confirm", "/confirm/" and "CONFIRM" all read "confirm".
  const confirmationOf = (argument) => argument.trim().toLowerCase().replace(/^[\/-]+/, '').replace(/\/+$/, '');

  // ─── Questions ───────────────────────────────────────────────────────────

  // Well-known site questions skip the classifier, which misroutes them;
  // any other question is classified, then aligned to a tool.
  function routeQuestion(turn, text) {
    const known = Tools.detectKnowledgeFastPath(text);
    if (!known) return classify(turn, text);
    turn.busy('classifying', FAST_PATH_LABEL);
    runLoop(turn, text, { tool: known, confidence: FAST_PATH_CONFIDENCE, reason: FAST_PATH_REASON });
  }

  function classify(turn, text) {
    turn.busy('classifying', CLASSIFY_LABEL);
    Classifier.classify(text)
      .then((intent) => {
        if (turn.isCurrent()) align(turn, text, intent || NO_INTENT);
      })
      .catch((error) => {
        if (!turn.isCurrent()) return;
        turn.trace(`classify → error · ${error.message || 'classification failed'}`);
        runLoop(turn, text, outOfScope('classification error'));
      });
  }

  function align(turn, text, intent) {
    AlignmentGate.check(text, intent, { signal: turn.signal })
      .then((decision) => {
        if (!turn.isCurrent()) return;
        turn.trace(`align → ${decision.action} ${decision.tool} · ${decision.reason}`);
        runLoop(turn, text, decision);
      })
      .catch(() => {
        if (!turn.isCurrent()) return;
        turn.trace('align → sink out_of_scope · alignment error');
        runLoop(turn, text, outOfScope('alignment error'));
      });
  }

  const outOfScope = (reason) => ({ tool: 'out_of_scope', confidence: 0, reason });

  // LoopPolicy turns the decision into a plan, adding the other tools a
  // compound question names, and the orchestrator runs the turn from there.
  function runLoop(turn, text, decision) {
    Orchestrator.run(turn, text, LoopPolicy.planFor(text, decision));
  }

  // ─── Wiring ──────────────────────────────────────────────────────────────

  // Turn stops a running turn first, so whatever reacts to its abort still
  // writes to the store that turn began in; then every module binds the new
  // one, and the loop forgets the last conversation's follow-up.
  function init(nextStore) {
    Turn.init(nextStore);
    store = nextStore;
    Tools.setStore(nextStore);
    Classifier.init(nextStore);
    Evaluator.init(nextStore);
    Reply.init(nextStore);
    Orchestrator.resetFollowupState();
    window._answerAsk = answerByButton;
  }

  Router = {
    init,
    handleInput,
    enableLLM: () => Classifier.enableLLM(),
    cancel: () => Turn.cancel(),
  };
}
