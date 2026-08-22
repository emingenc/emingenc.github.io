// orchestrator.js — ReAct agent loop: execute → evaluate → replan → stop
var Orchestrator = (function() {
  "use strict";
  var store = null;
  var MAX_ITERATIONS = 5;
  var currentTurnId = 0; // increments per handleInput, gates stale async callbacks
  var processingTurnId = 0; // which turn currently holds the isProcessing lock
  var genTimeouts = {}; // {msgId: timeout} for LLM generation timeout safety
  var pendingGenerations = {}; // {msgId: {turnId, question, results}} awaiting grounded evaluation
  var lastUserQuery = ''; // previous user query — for follow-up detection
  var lastUserTool = '';  // tool that handled the previous query

  function findMessage(id) {
    var messages = store.getState().messages;
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].id === id) return messages[i];
    }
    return null;
  }

  function handleGenerationDone(msgId) {
    var pending = pendingGenerations[msgId];
    if (!pending) return false;
    delete pendingGenerations[msgId];
    if (!validTurn(pending.turnId)) return true;
    var msg = findMessage(msgId);
    var generated = msg ? (msg.content || '') : '';
    var result = { toolName: 'chat', content: generated, data: null };
    trace(pending.turnId, 'eval → grounded chat response');
    store.dispatch({ type: 'THINKING', state: 'evaluating', label: 'checking grounded response' });
    Evaluator.evaluate(pending.question, [result], pending.turnId).then(function(eval_) {
      if (!validTurn(pending.turnId)) return;
      var accepted = eval_.stop && eval_.confidence >= 60 &&
        (!Evaluator.groundedAgainstProfile || Evaluator.groundedAgainstProfile(generated));
      trace(pending.turnId, 'eval → ' + (accepted ? 'grounded pass' : 'replan') + ' · confidence ' + (eval_.confidence || 0));
      if (accepted && eval_.summary) {
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'llm-summary', content: '<div class="llm-summary">' + escapeHtml(eval_.summary) + '</div>', ts: '' }});
      } else {
        var faq = Tools.faqMatch(pending.question);
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: faq ? faq.content : 'I don\'t have enough verified information to answer that reliably.', ts: '' }});
      }
      trace(pending.turnId, accepted ? 'stop → grounded summary ready' : 'stop → unsupported claim rejected');
      done(pending.turnId);
    }).catch(function(err) {
      if (!validTurn(pending.turnId)) return;
      trace(pending.turnId, 'eval → error, stopping turn');
      done(pending.turnId);
    });
    return true;
  }

  function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ─── Conversation buffer (derived from store messages) ──────
  function getConversationBuffer(maxTokens) {
    if (maxTokens === undefined) maxTokens = 2500;
    var msgs = store.getState().messages;
    var buf = [];
    for (var i = Math.max(0, msgs.length - 12); i < msgs.length; i++) {
      var m = msgs[i];
      if (m.role === 'user' || m.role === 'agent' || m.role === 'tool') {
        var clean = (m.content || '').replace(/<[^>]*>/g, ' ').replace(/[^\w\s.,;:!?@#&()\[\]{}\/"'-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
        if (clean) buf.push({ role: m.role, content: clean });
      }
    }
    // Estimate tokens as chars/4; truncate oldest messages first when over budget
    var totalTokens = 0;
    for (var j = 0; j < buf.length; j++) {
      totalTokens += Math.ceil(buf[j].content.length / 4);
    }
    while (totalTokens > maxTokens && buf.length > 0) {
      var removed = buf.shift();
      totalTokens -= Math.ceil(removed.content.length / 4);
    }
    return buf;
  }

  function validTurn(turnId) {
    return turnId === currentTurnId;
  }

  function trace(turnId, text) {
    if (turnId && !validTurn(turnId)) return;
    store.dispatch({ type: 'MESSAGE_ADD', message: {
      role: 'system', type: 'react-step', content: escapeHtml(text), ts: '', noTs: true
    }});
  }

  // ─── Done callback (turn-aware) ────────────────────────────
  function done(turnId) {
    // Only release the lock if this turn still owns it
    if (turnId !== undefined && turnId !== processingTurnId) return;
    processingTurnId = 0;
    store.dispatch({ type: 'THINKING', state: 'hide' });
  }

  // Compound query detection: find intents the user asked for but haven't been covered yet
  function getRemainingIntents(userText, coveredTools, planTools) {
    if (!Tools.isCompound(userText)) return [];
    var topIntents = Tools.getTopIntents(userText);
    var remaining = [];
    for (var i = 0; i < topIntents.length; i++) {
      if (!coveredTools[topIntents[i].tool] && topIntents[i].score >= 1) {
        // Avoid duplicating tools already in the plan (from detectExtraTools)
        if (planTools && planTools.indexOf(topIntents[i].tool) !== -1) continue;
        remaining.push(topIntents[i].tool);
      }
    }
    return remaining.slice(0, 3);
  }

  // Collect compact error strings from workingMemory observations for evaluation context
  function getGenerationContext(results) {
    var parts = [Tools.profileFacts()];
    if (results && results.length) {
      parts.push('CURRENT TOOL RESULTS: ' + results.map(function(r) {
        return (r.toolName || 'tool') + ': ' + (r.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
      }).join(' | '));
    }
    var conversation = getConversationBuffer(900);
    if (conversation.length) {
      parts.push('RECENT CONVERSATION: ' + conversation.map(function(m) { return m.role + ': ' + m.content; }).join(' | '));
    }
    return parts.join('\n');
  }

  function getCompactErrors() {
    var wm = store.getState().workingMemory;
    if (!wm || !wm.observations) return [];
    var errors = [];
    for (var i = 0; i < wm.observations.length; i++) {
      var obs = wm.observations[i];
      if ((obs.error || obs.satisfied === false) && obs.compactError) {
        errors.push(obs.compactError);
      }
    }
    return errors;
  }

  // Stop: synthesize final answer. summary = LLM-polished text (optional)
  function stopAndSummarize(results, errors, userText, turnId, summary) {
    if (turnId && !validTurn(turnId)) return; // stale callback, discard
    store.dispatch({ type: 'THINKING', state: 'hide' });

    if (errors.length > 0 && results.length === 0) {
      // Everything failed — try FAQ as last resort
      store.dispatch({ type: 'PLAN_DONE' });
      var lastFAQ = Tools.faqMatch(userText);
      if (lastFAQ) {
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: lastFAQ.content, ts: '' }});
      } else {
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: Tools.faqFallback(), ts: '' }});
      }
      done();
      return;
    }

    // Render LLM-polished summary as the final answer.
    // Skip for single self-contained tool results — the tool block already shows the data.
    var isSingleSelfContained = results.length === 1 && Evaluator.isSelfContained(results[0].toolName);

    // Persona prose for self-contained single tool results: the card is the
    // data appendix, but the chat needs a spoken answer. Deterministic
    // templates (the 360M model must never be the voice for facts).
    if (isSingleSelfContained && results.length === 1) {
      var prose = Tools.replyFor(results[0].toolName, false);
      if (prose) {
        store.dispatch({ type: 'MESSAGE_ADD', message: {
          role: 'agent', type: 'llm-summary',
          content: '<div class="llm-summary">' + prose + '</div>', ts: ''
        }});
      }
    }
    var finalSummary = null;
    if (summary && summary.length > 10) {
      // Clean the summary: strip box-drawing chars and unicode decorations
      finalSummary = summary
        .replace(/[^\w\s.,;:!?@#&()\[\]{}\/"'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (finalSummary.length <= 10) finalSummary = null;
    }
    // Only extract fallback summary for multi-result or non-self-contained tools
    if (!finalSummary && results.length > 0 && !isSingleSelfContained) {
      // Fallback: extract clean text from last tool result
      var lastContent = results[results.length - 1].content || '';
      finalSummary = lastContent
        .replace(/<[^>]*>/g, ' ')
        .replace(/[^\w\s.,;:!?@#&()\[\]{}\/"'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 400);
      if (finalSummary.length <= 10) finalSummary = null;
    }
    if (finalSummary && !isSingleSelfContained) {
      var sourceText = results.map(function(r) { return r.content || ''; }).join(' ');
      var summaryAccepted = !Evaluator.entityPreserved || Evaluator.entityPreserved(sourceText, finalSummary);
      if (summaryAccepted) {
        store.dispatch({ type: 'MESSAGE_ADD', message: {
          role: 'agent', type: 'llm-summary',
          content: '<div class="llm-summary">' + escapeHtml(finalSummary) + '</div>',
          ts: ''
        }});
      } else {
        trace(turnId, 'summary → retained source result (entity check failed)');
      }
    }

    // Multi-step summary
    if (results.length > 1) {
      store.dispatch({ type: 'MESSAGE_ADD', message: {
        role: 'system', type: 'system',
        content: '── ' + results.length + ' result' + (results.length > 1 ? 's' : '') + ' · ' + store.getState().workingMemory.steps + ' step' + (store.getState().workingMemory.steps > 1 ? 's' : '') + ' ──',
        ts: '', noTs: true
      }});
    }

    // Single-step: eval already said pass — skip redundant stop trace
    if (results.length > 1) trace(turnId, 'stop → ' + results.length + ' results ready');
    store.dispatch({ type: 'PLAN_DONE' });
    done();
  }

  // Smart ReAct loop: execute → evaluate → replan → stop
  function runSmartLoop(intents, userText, turnId) {
    var results = [];
    var errors = [];
    var plan = intents.slice(0, MAX_ITERATIONS);
    store.dispatch({ type: 'PLAN_START', plan: plan });
    trace(turnId, 'plan → ' + plan.map(function(p) { return p.tool; }).join(' → '));

    function step(idx) {
      if (!validTurn(turnId)) return; // stale
      if (idx >= plan.length || store.getState().workingMemory.steps >= MAX_ITERATIONS) {
        return stopAndSummarize(results, errors, userText, turnId, null);
      }

      var stepItem = plan[idx];
      if (!stepItem || !stepItem.tool) { return stopAndSummarize(results, errors, userText, turnId, null); }
      var toolName = stepItem.tool;
      store.dispatch({ type: 'WM_STEP', tool: toolName });

      store.dispatch({ type: 'THINKING', state: 'executing', label: 'step ' + store.getState().workingMemory.steps + '/' + MAX_ITERATIONS + ': ' + toolName });

      setTimeout(function() {
        if (!validTurn(turnId)) { done(turnId); return; }

        // ── THINK: reasoning before action ──
        var stepPlan = plan.map(function(p) { return p.tool; });
        trace(turnId, 'think → step ' + (idx + 1) + '/' + plan.length + ' · next: ' + toolName);

        // ── Don't re-execute the same tool for genuine follow-ups ──
        // Compare current query to the last query using word overlap.
        // Only skip when: same topic (high similarity), same tool, first step.
        // Different questions that route to the same tool execute normally.
        var currentWords = (userText || '').toLowerCase().match(/[a-z]{3,}/g) || [];
        var lastWords = (lastUserQuery || '').toLowerCase().match(/[a-z]{3,}/g) || [];
        var sharedCount = 0;
        for (var ci = 0; ci < currentWords.length; ci++) {
          for (var li = 0; li < lastWords.length; li++) {
            if (currentWords[ci] === lastWords[li]) { sharedCount++; break; }
          }
        }
        var maxLen = Math.max(currentWords.length, lastWords.length, 1);
        var querySimilarity = sharedCount / maxLen;
        // An exact repeat of the previous input is a deliberate re-ask, not a
        // follow-up — re-execute deterministically instead of hijacking into the
        // chat/LLM fallback (which surfaced "model downloading…" on a repeated
        // /about or a repeated unknown command like /foobar).
        var isExactRepeat = (userText || '').trim().toLowerCase() === (lastUserQuery || '').trim().toLowerCase();
        // Slash commands are explicit directives, never conversational follow-ups.
        // Two consecutive slash commands that route to the same tool (e.g. /game
        // hack-overflow then /game <unknown-id>) must each execute deterministically;
        // high word-overlap must not hijack them into the chat/LLM fallback.
        var isSlashCmd = Tools.isSlash(userText);
        var isGenuineFollowup = !isSlashCmd && !isExactRepeat && querySimilarity > 0.4 && toolName === lastUserTool && results.length === 0;

        if (isGenuineFollowup && toolName !== 'chat' && toolName !== 'faq' && toolName !== 'out_of_scope') {
          trace(turnId, 'think → contextual follow-up (similarity ' + Math.round(querySimilarity*100) + '%), using context');
          runFallback(userText, turnId);
          return;
        }

        // Track what the user asked last — only after guard passes
        lastUserQuery = userText;
        lastUserTool = toolName;

        // ── Execute: faq, chat, or standard tool ──
        var result;
        if (toolName === 'faq') {
          // FAQ tool: keyword match against knowledge base
          var faqMatch = Tools.faqMatch(userText);
          result = faqMatch ? { toolName: 'faq', content: faqMatch.content, data: null }
                            : null;
          if (result) {
            store.dispatch({ type: 'THINKING', state: 'hide' });
          }
        } else if (toolName === 'chat') {
          // Chat still enters the generation → grounded-evaluation path.
          trace(turnId, 'generate → local model with trusted context');
          runFallback(userText, turnId);
          store.dispatch({ type: 'OBSERVE', tool: 'chat', satisfied: null, confidence: null, reason: 'awaiting grounded generation' });
          return; // generation completion invokes evaluator and finalizes the turn
        } else if (toolName === 'out_of_scope') {
          trace(turnId, 'sink → out_of_scope (' + (plan[idx].reason || 'outside portfolio scope') + ')');
          store.dispatch({ type: 'OBSERVE', tool: 'out_of_scope', satisfied: true, confidence: 1, reason: plan[idx].reason || 'outside portfolio scope' });
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: Tools.outOfScopeMessage(), ts: '' }});
          return stopAndSummarize(results, errors, userText, turnId, null);
        } else if (toolName === 'stop') {
          // Stop tool: terminal — end the loop
          store.dispatch({ type: 'OBSERVE', tool: 'stop', satisfied: true, confidence: 1, reason: 'stop' });
          return stopAndSummarize(results, errors, userText, turnId, null);
        } else {
          try {
            result = Tools.execute(toolName, plan[idx].modelInput || userText);
          } catch (execErr) {
            trace(turnId, 'act → ' + toolName + ' ✗ ' + (execErr.message || 'tool error'));
            errors.push({ tool: toolName, error: 'Tool error: ' + (execErr.message || String(execErr)) });
            store.dispatch({ type: 'MESSAGE_ADD', message: {
              role: 'tool', type: 'tool-call', toolName: toolName,
              content: 'Command /' + toolName + ' failed: ' + (execErr.message || 'unknown error'), ts: '', noTs: false
            }});
            store.dispatch({ type: 'OBSERVE', tool: toolName, satisfied: true, confidence: 1, reason: 'tool-error' });
            store.dispatch({ type: 'PLAN_DONE' });
            done(turnId);
            return;
          }
        }

        if (result && result.interactive && result.toolName === 'ask_user') {
          var askData = result.data || {};
          var askQuestion = String(askData.question || result.content || 'What would you like to explore?').slice(0, 240);
          var askOptions = Array.isArray(askData.options) ? askData.options.slice(0, 4).map(function(o) { return String(o).slice(0, 80); }) : [];
          if (askOptions.length < 2 || store.getState().workingMemory.askCount >= 2) {
            store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: Tools.faqFallback(), ts: '' }});
            return done(turnId);
          }
          store.dispatch({ type: 'OBSERVE', tool: 'ask_user', data: { question: askQuestion, options: askOptions }, satisfied: null, reason: 'awaiting visitor choice' });
          store.dispatch({ type: 'ASK_USER', question: askQuestion, options: askOptions });
          if (typeof Router !== 'undefined' && Router._setHumanCallback) {
            Router._setHumanCallback(function(answer) {
              if (!validTurn(turnId)) return;
              var chosen = askOptions[answer] || askOptions[0];
              store.dispatch({ type: 'USER_RESPONSE', answer: chosen });
              store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'system', content: '─── selected: ' + chosen + ' ───', ts: '', noTs: true }});
              store.dispatch({ type: 'WM_ASK_COUNT' });
              store.dispatch({ type: 'THINKING', state: 'classifying', label: 'routing ' + chosen.toLowerCase() });
              var next = Tools.getTopIntents(chosen);
              if (next.length) {
                plan.push({ tool: next[0].tool, score: next[0].score });
                step(idx + 1);
              } else {
                runFallback(chosen, turnId);
              }
            });
          }
          return;
        }

        if (result && result.redirect) {
          window.location.href = result.redirect;
          done();
          return;
        }

        // ── Handle null results: faq→chat cascade ──
        if (!result) {
          // FAQ found nothing → try chat
          if (toolName === 'faq' && !store.getState().workingMemory.triedFallbacks['chat']) {
            store.dispatch({ type: 'WM_FALLBACK', tool: 'chat' });
            store.dispatch({ type: 'OBSERVE', tool: 'faq', satisfied: false, confidence: 0, reason: 'no match' });
            plan.push({ tool: 'chat', score: 0 });
            return step(idx + 1);
          }
          // Unknown tool (slash command typo) — show error and stop cleanly.
          // Do NOT route through stopAndSummarize: it would append a redundant
          // generic FAQ fallback after the "not found" message. Mirrors the
          // tool-error path above (PLAN_DONE + done()).
          errors.push({ tool: toolName, error: 'Tool not found' });
          store.dispatch({ type: 'MESSAGE_ADD', message: {
            role: 'tool', type: 'tool-call', toolName: toolName,
            content: 'Command /' + toolName + ' not found. Try /help.', ts: '', noTs: false
          }});
          store.dispatch({ type: 'OBSERVE', tool: toolName, satisfied: true, confidence: 1, reason: 'unknown-command' });
          store.dispatch({ type: 'PLAN_DONE' });
          done(turnId);
          return;
        }

        // ── Successful execution → record result ──
        trace(turnId, 'act → ' + toolName + ' ✓');
        // OBSERVE: clean one-liner summary (strip HTML, box-drawing, extra whitespace)
        var observeSummary = (result.content || '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/[^\w\s.,;:!?@#&()\[\]{}\/"'-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100);
        if (observeSummary) trace(turnId, 'observe → ' + observeSummary + (observeSummary.length >= 100 ? '...' : ''));
        store.dispatch({ type: 'OBSERVE', tool: toolName, data: result.data });
        results.push(result);
        // FAQ responses render as natural chat, tools render as tool blocks
        if (result.toolName === 'faq') {
          store.dispatch({ type: 'MESSAGE_ADD', message: {
            role: 'agent', type: 'faq', content: result.content, ts: ''
          }});
        } else {
          store.dispatch({ type: 'MESSAGE_ADD', message: {
            role: 'tool', type: 'tool-call', toolName: result.toolName, content: result.content, ts: '', noTs: false
          }});
        }

        // ─── Fast path: self-contained tools skip LLM evaluation ───
        // Self-contained tools (about, repos, skills, etc.) return deterministic data.
        // LLM evaluation adds latency without benefit for these tools.
        if (Evaluator.isSelfContained(toolName)) {
          store.dispatch({ type: 'OBSERVE', tool: toolName, satisfied: true, confidence: 1, reason: 'self-contained' });
          trace(turnId, 'eval → pass · self-contained');

          // Check for skipped planned tools before continuing
          var executedTools = {};
          for (var ri = 0; ri < results.length; ri++) {
            executedTools[results[ri].toolName] = true;
          }
          for (var pi = idx + 1; pi < plan.length; pi++) {
            if (!executedTools[plan[pi].tool]) {
              trace(turnId, 'recover → skipped ' + plan[pi].tool + ' found, resuming');
              return step(pi);
            }
          }
          // Continue to next planned step or detect additional compound intents
          if (idx + 1 < plan.length) {
            return step(idx + 1);
          }
          if (store.getState().workingMemory.steps < MAX_ITERATIONS) {
            var planToolNames = plan.map(function(p) { return p.tool; });
            var remaining = getRemainingIntents(userText, store.getState().workingMemory.coveredTools, planToolNames);
            if (remaining.length > 0) {
              for (var ri = 0; ri < remaining.length; ri++) {
                plan.push({ tool: remaining[ri], score: 0.5 });
              }
              return step(idx + 1);
            }
          }

          return stopAndSummarize(results, errors, userText, turnId, null);
        }

        // ─── LLM EVALUATE: semantic quality check + summary generation ───
        trace(turnId, 'eval → checking answer quality');
        store.dispatch({ type: 'THINKING', state: 'evaluating', label: 'evaluating quality' });

        Evaluator.evaluate(userText, results, turnId).then(function(eval_) {
          if (!validTurn(turnId)) { done(turnId); return; }
          store.dispatch({ type: 'THINKING', state: 'hide' });

          var satisfied = eval_.stop && eval_.confidence >= 60;
          trace(turnId, 'eval → ' + (satisfied ? 'pass' : 'replan') + ' · confidence ' + (eval_.confidence || 0));
          store.dispatch({ type: 'OBSERVE', tool: toolName, satisfied: satisfied, confidence: eval_.confidence, reason: 'llm-eval' });

          if (satisfied) {
            // Check for unexecuted planned tools (use results, not coveredTools)
            var executedTools = {};
            for (var ri = 0; ri < results.length; ri++) {
              executedTools[results[ri].toolName] = true;
            }
            for (var pi = idx + 1; pi < plan.length; pi++) {
              if (!executedTools[plan[pi].tool]) {
                trace(turnId, 'recover → skipped ' + plan[pi].tool + ' found, resuming');
                return step(pi);
              }
            }
            // Continue to next planned step if there are more tools in the plan
            if (idx + 1 < plan.length) return step(idx + 1);
            // LLM confirmed the answer is good — render its polished summary
            return stopAndSummarize(results, errors, userText, turnId, eval_.summary);
          }

          // ─── REPLAN: LLM wasn't satisfied — suggest next tool ───
          var modelNextTool = eval_.nextTool || '';
          var nextMeta = modelNextTool ? Tools.getTool(modelNextTool) : null;
          if (modelNextTool === 'ask_user' && nextMeta && nextMeta.interactive) {
            trace(turnId, 'replan → ask_user · model suggested');
            plan.push({ tool: 'ask_user', score: eval_.confidence || 0, modelInput: eval_.next || userText });
            return step(idx + 1);
          }
          // Try keyword-matched tools before falling to FAQ
          if (modelNextTool && nextMeta && modelNextTool !== 'faq' && modelNextTool !== 'chat' && modelNextTool !== 'stop') {
            trace(turnId, 'replan → ' + modelNextTool + ' · model suggested');
            plan.push({ tool: modelNextTool, score: eval_.confidence || 0 });
            return step(idx + 1);
          }
          if (!store.getState().workingMemory.triedFallbacks['faq']) {
            store.dispatch({ type: 'WM_FALLBACK', tool: 'faq' });
            var refinedQuery = eval_.next || userText;
            var faqResult = Tools.faqMatch(refinedQuery);
            if (faqResult) {
              store.dispatch({ type: 'THINKING', state: 'executing', label: 'faq fallback' });
              store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: faqResult.content, ts: '' }});
              results.push({ toolName: 'faq', content: faqResult.content, data: null });
              // Evaluate the FAQ fallback too
              store.dispatch({ type: 'THINKING', state: 'evaluating', label: 'checking FAQ quality' });
              Evaluator.evaluate(userText, results, turnId).then(function(eval2) {
                if (!validTurn(turnId)) { done(turnId); return; }
                store.dispatch({ type: 'THINKING', state: 'hide' });
                return stopAndSummarize(results, errors, userText, turnId, eval2.summary);
              }).catch(function(err) {
                if (!validTurn(turnId)) { done(turnId); return; }
                store.dispatch({ type: 'THINKING', state: 'hide' });
                stopAndSummarize(results, errors, userText, turnId, null);
              });
              return;
            }
          }

          // Try LLM generation as last resort (lazy-init if needed)
          if (!store.getState().workingMemory.triedFallbacks['llm'] && Classifier.hasLLMConsent()) {
            if (!Classifier.isLLMReady()) {
              if (!store.getState().models.llmLoading) Classifier.enableLLM();
              store.dispatch({ type: 'WM_FALLBACK', tool: 'llm' });
              return stopAndSummarize(results, errors, userText, turnId, null);
            }
            store.dispatch({ type: 'WM_FALLBACK', tool: 'llm' });
            store.dispatch({ type: 'THINKING', state: 'responding', label: 'generating with LLM' });
            var _llmWorker = Classifier._getLLMWorker ? Classifier._getLLMWorker() : null;
            if (!_llmWorker) {
              store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: Tools.faqFallback(), ts: '' }});
              return done(turnId);
            }
            var msgId = 'msg_' + turnId + '_' + Date.now();
            store.dispatch({ type: 'MESSAGE_ADD', message: { id: msgId, role: 'agent', type: 'stream', content: '', ts: '', _streaming: true }});
            pendingGenerations[msgId] = { turnId: turnId, question: userText, results: results.slice() };
            _llmWorker.postMessage({ type: 'generate', text: eval_.next || userText, context: getGenerationContext(results), requestId: msgId });
            genTimeouts[msgId] = setTimeout(function() {
              if (!validTurn(turnId)) return;
              delete genTimeouts[msgId];
              store.dispatch({ type: 'MESSAGE_STREAM_DONE', id: msgId });
              store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'system', content: '─── generation timed out ───', ts: '', noTs: true }});
              done();
            }, 45000);
            return;
          }

          // Nothing left to try — stop with what we have
          return stopAndSummarize(results, errors, userText, turnId, null);
        }).catch(function(err) {
          if (!validTurn(turnId)) { done(turnId); return; }
          trace(turnId, 'eval → error, stopping turn');
          stopAndSummarize(results, errors, userText, turnId, null);
        });

      }, 250);
    }

    step(0);
  }

  // Single tool — shortcut through smart ReAct loop
  function runSingleTool(name, fullText, turnId) {
    runSmartLoop([{ tool: name, score: 1.0 }], fullText, turnId);
  }

  // ─── FAQ / Fallback ───────────────────────────────────────
  // Needle handles FAQ classification. This is only reached if Needle returns 'chat' or times out.
  function runFAQ(text, turnId) {
    var result = Tools.faqMatch(text);
    if (result) {
      store.dispatch({ type: 'THINKING', state: 'executing', label: 'matched FAQ (fallback)' });
      setTimeout(function() {
        if (!validTurn(turnId)) { done(turnId); return; }
        store.dispatch({ type: 'THINKING', state: 'hide' });
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: result.content, ts: '' }});
        done();
      }, 200);
    } else {
      runFallback(text, turnId);
    }
  }

  function runFallback(text, turnId) {
    var genPrompt = (Classifier.hasLLMConsent() && Classifier.isLLMReady()) ? Classifier.loadPrompt('generate') : null;
    if (Classifier.isLLMConsentPending()) {
      store.dispatch({ type: 'THINKING', state: 'hide' });
      store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'llm-consent', content: Tools.llmConsentMessage(), ts: '' }});
      done();
    } else if (Classifier.hasLLMConsent() && Classifier.isLLMReady()) {
      store.dispatch({ type: 'THINKING', state: 'responding', label: 'generating response' });
      var _llmWorker = Classifier._getLLMWorker ? Classifier._getLLMWorker() : null;
      if (!_llmWorker) {
        store.dispatch({ type: 'THINKING', state: 'hide' });
        var noWorkerFaq = Tools.faqMatch(text);
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: noWorkerFaq ? noWorkerFaq.content : Tools.faqFallback(), ts: '' }});
        return done(turnId);
      }
      var msgId = 'msg_' + turnId + '_' + Date.now();
      store.dispatch({ type: 'MESSAGE_ADD', message: { id: msgId, role: 'agent', type: 'stream', content: '', ts: '', _streaming: true }});
      pendingGenerations[msgId] = { turnId: turnId, question: text, results: [] };
      _llmWorker.postMessage({ type: 'generate', text: text, context: getGenerationContext([]), requestId: msgId });
      genTimeouts[msgId] = setTimeout(function() {
        if (!validTurn(turnId)) return;
        delete genTimeouts[msgId];
        store.dispatch({ type: 'MESSAGE_STREAM_DONE', id: msgId });
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'system', type: 'system', content: '─── generation timed out ───', ts: '', noTs: true }});
        done();
      }, 45000);
    } else if (Classifier.hasLLMConsent() && !Classifier.isLLMReady()) {
      if (!store.getState().models.llmLoading) Classifier.enableLLM(); // lazy init
      if (store.getState().models.llmLoading) {
        // Model still loading — try FAQ first for instant answers
        store.dispatch({ type: 'THINKING', state: 'hide' });
        var faqTry2 = Tools.faqMatch(text);
        if (faqTry2) {
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: faqTry2.content, ts: '' }});
        } else {
          store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: 'Text generation model is downloading... (' + (store.getState().models.llmDownloadProgress||0) + '%). Try again soon.', ts: '' }});
        }
        done();
      } else {
        // Decoder failed to load — try FAQ first, then fallback
        store.dispatch({ type: 'THINKING', state: 'hide' });
        var faqTry = Tools.faqMatch(text);
        store.dispatch({ type: 'MESSAGE_ADD', message: { role: 'agent', type: 'faq', content: faqTry ? faqTry.content : Tools.faqFallback(), ts: '' }});
        done();
      }
    } else {
      store.dispatch({ type: 'THINKING', state: 'responding', label: 'generating response' });
      setTimeout(function() {
        if (!validTurn(turnId)) return;
        store.dispatch({ type: 'THINKING', state: 'hide' });
        var msgId = 'msg_' + Date.now();
        var words = Tools.faqFallback().split(' '), i = 0;
        store.dispatch({ type: 'MESSAGE_ADD', message: { id: msgId, role: 'agent', type: 'stream', content: '', ts: '', _streaming: true }});
        function nxt() { if (!validTurn(turnId)) return; if (i>=words.length) { store.dispatch({ type:'MESSAGE_STREAM_DONE', id:msgId }); done(); return; } store.dispatch({ type:'MESSAGE_STREAM', id:msgId, chunk:words[i]+' ' }); i++; setTimeout(nxt, 30+Math.random()*20); }
        nxt();
      }, 400 + Math.random() * 300);
    }
  }

  function cancel() {
    if (!store.getState().ui.isProcessing) return;
    currentTurnId++; // invalidate ALL in-flight async callbacks
    processingTurnId = 0; // release lock ownership
    // Clean up generation timeouts and pending generations
    for (var gid in genTimeouts) {
      clearTimeout(genTimeouts[gid]);
      delete genTimeouts[gid];
    }
    for (var pid in pendingGenerations) {
      delete pendingGenerations[pid];
    }
    Evaluator._cancelAllEvals();
    if (typeof AlignmentGate !== 'undefined' && AlignmentGate._cancelAllAligns) AlignmentGate._cancelAllAligns();
    if (typeof Router !== 'undefined' && Router._clearHumanCallback) Router._clearHumanCallback();
    store.dispatch({ type: 'THINKING', state: 'hide' });
    store.dispatch({ type: 'RESUME' }); // dismiss any ask_user modal
    store.dispatch({ type: 'MESSAGE_ADD', message: {
      role: 'system', type: 'system', content: '─── cancelled ───', ts: '', noTs: true
    }});
  }

  function resetFollowupState() {
    lastUserQuery = '';
    lastUserTool = '';
  }

  function _clearGenTimeout(msgId) {
    if (genTimeouts[msgId]) {
      clearTimeout(genTimeouts[msgId]);
      delete genTimeouts[msgId];
    }
  }

  function init(_store) { store = _store; }

  return {
    init: init,
    runLoop: runSmartLoop,
    singleTool: runSingleTool,
    faq: runFAQ,
    fallback: runFallback,
    done: done,
    cancel: cancel,
    resetFollowupState: resetFollowupState,
    _getConversationBuffer: getConversationBuffer,
    getCompactErrors: getCompactErrors,
    _clearGenTimeout: _clearGenTimeout,
    _handleGenerationDone: handleGenerationDone,
    get currentTurnId() { return currentTurnId; },
    set currentTurnId(v) { currentTurnId = v; },
    get processingTurnId() { return processingTurnId; },
    set processingTurnId(v) { processingTurnId = v; }
  };
})();
