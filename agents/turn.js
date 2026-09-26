// turn.js — the one owner of a turn, from a visitor's input to the end of
// the agent's answer. begin() hands out the turn's handle; the router, the
// loop and the reply write to the store only through it, so a turn that has
// ended, been stopped or been superseded never writes again. The handle's
// signal aborts the moment its turn stops: its after() timers die, and model
// requests and streams listening on it let go. A turn that asks the visitor
// to choose pauses until answer() picks an option. Every turn ends exactly
// once, with a single THINKING hide marked turnEnd.
'use strict';

var Turn;

{
  const ARROW = ' → ';
  const CANCEL_LINE = '─── cancelled ───';
  const NOTHING_TO_CANCEL = () => {};

  let store = null;
  let lastId = 0;
  // The running turn, as {turn, controller, ask}: `ask` holds the options and
  // callback of the question the turn is paused on, and goes when it does.
  let active = null;

  // Silently supersedes a turn still running: the router only begins one
  // when none is, so this is a safety net, not a path.
  function begin() {
    abortActive();
    lastId += 1;
    const controller = new AbortController();
    active = { turn: createHandle(lastId, controller.signal), controller, ask: null };
    return active.turn;
  }

  // Aborts the running turn while it still counts as current, so its abort
  // listeners can still write (a stream closes through dispatch), then
  // forgets it and any question it was paused on.
  function abortActive() {
    if (active === null) return;
    active.controller.abort();
    active = null;
  }

  function createHandle(id, signal) {
    const turn = Object.freeze({
      id,
      signal,
      isCurrent: () => isActive(turn),
      dispatch: (action) => write(turn, action),
      after: (ms, fn) => schedule(signal, ms, fn),
      busy: (state, label) => write(turn, { type: 'THINKING', state, label }),
      trace: (text) => write(turn, reactStep(text)),
      ask: (question, options, onAnswer) => pause(turn, { question, options, onAnswer }),
      end: (opts) => finish(turn, opts),
    });
    return turn;
  }

  function isActive(turn) {
    return active !== null && active.turn === turn;
  }

  function write(turn, action) {
    if (isActive(turn)) store.dispatch(action);
  }

  // content is escaped for the transcript's HTML; the verb and the raw text
  // feed run-view's step list, which renders them as text.
  function reactStep(text) {
    const arrow = text.indexOf(ARROW);
    const verb = arrow > 0 ? text.slice(0, arrow) : '';
    const message = { role: 'system', type: 'react-step', content: escapeHtml(text), ts: '', noTs: true, verb, text };
    return { type: 'MESSAGE_ADD', message };
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // The timer dies with the turn: an abort disarms it, and a turn that has
  // stopped never arms one.
  function schedule(signal, ms, fn) {
    if (signal.aborted) return NOTHING_TO_CANCEL;
    const timer = setTimeout(() => {
      disarm();
      fn();
    }, ms);
    function disarm() {
      clearTimeout(timer);
      signal.removeEventListener('abort', disarm);
    }
    signal.addEventListener('abort', disarm);
    return disarm;
  }

  function pause(turn, { question, options, onAnswer }) {
    if (!isActive(turn)) return;
    active.ask = { options, onAnswer };
    store.dispatch({ type: 'ASK_USER', question, options });
  }

  // Context decides when the rolling summary is due; /resume ends without
  // one, so the summary it restored survives.
  function finish(turn, { summarize = true } = {}) {
    if (!isActive(turn)) return;
    abortActive();
    store.dispatch({ type: 'THINKING', state: 'hide', turnEnd: true });
    const summary = summarize ? Context.rollingSummary(store.getState()) : null;
    if (summary !== null) store.dispatch({ type: 'SUMMARY_UPDATE', summary });
  }

  function answer(input) {
    if (!isPaused()) return false;
    const { turn, ask } = active;
    const option = choose(ask.options, input);
    active.ask = null;
    turn.dispatch({ type: 'USER_RESPONSE', answer: option });
    ask.onAnswer(option);
    return true;
  }

  // A number is an index: the chooser's buttons pass theirs, and typed text
  // is read as a 0-based one. Anything else, or an index out of range, picks
  // the first option.
  function choose(options, input) {
    const index = typeof input === 'number' ? input : parseInt(input, 10);
    return options[index] ?? options[0];
  }

  // A slash command typed at a paused turn: close the chooser, then end the
  // turn as usual so the command can run.
  function abandon() {
    if (!isPaused()) return;
    const { turn } = active;
    store.dispatch({ type: 'RESUME' });
    turn.end();
  }

  // Stop, from the ■ button or Esc. The hide marks the turn interrupted and
  // RESUME closes a chooser left open.
  function cancel() {
    if (!isBusy()) return;
    abortActive();
    store.dispatch({ type: 'THINKING', state: 'hide', turnEnd: true, cancelled: true });
    store.dispatch({ type: 'RESUME' });
    store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'system', content: CANCEL_LINE, ts: '', noTs: true } });
  }

  function isPaused() {
    return active !== null && active.ask !== null;
  }

  // The store's lock, or a running turn: a restore's WELCOME_DONE clears the
  // lock even while a turn runs.
  function isBusy() {
    return store.getState().ui.isProcessing || active !== null;
  }

  // Aborts under the old store, so a stream closing on the abort closes
  // where it opened.
  function init(nextStore) {
    abortActive();
    store = nextStore;
  }

  Turn = { init, begin, cancel, abandon, answer, isPaused, isBusy };
}
