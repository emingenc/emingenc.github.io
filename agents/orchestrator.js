// orchestrator.js — the agent loop. Every turn runs
//
//   plan → act → observe → evaluate → next | answer
//
// and this file performs it, effect by effect. LoopPolicy decides: it answers
// each event with a new run record and the effects to perform, in order.
// Turn owns the turn's lifecycle (its lock, timers, pause and single end),
// Reply speaks when no tool answers, and Context owns the prompt the model
// sees. Between turns the loop keeps only its follow-up memory.
'use strict';

var Orchestrator;

{
  const NO_MEMORY = Object.freeze({ lastQuery: '', lastTool: '' });

  // The last question a step ran for, and its tool: the policy's follow-up
  // guard compares the next question with them.
  let memory = NO_MEMORY;
  let opener = null;

  // The router has begun the turn, echoed the question and planned it.
  function run(turn, query, plan) {
    perform(turn, LoopPolicy.start(query, plan, memory));
  }

  // Performs a decision's effects in order, and stops the moment the turn
  // does: Stop, a supersede, or an effect that ended it. A wait, an act or
  // an ask closes its decision; the event it yields, at once or later, goes
  // back to the policy for the next one.
  function perform(turn, decision) {
    memory = decision.run.memory;
    const feed = (event) => perform(turn, LoopPolicy.next(decision.run, event));
    for (const effect of decision.effects) {
      if (!turn.isCurrent()) return;
      EFFECTS[effect.type](turn, effect, feed);
    }
  }

  // How each effect is performed. A reply ends the turn itself once it has
  // spoken; the fallback picks its line at random, which is why the pure
  // policy leaves it to this table.
  const EFFECTS = {
    trace: (turn, { text }) => turn.trace(text),
    dispatch: (turn, { action }) => turn.dispatch(action),
    busy: (turn, { state, label }) => turn.busy(state, label),
    wait: (turn, { ms, event }, feed) => turn.after(ms, () => feed(event)),
    act: (turn, { tool, input }, feed) => feed(act(tool, input)),
    ask: (turn, { question, options }, feed) => turn.ask(question, options, (option) => feed({ type: 'answered', option })),
    reply: (turn, { text }) => Reply.send(turn, text),
    fallback: (turn) => turn.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: Tools.faqFallback(), ts: '' } }),
    open: (turn, { result }) => openOrNavigate(turn, result),
    end: (turn) => turn.end(),
  };

  // faq is the FAQ's lookup rather than a registry tool, but it too gives a
  // tool result, or null for nothing found. A tool that throws fails its
  // step, and the policy observes the error instead of an answer; a thrown
  // non-Error has no message, so its String names it.
  function act(tool, input) {
    try {
      return { type: 'acted', result: tool === 'faq' ? Tools.faqMatch(input) : Tools.execute(tool, input) };
    } catch (error) {
      return { type: 'failed', message: error?.message, text: String(error) };
    }
  }

  // agent-ui shows a post or the game as a card in the turn when it can;
  // without an opener, or when it declines, the page navigates there.
  function openOrNavigate(turn, result) {
    if (opener?.(result)) turn.trace(`open → ${result.redirect}`);
    else location.href = result.redirect;
  }

  function setOpener(fn) {
    opener = fn;
  }

  // /clear and /new start the conversation over.
  function resetFollowupState() {
    memory = NO_MEMORY;
  }

  // The loop keeps no store of its own: every write goes through the turn.
  // A new conversation clears the follow-up memory carried between turns.
  Orchestrator = { run, setOpener, resetFollowupState };
}
