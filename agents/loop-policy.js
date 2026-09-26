// loop-policy.js — every decision of the agent loop, as one pure function.
// A turn is a run record (plain data) and a stream of events. next(run, event)
// answers each event with a new run and the effects the orchestrator
// performs, in order. It never touches the store, a timer or the page, and
// never mutates its input.
'use strict';

var LoopPolicy;

{
  const MAX_STEPS = 5;
  const STEP_DELAY_MS = 250;
  const FOLLOW_UP_SIMILARITY = 0.4;
  const PERCENT = 100;
  const OBSERVE_CHARS = 100;
  const ASK_QUESTION_CHARS = 240;
  const ASK_OPTION_CHARS = 80;
  const MIN_ASK_OPTIONS = 2;
  const MAX_ASK_OPTIONS = 4;
  const MAX_ASKS = 2;
  const MIN_INTENT_SCORE = 1;
  const MAX_REMAINING_INTENTS = 3;
  const REMAINING_INTENT_SCORE = 0.5;
  const COMPOUND_EXPANSION_SCORE = 80;
  const COMPOUND_EXPANSION_REASON = 'compound query expansion';
  const EXPANDABLE_ACTIONS = new Set(['execute', 'redirect']);
  const DEFAULT_QUESTION = 'What would you like to explore?';
  const OUT_OF_SCOPE_REASON = 'outside portfolio scope';
  // chat, faq and out_of_scope speak for the whole turn: no card to repeat on
  // a follow-up, and no room beside them for a compound question's other tools.
  const NO_CARD_TOOLS = new Set(['chat', 'faq', 'out_of_scope']);
  const NO_MEMORY = Object.freeze({ lastQuery: '', lastTool: '' });
  const NOT_A_FOLLOW_UP = false; // Tools.replyFor's flag: a card's line never opens "Happy to dig deeper."
  const END = Object.freeze({ type: 'end' });
  const FALLBACK = Object.freeze({ type: 'fallback' });

  // ─── Effects ─────────────────────────────────────────────────────────────

  const trace = (text) => ({ type: 'trace', text });
  const dispatch = (action) => ({ type: 'dispatch', action });
  const observe = (fields) => dispatch({ type: 'OBSERVE', ...fields });
  const addMessage = (message) => dispatch({ type: 'MESSAGE_ADD', message });
  const agentSays = (content) => addMessage({ role: 'agent', type: 'faq', content, ts: '' });
  const toolCard = (toolName, content) => addMessage({ role: 'tool', type: 'tool-call', toolName, content, ts: '', noTs: false });
  const reply = (text) => ({ type: 'reply', text });

  // A decision: the run it leaves, and the effects to perform in order.
  const decide = (run, effects) => ({ run, effects });
  const precede = (effects, decision) => decide(decision.run, [...effects, ...decision.effects]);

  // ─── planFor: turn a classify/align decision into a plan ────────────────

  // The router calls this once alignment names a tool, before start(). A
  // compound question gets each extra tool detectExtraTools finds in the
  // text, appended at a fixed score; chat, faq and out_of_scope never
  // expand, and neither does a sink or a rejected decision.
  function planFor(text, decision) {
    const tool = decision.tool || 'out_of_scope';
    const first = { tool, score: decision.confidence, reason: decision.reason };
    if (!EXPANDABLE_ACTIONS.has(decision.action) || NO_CARD_TOOLS.has(tool)) return [first];
    const extras = Tools.detectExtraTools(text, tool)
      .map((extra) => ({ tool: extra, score: COMPOUND_EXPANSION_SCORE, reason: COMPOUND_EXPANSION_REASON }));
    return [first, ...extras];
  }

  // ─── Plan ────────────────────────────────────────────────────────────────

  // memory is the last turn's {lastQuery, lastTool}, which the follow-up
  // guard reads; the orchestrator carries it from one turn to the next.
  function start(query, plan, memory = NO_MEMORY) {
    const capped = plan.slice(0, MAX_STEPS);
    const run = { query, plan: capped, index: 0, steps: 0, results: [], tried: {}, asks: 0, covered: {}, memory };
    const tools = capped.map((item) => item.tool).join(' → ');
    return precede([dispatch({ type: 'PLAN_START', plan: capped }), trace(`plan → ${tools}`)], advance(run, 0));
  }

  // Runs plan[index] once the step delay has passed.
  function advance(run, index) {
    const tool = run.plan[index]?.tool;
    if (!tool || run.steps >= MAX_STEPS) return finish(run);
    const steps = run.steps + 1;
    return decide({ ...run, steps, covered: { ...run.covered, [tool]: true } }, [
      dispatch({ type: 'WM_STEP', tool }),
      { type: 'busy', state: 'executing', label: `step ${steps}/${MAX_STEPS}: ${tool}` },
      { type: 'wait', ms: STEP_DELAY_MS, event: { type: 'due', index } },
    ]);
  }

  // ─── due: think, then act ────────────────────────────────────────────────

  function onDue(run, event) {
    const { index } = event;
    const tool = run.plan[index].tool;
    const current = { ...run, index };
    const think = trace(`think → step ${index + 1}/${run.plan.length} · next: ${tool}`);
    const similarity = wordSimilarity(run.query, run.memory.lastQuery);
    if (isFollowUp(current, tool, similarity)) {
      const percent = Math.round(similarity * PERCENT);
      return decide(current, [think, trace(`think → contextual follow-up (similarity ${percent}%), using context`), reply(run.query)]);
    }
    return precede([think], stepFor({ ...current, memory: { lastQuery: run.query, lastTool: tool } }, tool));
  }

  // A question close to the last one that lands on the same tool is a
  // follow-up: the reply answers it from the conversation instead of showing
  // the same card again. A slash command or an exact repeat is a deliberate
  // re-ask, and chat, faq and out_of_scope show no card to repeat.
  function isFollowUp(run, tool, similarity) {
    const { query, memory } = run;
    return !Tools.isSlash(query) && !sameText(query, memory.lastQuery) && similarity > FOLLOW_UP_SIMILARITY
      && tool === memory.lastTool && run.results.length === 0 && !NO_CARD_TOOLS.has(tool);
  }

  // The share of the question's words (three letters or more) that the
  // previous question also used, over the longer question's word count.
  function wordSimilarity(query, previous) {
    const words = wordsOf(query);
    const earlier = wordsOf(previous);
    const shared = words.filter((word) => earlier.includes(word)).length;
    return shared / Math.max(words.length, earlier.length, 1);
  }

  const wordsOf = (text) => (text || '').toLowerCase().match(/[a-z]{3,}/g) || [];
  const sameText = (one, other) => (one || '').trim().toLowerCase() === (other || '').trim().toLowerCase();

  // A switch, not a lookup table: tool names come from what the visitor
  // typed, and /constructor must not find Object.prototype's.
  function stepFor(run, tool) {
    switch (tool) {
      case 'chat': return generate(run);
      case 'out_of_scope': return sink(run);
      case 'stop': return stopHere(run);
      default: return decide(run, [{ type: 'act', tool, input: run.query }]);
    }
  }

  function generate(run) {
    return decide(run, [
      trace('generate → local model with trusted context'),
      observe({ tool: 'chat', satisfied: null, confidence: null, reason: 'awaiting grounded generation' }),
      reply(run.query),
    ]);
  }

  function sink(run) {
    const reason = run.plan[run.index].reason || OUT_OF_SCOPE_REASON;
    return precede([
      trace(`sink → out_of_scope (${reason})`),
      observe({ tool: 'out_of_scope', satisfied: true, confidence: 1, reason }),
      agentSays(Tools.outOfScopeMessage()),
    ], finish(run));
  }

  function stopHere(run) {
    return precede([observe({ tool: 'stop', satisfied: true, confidence: 1, reason: 'stop' })], finish(run));
  }

  // ─── acted: observe the result ───────────────────────────────────────────

  function onActed(run, event) {
    const { result } = event;
    const tool = run.plan[run.index].tool;
    if (!result) return tool === 'faq' && !run.tried.chat ? chatAfterFaqMiss(run) : unknownCommand(run, tool);
    if (result.interactive && result.toolName === 'ask_user') return askVisitor(run, result);
    if (result.redirect) return decide(run, [{ type: 'open', result }, END]);
    return observeCard(run, tool, result);
  }

  // An FAQ miss hands the question to chat, once a turn.
  function chatAfterFaqMiss(run) {
    const handedOver = { ...run, tried: { ...run.tried, chat: true }, plan: [...run.plan, { tool: 'chat', score: 0 }] };
    return precede([
      dispatch({ type: 'WM_FALLBACK', tool: 'chat' }),
      observe({ tool: 'faq', satisfied: false, confidence: 0, reason: 'no match' }),
    ], advance(handedOver, run.index + 1));
  }

  // Any other tool that finds nothing is a command that doesn't exist, typed
  // by the visitor or sent in a link, so its name is escaped into the card.
  function unknownCommand(run, tool) {
    return decide(run, [
      toolCard(tool, `Command /${escapeHtml(tool)} not found. Try /help.`),
      observe({ tool, satisfied: true, confidence: 1, reason: 'unknown-command' }),
      END,
    ]);
  }

  // ask_user pauses the turn on a chooser. With too few options, or once the
  // visitor has answered two this turn, the fallback answers instead.
  function askVisitor(run, result) {
    const data = result.data || {};
    const question = String(data.question || result.content || DEFAULT_QUESTION).slice(0, ASK_QUESTION_CHARS);
    const options = Array.isArray(data.options) ? data.options.slice(0, MAX_ASK_OPTIONS).map(optionLabel) : [];
    if (options.length < MIN_ASK_OPTIONS || run.asks >= MAX_ASKS) return decide(run, [FALLBACK, END]);
    return decide(run, [
      observe({ tool: 'ask_user', data: { question, options }, satisfied: null, reason: 'awaiting visitor choice' }),
      { type: 'ask', question, options },
    ]);
  }

  const optionLabel = (option) => String(option).slice(0, ASK_OPTION_CHARS);

  // Every registry tool but ask_user is self-contained: its card is the whole
  // answer, so it passes evaluation without a model check.
  function observeCard(run, tool, result) {
    const shown = { ...run, results: [...run.results, result] };
    const effects = [trace(`act → ${tool} ✓`), ...observeTrace(result.content), observe({ tool, data: result.data }), show(result)];
    if (!Evaluator.isSelfContained(tool)) return precede(effects, finish(shown));
    const passed = [observe({ tool, satisfied: true, confidence: 1, reason: 'self-contained' }), trace('eval → pass · self-contained')];
    return precede([...effects, ...passed], continueAfter(shown));
  }

  function observeTrace(content) {
    const text = Context.plainText(content, OBSERVE_CHARS);
    return text ? [trace(`observe → ${text}${text.length >= OBSERVE_CHARS ? '...' : ''}`)] : [];
  }

  // An FAQ answer reads as the agent speaking; any other result is a card.
  const show = (result) => (result.toolName === 'faq' ? agentSays(result.content) : toolCard(result.toolName, result.content));

  // ─── next: after a card passes ───────────────────────────────────────────

  // The first rule that applies: run the next planned tool the turn has no
  // card from yet, tracing a recovery only when that skips steps; otherwise
  // run the next step; add what a compound question asked for that no step
  // has covered; answer.
  function continueAfter(run) {
    const { plan, index } = run;
    const hasCard = (tool) => run.results.some((result) => result.toolName === tool);
    const skipped = plan.findIndex((item, at) => at > index && !hasCard(item.tool));
    if (skipped === index + 1) return advance(run, skipped);
    if (skipped !== -1) return precede([trace(`recover → skipped ${plan[skipped].tool} found, resuming`)], advance(run, skipped));
    if (index + 1 < plan.length) return advance(run, index + 1);
    const remaining = run.steps < MAX_STEPS ? remainingIntents(run) : [];
    if (!remaining.length) return finish(run);
    const added = remaining.map((tool) => ({ tool, score: REMAINING_INTENT_SCORE }));
    return advance({ ...run, plan: [...plan, ...added] }, index + 1);
  }

  // The tools a compound question asks for that no step has covered or planned.
  function remainingIntents(run) {
    if (!Tools.isCompound(run.query)) return [];
    const planned = run.plan.map((item) => item.tool);
    return Tools.getTopIntents(run.query)
      .filter((intent) => intent.score >= MIN_INTENT_SCORE && !run.covered[intent.tool] && !planned.includes(intent.tool))
      .slice(0, MAX_REMAINING_INTENTS)
      .map((intent) => intent.tool);
  }

  // ─── failed: the tool threw ──────────────────────────────────────────────

  // message is the error's own; text, String(error), names one without it.
  function onFailed(run, event) {
    const { message, text } = event;
    const tool = run.plan[run.index].tool;
    return decide(run, [
      trace(`act → ${tool} ✗ ${message || 'tool error'}`),
      toolCard(tool, `Command /${escapeHtml(tool)} failed: ${escapeHtml(message || 'unknown error')}`),
      observe({ tool, satisfied: false, confidence: 0, error: `Tool error: ${message || text}`, reason: 'tool-error' }),
      END,
    ]);
  }

  // ─── answered: the visitor chose ─────────────────────────────────────────

  // The choice routes like a question of its own: its top intent runs next,
  // and one no tool matches goes to the reply.
  function onAnswered(run, event) {
    const { option } = event;
    const asked = { ...run, asks: run.asks + 1 };
    const [intent] = Tools.getTopIntents(option);
    const effects = [
      addMessage({ role: 'system', type: 'system', content: `─── selected: ${option} ───`, ts: '', noTs: true }),
      dispatch({ type: 'WM_ASK_COUNT' }),
      { type: 'busy', state: 'classifying', label: `routing ${option.toLowerCase()}` },
    ];
    if (!intent) return decide(asked, [...effects, reply(option)]);
    const routed = { ...asked, plan: [...run.plan, { tool: intent.tool, score: intent.score }] };
    return precede(effects, advance(routed, run.index + 1));
  }

  // ─── answer ──────────────────────────────────────────────────────────────

  // One persona line per distinct self-contained tool the turn showed: the
  // templates speak every fact, never the model. A multi-step turn also
  // traces its tally.
  function finish(run) {
    const count = run.results.length;
    const tally = count > 1 ? [trace(`── ${count} results · ${run.steps} steps ──`), trace(`stop → ${count} results ready`)] : [];
    return decide(run, [...spokenAnswer(run.results), ...tally, END]);
  }

  function spokenAnswer(results) {
    const lines = firstOfEachTool(results)
      .filter((result) => Evaluator.isSelfContained(result.toolName))
      .map((result) => Tools.replyFor(result.toolName, NOT_A_FOLLOW_UP, result.data))
      .filter(Boolean);
    if (!lines.length) return [];
    return [addMessage({ role: 'agent', type: 'llm-summary', content: `<div class="llm-summary">${lines.join(' ')}</div>`, ts: '' })];
  }

  const firstOfEachTool = (results) =>
    results.filter((result, index) => results.findIndex((other) => other.toolName === result.toolName) === index);

  // Tool names and error messages reach cards that renderer.js writes as HTML.
  const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const ON_EVENT = { due: onDue, acted: onActed, failed: onFailed, answered: onAnswered };

  function next(run, event) {
    return ON_EVENT[event.type](run, event);
  }

  LoopPolicy = { planFor, start, next };
}
