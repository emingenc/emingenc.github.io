// tools.js v3 — the tool registry. Each tool lives in its own tool-*.js
// classic script and calls Tools.register(name, spec); the build joins the
// scripts into the one /agents/tools.js in the order src/data/agent-scripts.mjs
// lists, which is the order of
// Tools.TOOL_REGISTRY, Tools.toolNames and the keyword routing. Matching and
// the canned prose live in tools-match.js.
//
// spec = {
//   run(text)           the tool; null names a command with no run of its own.
//                       With `state: true` run(storeState) gets the store's state.
//   routeKeywords [..]  word-boundary routing keywords (getTopIntents, detectExtraTools)
//   meta {..}           the TOOL_REGISTRY entry (description, keywords, category, ...)
//   reply({ open, isFollowUp, data })   the persona line replyFor() returns
// }
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as before the split
var Tools = (function() {
  "use strict";

  var FAQ = null;
  var COMMANDS = Object.create(null);  // name -> spec of every command
  var KEYWORDS = Object.create(null);  // name -> routeKeywords
  var TOOL_REGISTRY = [];
  var toolNames = [];

  // ─── HTML helpers ────────────────────────────────────────
  // Escape untrusted text (slash-command args, search queries) before it is
  // interpolated into a card string that renderer.js sends to innerHTML.
  // Mirrors renderer.js/orchestrator.js's escapeHtml — each module keeps its
  // own copy rather than sharing a require, matching this codebase's plain
  // <script>-tag loading (no module system).
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // A visitor's query echoed into a card: printable ASCII only, since a wide
  // character (CJK, emoji) takes two columns that vlen() counts as one and
  // pushes the right border out; cut to 40 characters, then escaped.
  var ECHO_MAX = 40;
  function echoQuery(query) {
    return escapeHtml(String(query).replace(/[^\x20-\x7E]/gu, '?').slice(0, ECHO_MAX));
  }

  function vlen(s) {
    // Visible length: strip HTML tags and decode entities for ASCII box alignment
    return s.replace(/<[^>]*>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").length;
  }

  function box(title, lines) {
    var w = title.length + 4;
    for (var i = 0; i < lines.length; i++) w = Math.max(w, vlen(lines[i]) + 4);
    var t = '┌' + '─'.repeat(w) + '┐\n';
    t += '│ ' + title + ' '.repeat(w - title.length - 1) + '│\n';
    t += '│' + '─'.repeat(w) + '│\n';
    for (var i = 0; i < lines.length; i++) {
      var vl = vlen(lines[i]);
      t += '│ ' + lines[i] + ' '.repeat(Math.max(0, w - vl - 1)) + '│\n';
    }
    t += '└' + '─'.repeat(w) + '┘';
    return '<pre class="ascii">' + t + '</pre>';
  }

  function link(href, text, cls) {
    cls = cls || '';
    return '<a href="' + href + '" target="_blank" class="' + cls + '" style="color:var(--accent);text-decoration:none">' + text + '</a>';
  }

  function cmdLink(cmd, text) {
    return '<span class="cmd-link" onclick="window.quickCmd(\'' + cmd + '\')" style="color:var(--accent);cursor:pointer;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px">' + text + '</span>';
  }

  function askBox(question, options) {
    var btns = options.map(function(o, i) {
      return '<span class="ask-btn" onclick="window._answerAsk(' + i + ')">' + escapeHtml(o) + '</span>';
    }).join('');
    return '<div class="ask-user"><div class="ask-user-q">' + escapeHtml(question) + '</div><div class="ask-user-opts">' + btns + '</div></div>';
  }

  // ─── Registry ────────────────────────────────────────────
  // A second register() for a name adds only what it carries: tools-match.js
  // lists out_of_scope's registry entry after the real tools'.
  function register(name, spec) {
    if ('run' in spec) {
      if (!COMMANDS[name]) toolNames.push(name);
      COMMANDS[name] = spec;
    }
    if (spec.routeKeywords) KEYWORDS[name] = spec.routeKeywords;
    if (spec.reply) COMMANDS[name] = Object.assign(COMMANDS[name] || {}, { reply: spec.reply });
    if (spec.meta) TOOL_REGISTRY.push(Object.assign({ name: name }, spec.meta));
  }

  // Get a single tool's full metadata
  function getTool(name) {
    for (var i = 0; i < TOOL_REGISTRY.length; i++) {
      if (TOOL_REGISTRY[i].name === name) return TOOL_REGISTRY[i];
    }
    return null;
  }

  // Validate a tool result against expected shape
  function validateToolResult(result) {
    if (!result || typeof result !== 'object') return { valid: false, error: 'Result must be an object' };
    if (!result.toolName) return { valid: false, error: 'Missing toolName' };
    if (result.content === undefined) return { valid: false, error: 'Missing content' };
    return { valid: true };
  }

  // Get all self-contained tool names
  function getSelfContainedTools() {
    var names = [];
    for (var i = 0; i < TOOL_REGISTRY.length; i++) {
      if (TOOL_REGISTRY[i].selfContained) names.push(TOOL_REGISTRY[i].name);
    }
    return names;
  }

  // data: the matched tool result's data, if any. 'about' reads its
  // KnowledgeBase match, 'game' its notFound flag.
  function replyFor(toolName, isFollowUp, data) {
    var spec = COMMANDS[toolName];
    if (!spec || !spec.reply) return null;
    return spec.reply({ open: isFollowUp ? 'Happy to dig deeper. ' : '', isFollowUp: isFollowUp, data: data });
  }

  function loadFAQ() {
    return fetch('/data/faq.json')
      .then(function(r) { return r.json(); })
      .then(function(data) { FAQ = data; return data; })
      .catch(function(e) {
        // The fallback keeps replies working; rethrown so boot() can tell the
        // visitor (agent-ui.js failBoot).
        FAQ = { faq: [], fallback: { responses: ['I don\'t have an answer for that. Try <b>/help</b> to see commands!'] } };
        throw e;
      });
  }

  // ─── Keyword routing ─────────────────────────────────────
  // Matches a keyword against text as a whole word or phrase, its plural
  // included ('projects', 'stars', 'patches') — never a raw substring — so a
  // keyword doesn't fire inside an unrelated longer word ('tech' inside
  // "Goodfintech", 'play' inside "display", 'launch' inside "launched").
  // \b anchors both ends, so multi-word phrases and hyphenated compounds
  // ('hack-overflow') work the same way as single words.
  function kwBoundaryHit(lower, kw) {
    var escaped = String(kw).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + escaped + '(?:e?s)?\\b').test(lower);
  }

  // ─── Compound query detection ────────────────────────────
  function detectExtraTools(text, primaryTool) {
    var lower = (text || '').toLowerCase();
    var extra = [];
    var seen = {};
    seen[primaryTool] = true;
    var toolNames = Object.keys(KEYWORDS);
    for (var i = 0; i < toolNames.length; i++) {
      var tool = toolNames[i];
      if (seen[tool]) continue;
      var kws = KEYWORDS[tool];
      for (var j = 0; j < kws.length; j++) {
        if (kwBoundaryHit(lower, kws[j])) { extra.push(tool); seen[tool] = true; break; }
      }
      if (extra.length >= 2) break; // max 2 extra tools
    }
    return extra;
  }

  // ─── v2: Multi-intent detection ──────────────────────────
  function getTopIntents(text) {
    var l = text.toLowerCase();
    var scores = {};
    for (var t in KEYWORDS) {
      scores[t] = 0;
      for (var i = 0; i < KEYWORDS[t].length; i++) {
        // Word-boundary match for every keyword (kwBoundaryHit, shared with
        // detectExtraTools) — otherwise e.g. "play" substring-matches "display"
        // and "tech" substring-matches "Goodfintech", inflating unrelated tools.
        if (kwBoundaryHit(l, KEYWORDS[t][i])) scores[t]++;
      }
    }
    var results = [];
    for (var name in scores) { if (scores[name] > 0) results.push({ tool: name, score: scores[name] }); }
    results.sort(function(a, b) { return b.score - a.score; });
    return results;
  }

  function isCompound(text) { return /\band\b|\balso\b|\bplus\b|\bas well\b/i.test(text); }

  // ─── Slash commands ──────────────────────────────────────
  var ALL_CMDS = ['/about','/repos','/contact','/skills','/blog','/g1','/game','/time','/device','/screen','/network','/lucky','/ask','/status','/session','/help','/clear','/new','/sessions','/resume','/forget'];

  function getCommands() { return ALL_CMDS; }
  function isSlash(text) { return text.startsWith('/'); }
  // Split on ANY whitespace (not just the literal space char), so a crafted
  // command like "/<img\tonerror=...>" (tab instead of space) can't survive
  // parsing as a single command token and reach a card as one intact tag.
  function parseSlash(text) { return text.slice(1).toLowerCase().split(/[\s\/]/)[0]; }
  function isBlogCommand(text) { return text.toLowerCase().startsWith('/blog'); }

  // /forget and /clear delete saved sessions or the transcript, so only the
  // visitor's own typing may run them: router.js refuses them from a URL and
  // renderer.js refuses them as a one-click card link.
  function isDestructiveCommand(text) {
    if (!isSlash(text)) return false;
    var cmd = parseSlash(text);
    return cmd === 'forget' || cmd === 'clear';
  }

  return {
    loadFAQ: loadFAQ,
    getFAQ: function() { return FAQ; },
    _store: null,
    setStore: function(s) { this._store = s; },
    register: register,
    html: { escape: escapeHtml, echoQuery: echoQuery, box: box, link: link, cmdLink: cmdLink },
    kwBoundaryHit: kwBoundaryHit,
    execute: function(name, text) {
      var spec = COMMANDS[name];
      if (!spec || !spec.run) return null;
      return spec.run(spec.state ? (this._store ? this._store.getState() : null) : text);
    },
    askUser: askBox,
    getTopIntents: getTopIntents,
    isCompound: isCompound,
    getCommands: getCommands,
    isSlash: isSlash,
    parseSlash: parseSlash,
    isBlogCommand: isBlogCommand,
    isDestructiveCommand: isDestructiveCommand,
    toolNames: toolNames,
    detectExtraTools: detectExtraTools,
    getTool: getTool,
    replyFor: replyFor,
    validateToolResult: validateToolResult,
    getSelfContainedTools: getSelfContainedTools,
    TOOL_REGISTRY: TOOL_REGISTRY
  };

})();

// tool-about.js — /about: the bio card, or a KnowledgeBase company card when
// the question names one.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  var box = Tools.html.box;

  // Whether the question names the company card's company itself: the first
  // word of its name ("Goodfintech", "E-Kalite"), its bracketed name or its
  // aka, as a whole word. KnowledgeBase.search() also matches words that
  // name no company ("software", "developer", "now").
  function namesCompany(question, data) {
    if (data.type !== 'company') return false;
    var parts = String(data.company || '').split(/[()]/);
    var names = [parts[0].trim().split(/\s+/)[0], parts[1], data.aka];
    var lower = String(question || '').toLowerCase();
    return names.some(function(name) {
      return Boolean(name) && Tools.kwBoundaryHit(lower, name.trim());
    });
  }

  function runAbout(text) {
    // Try KnowledgeBase first for specific company/role queries
    if (typeof KnowledgeBase !== 'undefined') {
      // Clean query: strip slash commands, extract meaningful part
      var cleanQuery = (text || '').replace(/^\/(about|knowledge)\s*/i, '').trim();
      if (!cleanQuery) cleanQuery = text || '';
      var kbResult = KnowledgeBase.search(cleanQuery);
      if (kbResult && kbResult.found) {
        kbResult.namedInQuestion = namesCompany(cleanQuery, kbResult);
        var formatted = KnowledgeBase.formatResult(kbResult);
        if (formatted) return formatted;
      }
    }
    // Fallback: general bio
    var items = [
      'Based in Vancouver, BC',
      'Forward Deployed AI Engineer @ Cresta AI',
      '',
      'Previously:',
      '2023–26  Goodfintech — AI Engineer',
      '2022–23  Vivoo — Machine Learning Engineer',
      '2020–22  Novit AI — Full-stack AI Engineer',
      '2020     E-Kalite Software — Python Dev / QA',
      '2016–20  Indie Game Dev (emdi_apps) — Founder',
      '',
      'BSc Aerospace Engineering · Turkish Air Force Academy',
      '250+ GitHub stars · 46 repos',
      'Former Air Defense Officer'
    ];
    return { toolName: 'about', content: box('EMIN GENCH', items), data: null };
  }

  // Company/role-specific prose for a KnowledgeBase-matched 'about' result
  // (runAbout → KnowledgeBase.search/formatResult). Built only from the
  // same fields the card above it already shows — company, role, dates,
  // one highlight — so the spoken line never says something the card
  // doesn't back up, and never drifts to a different employer.
  function aboutCompanyProse(data, isFollowUp) {
    var open = isFollowUp ? 'Happy to dig deeper. ' : '';
    var company = data.aka ? data.company + ' (' + data.aka + ')' : data.company;
    var role = data.role || 'a role there';
    var dates = data.period ? ' (' + data.period + ')' : '';
    var verb = data.isCurrent ? 'works as' : 'worked as';
    var line = open + 'At <b>' + company + '</b>' + dates + ', Emin ' + verb + ' <b>' + role + '</b>.';
    var highlight = (data.highlights || [])[0];
    if (highlight) line += ' ' + highlight;
    return line;
  }

  // The lead paragraph and receipts list for a lead + bullets answer: each
  // bullet is a work.md row quoted with a button that opens that row. All
  // text is escaped; the row number is forced to an integer.
  function receiptsHtml(open, lead, bullets) {
    var esc = Tools.html.escape;
    var items = bullets.map(function(bullet) {
      var row = parseInt(bullet.row, 10);
      var tag = bullet.tag ? '<span class="tag">' + esc(bullet.tag) + '</span> ' : '';
      return '<li>' + tag + '<span class="tx">' + esc(bullet.text) + '</span> ' +
        '<button type="button" class="rc" data-receipt="' + row + '" aria-label="Source: work.md line ' + row + '">work.md:' + row + '</button></li>';
    });
    return '<p class="lead">' + esc(open + lead.text) + '</p><ul class="receipts">' + items.join('') + '</ul>';
  }

  // The answers that quote their rows: "his experience, with numbers" and
  // the Cresta question, whose lead and bullets each cite a work.md row.
  function receiptsReply(ctx) {
    var data = ctx.data;
    if (!data || !data.lead) return null;
    if (data.type === 'outcomes') return receiptsHtml(ctx.open, data.lead, data.bullets || []);
    var cresta = data.isCurrent && data.namedInQuestion && (data.bullets || []).length;
    return cresta ? receiptsHtml(ctx.open, data.lead, data.bullets) : null;
  }

  function reply(ctx) {
    var receipts = receiptsReply(ctx);
    if (receipts) return receipts;
    // Company prose replaces the generic bio only when the question named
    // that company (namesCompany above). Every other card is followed by
    // the generic bio: timeline, education, tech stack, blog post, or a
    // company KnowledgeBase.search() matched on a word that names none.
    if (ctx.data && ctx.data.namedInQuestion) {
      return aboutCompanyProse(ctx.data, ctx.isFollowUp);
    }
    return ctx.open + 'Emin Gench is based in Vancouver, BC, and works as a <b>Forward Deployed AI Engineer at Cresta AI</b> — an AI builder with a B.Sc. in aerospace engineering from the Turkish Air Force Academy and a former Air Defense Officer; he works where systems thinking meets large language models. Before Cresta: Goodfintech (AI engineer), Vivoo (ML engineer), Novit AI (full-stack AI engineer), and indie game dev. He also builds open source — 250+ GitHub stars across 46 repos.';
  }

  // Routing keywords leave out pronouns and verbs every question carries
  // ("he", "built", "work"): they made other answers print the bio too.
  var ROUTE_KEYWORDS = ['emin','gench','bio','archangel','goodfintech','vivoo','novit','cresta','aerospace','fde','vancouver','resume','cv','career','background','experience','education','degree','history','employer','worked','studied','school','university','yourself'];
  var KEYWORDS = ROUTE_KEYWORDS.concat(['who','work','job','role','title','company','position','past','teams','lead','manage','shipped','launched','delivered','location','living','based','built','made','opportunities','available','study','him','his','he']);

  Tools.register('about', {
    run: runAbout,
    routeKeywords: ROUTE_KEYWORDS,
    reply: reply,
    meta: { description: 'Emin Gench biography, career, current role at Cresta AI', keywords: KEYWORDS, scopeWords: ['emin','gench','archangel','goodfintech','vivoo','novit','cresta','aerospace','fde','vancouver','career','role','job','work','title','position','company','employer','background','experience','education','degree','school','university','history','past','worked','studied','lead','manage','team','shipped','launched','delivered','built','made','location','based','living','available','opportunities','engineer','resume','cv','bio','his','him','he','yourself','study'], selfContained: true, category: 'discover', params: {} }
  });
})();

// tool-repos.js — /repos: the open-source repos, as clickable links.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  var box = Tools.html.box;
  var link = Tools.html.link;

  function runRepos() {
    var repos = [
      { name: 'even_glasses', slug: 'even_glasses', stars: 78, desc: 'G1 BLE SDK (Python)' },
      { name: 'telegramGPT', slug: 'telegramGPT', stars: 52, desc: 'AI bot building guide' },
      { name: 'G1 Voice AI', slug: 'G1_voice_ai_assistant', stars: 25, desc: 'Voice assistant' },
      { name: 'g1_flutter', slug: 'g1_flutter_blue_plus', stars: 18, desc: 'Flutter BLE bridge' },
      { name: 'visionlink', slug: 'visionlink', stars: 11, desc: 'Multi-device OS' },
      { name: 'llm_adaptive_router', slug: 'llm_adaptive_router', stars: 6, desc: 'LLM routing' }
    ];
    var lines = repos.map(function(repo) {
      var url = 'https://github.com/emingenc/' + repo.slug;
      return '*' + repo.stars + '  ' + link(url, repo.name, 'repo-link') + ' — ' + repo.desc;
    });
    lines.push('');
    lines.push(link('https://github.com/emingenc', 'github.com/emingenc — 46 repos', 'repo-link'));
    return {
      toolName: 'repos',
      content: box('OPEN SOURCE', lines),
      data: { repos: repos }
    };
  }

  function reply(ctx) {
    return ctx.open + 'He has <b>46 repositories</b> and <b>250+ GitHub stars</b>. The one people find first: <b>even_glasses</b> — a smart-glasses integration platform (78★ and counting), plus <b>telegramGPT</b> (52★) and a voice AI assistant (25★).';
  }

  var KEYWORDS = ['repos','repo','github','project','code','open source','built','star','repository','portfolio','contribution','deploy','deployment','pipeline','infra','devops','ci/cd','docs','documentation','apps','applications','features','PR','pull request','patch','commit'];

  Tools.register('repos', {
    run: runRepos,
    routeKeywords: KEYWORDS,
    reply: reply,
    meta: { description: 'GitHub open source repositories by emingenc', keywords: KEYWORDS, selfContained: true, category: 'discover', params: {} }
  });
})();

// tool-contact.js — /contact: where to reach Emin, as clickable links.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  var box = Tools.html.box;
  var link = Tools.html.link;

  // Mirrors CONTACT in src/data/profile.mjs (tests/page-data.test.mjs holds
  // the two together). No public address yet: LinkedIn is the primary link.
  var CONTACT_EMAIL = null;
  var CONTACT_AVAILABILITY = 'Open to open-source and smart-glasses projects. Not taking new roles.';

  function contactAvailability() {
    var FAQ = Tools.getFAQ();
    if (FAQ && FAQ.tools && FAQ.tools.contact && FAQ.tools.contact.footer) return FAQ.tools.contact.footer;
    return CONTACT_AVAILABILITY;
  }

  function runContact() {
    var lines = [
      link('https://github.com/emingenc', 'github.com/emingenc'),
      link('https://linkedin.com/in/emingench', 'linkedin.com/in/emingench'),
      link('https://x.com/emingench', 'x.com/emingench')
    ];
    if (CONTACT_EMAIL) lines.unshift(link('mailto:' + CONTACT_EMAIL, CONTACT_EMAIL));
    var html = box('CONNECT', lines);
    html += '<div style="color:var(--muted);font-size:var(--text-2xs);margin-top:6px">' + contactAvailability() + '</div>';
    return { toolName: 'contact', content: html, data: null };
  }

  function reply(ctx) {
    return ctx.open + 'The best way to reach Emin is ' + (CONTACT_EMAIL ? '<b>' + CONTACT_EMAIL + '</b>, or ' : '')
      + link('https://linkedin.com/in/emingench', 'LinkedIn') + '. The card has every link.';
  }

  var KEYWORDS = ['email','contact','reach','reach out','touch','hire','collaborate','linkedin','twitter','mail','phone','social','handle','message','connect'];

  Tools.register('contact', {
    run: runContact,
    routeKeywords: KEYWORDS,
    reply: reply,
    meta: { description: 'Contact Emin Gench: email, GitHub, LinkedIn, Twitter', keywords: KEYWORDS, selfContained: true, category: 'discover', params: {} }
  });
})();

// tool-skills.js — /skills: the tech stack.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  function runSkills() {
    var html = Tools.html.box('TECH STACK', [
      'AI/ML — LLMs, Agents, RAG',
      'Languages — Python, TypeScript, Dart',
      'Backend — FastAPI, Next.js, PostgreSQL',
      'Infra — Docker, AWS, Linux, CI/CD'
    ]);
    return { toolName: 'skills', content: html, data: null };
  }

  function reply(ctx) {
    return ctx.open + 'Day-to-day it’s <b>Python, TypeScript, and Dart</b> — FastAPI and Next.js on the web side, Docker + AWS to ship it, and LLMs / agents / RAG on the AI side.';
  }

  var KEYWORDS = ['skills','skill','tech','tool','tools','stack','know','language','python','typescript','docker','programming','framework','database','cloud','aws','linux','fastapi','next','react','ml','llm','rag','agent'];

  Tools.register('skills', {
    run: runSkills,
    routeKeywords: KEYWORDS,
    reply: reply,
    meta: { description: 'Technical skills: Python, TypeScript, Dart, FastAPI, Next.js, Docker, AWS', keywords: KEYWORDS, selfContained: true, category: 'discover', params: {} }
  });
})();

// tool-showcase.js — /blog, /g1 and /game: what Emin wrote and built.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  var html = Tools.html;
  var box = html.box;

  // Whether `query` names the newest or the oldest post, as a redirect result;
  // null when it names neither or there are no posts.
  function ordinalPost(query, posts) {
    if (posts.length === 0) return null;
    // Ordinal queries: last/latest/recent/newest → newest, first/oldest → oldest
    if (/\b(last|latest|recent|newest|most recent)\b/i.test(query)) {
      return { toolName: 'blog', redirect: '/blog/' + posts[0].slug, content: null, data: { matched: posts[0].title } };
    }
    if (/\b(first|oldest|earliest)\b/i.test(query)) {
      var oldest = posts[posts.length - 1];
      return { toolName: 'blog', redirect: '/blog/' + oldest.slug, content: null, data: { matched: oldest.title } };
    }
    return null;
  }

  // The post whose title shares the most words with `query`, or null.
  function bestTitleMatch(query, posts) {
    var best = null, bestScore = 0;
    var queryWords = query.toLowerCase().split(/\s+/);
    posts.forEach(function(post) {
      var titleLower = post.title.toLowerCase();
      var score = queryWords.filter(function(word) { return titleLower.indexOf(word) !== -1; }).length;
      if (score > bestScore) { bestScore = score; best = post; }
    });
    return best;
  }

  // The redirect result for the post `query` names, or null.
  function redirectFor(query, posts) {
    var ordinal = ordinalPost(query, posts);
    if (ordinal) return ordinal;
    // Try exact slug match
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].slug === query.toLowerCase().replace(/\s+/g, '-')) {
        return { toolName: 'blog', redirect: '/blog/' + posts[i].slug, content: null, data: null };
      }
    }
    // Fuzzy match: find best post by title keyword overlap
    var best = bestTitleMatch(query, posts);
    if (best) return { toolName: 'blog', redirect: '/blog/' + best.slug, content: null, data: { matched: best.title } };
    return null;
  }

  function listing(posts) {
    var lines = posts.map(function(post) {
      return html.cmdLink('/blog ' + post.slug, post.title);
    });
    if (lines.length === 0) lines = ['No posts yet — coming soon'];
    lines.push('');
    lines.push(html.link('/blog', 'Visit all posts →'));
    return { toolName: 'blog', content: box('WRITING', lines), data: null };
  }

  function runBlog(text) {
    // Single source of truth: KnowledgeBase loads blog-index.json (async).
    var posts = (typeof KnowledgeBase !== 'undefined' && KnowledgeBase.getBlogPosts)
      ? KnowledgeBase.getBlogPosts()
      : [];
    // /blog <slug or text> — accept both space form ('/blog hello-world') and
    // URL form ('/blog/hello-world', as copied from the blog post URLs), with or
    // without a trailing slash ('/blog/hello-world/' — browsers display the
    // trailing-slash form of the post URL).
    // Only a real '/blog ...' command names a post, as in tool_game: a
    // natural-language question ("what does he write about?") would
    // otherwise fuzzy-match a title and navigate the whole page away.
    var raw = text || '';
    var isCommand = /^\/blog(\/|\s|$)/i.test(raw);
    var query = isCommand ? raw.replace(/^\/blog[\/\s]*/i, '').trim().replace(/^\/+/, '').replace(/\/+$/, '') : '';
    if (!query) return listing(posts);

    var redirect = redirectFor(query, posts);
    if (redirect) return redirect;
    // No match — show blog listing. Escape the echoed query: it reaches this
    // card verbatim from the URL/typed input (e.g. ?q=/blog+<img onerror=…>).
    return {
      toolName: 'blog',
      content: box('BLOG', [
        'No post matching "' + html.echoQuery(query) + '"',
        '',
        'Available posts:'
      ].concat(posts.map(function(post) { return html.cmdLink('/blog ' + post.slug, post.title); }))),
      data: null
    };
  }

  function replyBlog(ctx) {
    return ctx.open + 'Emin writes about AI engineering and building things — the posts are below.';
  }

  Tools.register('blog', {
    run: runBlog,
    routeKeywords: ['blog','post','article','read','published','writing'],
    reply: replyBlog,
    meta: { description: 'Blog posts about building AI agents', keywords: ['blog','post','article','write','read','published'], selfContained: true, category: 'discover', params: {} }
  });

  function runG1() {
    var items = [
      'G1 Smart Glasses Ecosystem by Emin Gench',
      '',
      '*78 even_glasses  — BLE driver (Python)',
      '*25 G1 Voice AI   — Voice assistant',
      '*18 g1_flutter    — Mobile bridge (Dart)',
      '*11 visionlink    — Multi-device OS (C)',
      '*4  smart_glass_mcp — AI agent connector',
      '*7  even_glasses_redis_control',
      '',
      '6 repos · 5 languages · 1 system',
      'Built entirely from scratch.'
    ];
    return { toolName: 'g1', content: box('G1 SMART GLASSES', items), data: null };
  }

  function replyG1(ctx) {
    return ctx.open + 'The G1 project is his flagship open-source build: <b>even_glasses</b> — a BLE SDK + Flutter integration for the Even Realities G1 smart glasses, 78★ and counting.';
  }

  Tools.register('g1', {
    run: runG1,
    routeKeywords: ['g1','smart glasses','smart glass','glasses','even realities','ble','flutter','wearable','hardware','even_glasses'],
    reply: replyG1,
    meta: { description: 'G1 smart glasses by Even Realities: BLE SDK, voice assistant, mobile bridge', keywords: ['g1','smart glass','glasses','even realities','ble','flutter','wearable','hardware','even_glasses'], selfContained: true, category: 'discover', params: {} }
  });

  // Add new games by appending to GAMES. `path` is the same-origin route to
  // navigate to (works on the live site and any local/preview host); `url`
  // is the public address kept for display/reference only. Selectable:
  // /game shows the list, /game <id> redirects to launch it.
  var GAMES = [
    { id: 'hack-overflow', name: 'HACK://OVERFLOW', path: '/hack-overflow/', url: 'https://emingenc.github.io/hack-overflow/', desc: 'LeetCode puzzle game — solve each problem with one line of Python' }
  ];

  function gameLines() {
    return GAMES.map(function(game) {
      return html.cmdLink('/game ' + game.id, '> ' + game.name + ' — ' + game.desc);
    });
  }

  function findGame(query) {
    for (var i = 0; i < GAMES.length; i++) {
      if (GAMES[i].id === query || GAMES[i].name.toLowerCase().indexOf(query) !== -1) return GAMES[i];
    }
    return null;
  }

  function runGame(text) {
    // Only a real '/game ...' command names a game id. Keyword routing can
    // hand this tool a whole natural-language question ("What games has
    // Emin made?", "play a game") — that must fall through to the default
    // list below, not be treated as an (unmatched) game id.
    var raw = text || '';
    var isCommand = /^\/game(\/|\s|$)/i.test(raw);
    // Accept both space form ('/game hack-overflow') and URL form
    // ('/game/hack-overflow', as copied from the game's URL) — mirrors the
    // /blog URL-form fix so both slash commands behave identically. Trailing
    // slashes are stripped too ('/game/hack-overflow/').
    var query = isCommand ? raw.replace(/^\/game[\/\s]*/i, '').trim().replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase() : '';
    if (query) {
      var game = findGame(query);
      if (game) {
        return { toolName: 'game', redirect: game.path || game.url, content: null, data: { matched: game.name } };
      }
      // Escape the echoed query — same crafted-link vector as the /blog "no match" card.
      var noLines = ['No game matching "' + html.echoQuery(query) + '"', '', 'Pick one:'].concat(gameLines());
      return { toolName: 'game', content: box('GAMES', noLines), data: { notFound: true } };
    }
    var lines = gameLines().concat(['', 'Select a game to launch it →']);
    return { toolName: 'game', content: box('GAMES', lines), data: { games: GAMES } };
  }

  function replyGame(ctx) {
    // Never echo the unmatched id here: the card above already shows it, escaped.
    if (ctx.data && ctx.data.notFound) {
      return ctx.open + 'No game goes by that name. The one Emin has published is <b>HACK://OVERFLOW</b>, a LeetCode puzzle game: you solve 24 problems, each with one line of Python judged right in your browser. Pick it below to launch it.';
    }
    return ctx.open + 'He made <b>HACK://OVERFLOW</b> — a LeetCode puzzle game: you solve 24 problems, each with one line of Python judged right in your browser. Pick it below and it opens at /hack-overflow.';
  }

  Tools.games = GAMES;
  Tools.register('game', {
    run: runGame,
    routeKeywords: ['game','play','playable','games','arcade','platformer','hack-overflow','hack overflow','hack://overflow','blind 75','run game','launch'],
    reply: replyGame,
    meta: { description: 'Emin\'s playable games', keywords: ['game','play','playable','games','arcade','platformer','hack-overflow','hack overflow','hack://overflow','blind 75'], selfContained: true, category: 'fun', params: {} }
  });
})();

// tool-utility.js — /help, /time, /device, /screen, /network, /lucky and /ask: the site's own commands and what the browser knows about the visitor's machine.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  var box = Tools.html.box;

  var HELP_LINES = [
    '──── discover ────',
    '/about   — who is Emin?',
    '/repos   — open source projects',
    '/contact — get in touch',
    '/skills  — tech stack',
    '/blog    — writing & posts',
    '/g1      — G1 smart glasses (Even Realities)',
    '/game    — play deployed games (pick one)',
    '/ask     — pick a topic to explore',
    '',
    '──── your machine ────',
    '/device  — hardware fingerprint',
    '/screen  — display specs',
    '/network — connection speed',
    '/time    — clock & timezone',
    '/status  — everything at a glance',
    '',
    '──── fun ────',
    '/lucky   — random fact about this site',
    '',
    '──── session ────',
    '/session — uptime & stats',
    '/new      — new session',
    '/sessions — saved history',
    '/resume   — reopen a saved session',
    '/forget   — clear all data (confirm)',
    '/clear    — reset transcript'
  ];

  function runHelp() {
    return {
      toolName: 'help',
      content: box('COMMANDS', HELP_LINES) + '<div style="color:var(--accent);font-size:var(--text-2xs);margin-top:6px;font-family:monospace">Tip: try /status or /lucky ⚡</div>',
      data: null
    };
  }

  Tools.register('help', {
    run: runHelp,
    meta: { description: 'List all available commands', keywords: ['help','commands','what can you do','options'], selfContained: true, category: 'meta', params: {} }
  });

  // ─── Tool: time ─────────────────────────────────────────
  function runTime() {
    var now = new Date();
    var weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    var h12 = hours % 12 || 12;
    var timeStr = h12 + ':' + String(minutes).padStart(2,'0') + ':' + String(seconds).padStart(2,'0') + ' ' + ampm;
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
    // getTimezoneOffset() is minutes WEST of UTC; negate to get minutes EAST.
    var offMin = -now.getTimezoneOffset();
    var offSign = offMin >= 0 ? '+' : '-';
    var offAbs = Math.abs(offMin);
    var offHours = Math.floor(offAbs / 60);
    var offMinutes = offAbs % 60;
    // Whole-hour offsets render compactly (UTC-7). Fractional offsets (India
    // +5:30, Nepal +5:45, Newfoundland -3:30) render with a minute component so
    // they don't surface as misleading decimals like "UTC+5.5".
    var tzStr = 'UTC' + offSign + offHours + (offMinutes ? ':' + String(offMinutes).padStart(2, '0') : '');

    return {
      toolName: 'time',
      content: box('LOCAL TIME', [
        weekdays[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
        timeStr + ' · ' + tzStr,
        tz
      ]),
      data: { iso: now.toISOString(), tz: tz, offset: offMin }
    };
  }

  // ─── Tool: device — browser/hardware fingerprint ──────────
  function runDevice() {
    var nav = typeof navigator !== 'undefined' ? navigator : {};
    var lines = [
      'Platform:  ' + (nav.platform || 'unknown'),
      'Cores:     ' + (nav.hardwareConcurrency || '?') + ' logical',
      'Memory:    ' + (nav.deviceMemory || '?') + ' GB',
      'Language:  ' + (nav.language || 'en'),
      'Cookies:   ' + (nav.cookieEnabled ? 'yes' : 'no'),
      'Online:    ' + (nav.onLine ? 'yes' : 'no'),
      'UserAgent: ' + (nav.userAgent || 'N/A').slice(0, 45) + '...'
    ];
    return {
      toolName: 'device',
      content: box('YOUR DEVICE', lines),
      data: { platform: nav.platform, cores: nav.hardwareConcurrency, memory: nav.deviceMemory, language: nav.language }
    };
  }

  // ─── Tool: screen — display information ───────────────────
  function runScreen() {
    var scr = typeof screen !== 'undefined' ? screen : {};
    var dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    var vw = typeof window !== 'undefined' ? window.innerWidth : '?';
    var vh = typeof window !== 'undefined' ? window.innerHeight : '?';
    var colorDepth = scr.colorDepth || '?';
    return {
      toolName: 'screen',
      content: box('YOUR SCREEN', [
        'Resolution: ' + scr.width + '×' + scr.height + ' @ ' + dpr + 'x (' + (scr.width * dpr) + '×' + (scr.height * dpr) + ' physical)',
        'Viewport:   ' + vw + '×' + vh,
        'Color:      ' + colorDepth + '-bit',
        'Orientation:' + (scr.orientation ? scr.orientation.type : 'N/A'),
        'Touch:      ' + (('ontouchstart' in (typeof window !== 'undefined' ? window : {})) ? 'yes' : 'no')
      ]),
      data: { width: scr.width, height: scr.height, dpr: dpr, viewport: vw + 'x' + vh }
    };
  }

  // ─── Tool: network — connection info ──────────────────────
  function runNetwork() {
    var conn = (typeof navigator !== 'undefined' && navigator.connection) ? navigator.connection : null;
    var lines = [];
    if (conn) {
      lines.push('Type:     ' + (conn.effectiveType || '?'));
      lines.push('Downlink: ' + (conn.downlink || '?') + ' Mbps');
      lines.push('RTT:      ' + (conn.rtt || '?') + ' ms');
      lines.push('SaveData: ' + (conn.saveData ? 'yes' : 'no'));
    } else {
      lines.push('Connection API not available');
      lines.push('(use Chrome/Edge for this info)');
    }
    var online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    lines.push('');
    lines.push('Online:    ' + (online ? 'yes' : 'no'));
    return {
      toolName: 'network',
      content: box('YOUR NETWORK', lines),
      data: conn ? { type: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt } : null
    };
  }

  Tools.register('time', {
    run: runTime,
    meta: { description: 'Current local time and timezone', keywords: ['time','date','clock','timezone','what time'], selfContained: true, category: 'device', params: {} }
  });
  Tools.register('device', {
    run: runDevice,
    meta: { description: 'Browser and hardware fingerprint', keywords: ['device','browser','hardware','cores','memory'], selfContained: true, category: 'device', params: {} }
  });
  Tools.register('screen', {
    run: runScreen,
    meta: { description: 'Display resolution and color depth', keywords: ['screen','display','resolution','viewport'], selfContained: true, category: 'device', params: {} }
  });
  Tools.register('network', {
    run: runNetwork,
    meta: { description: 'Network connection type and speed', keywords: ['network','connection','speed','online','offline'], selfContained: true, category: 'device', params: {} }
  });

  // Count answerable FAQ entries only (skip the decorative "═══ SECTION ═══"
  // header strings that also live in the faq array). Dynamic so it never
  // drifts out of sync with data/faq.json again.
  function faqCount() {
    var FAQ = Tools.getFAQ();
    var count = 0;
    if (FAQ && FAQ.faq) {
      for (var fi = 0; fi < FAQ.faq.length; fi++) {
        if (FAQ.faq[fi] && FAQ.faq[fi].q) count++;
      }
    }
    return count;
  }

  function runLucky() {
    var count = faqCount();
    var faqFact = count > 0
      ? 'This FAQ alone has ' + count + ' entries to answer almost any question instantly.'
      : 'This FAQ answers questions instantly — no servers, all local.';
    var facts = [
      'This entire website runs AI models locally in your browser. No servers!',
      'Emin taught himself to code while serving as an Air Defense Officer.',
      'The G1 smart glasses ecosystem spans 6 repos across 5 programming languages.',
      '250+ GitHub stars earned through open source, not marketing.',
      'Emin has a BSc in Aerospace Engineering — literally rocket science.',
      faqFact,
      'The optional chat model (SmolLM2-360M) is a 278 MB download (369 MB without WebGPU) and runs entirely in your browser.',
      'Type /status to see every model in this agent report its own health — live.',
      "Emin's first tech role was Data Analyst. Now he's an FDE at Cresta AI.",
      'This site has zero tracking on the agent page. Your chats are 100% private.'
    ];
    var pick = facts[Math.floor(Math.random() * facts.length)];
    return {
      toolName: 'lucky',
      content: box('DID YOU KNOW?', ['* ' + pick]) + '<div style="color:var(--muted);font-size:var(--text-2xs);margin-top:6px">Try /lucky again for another random fact</div>',
      data: { fact: pick }
    };
  }

  Tools.register('lucky', {
    run: runLucky,
    meta: { description: 'Random fun fact about the site', keywords: ['lucky','fun','fact','random','surprise'], selfContained: true, category: 'fun', params: {} }
  });

  function runAskUser(text) {
    var question = (text || '').replace(/^\/ask\s*/i, '').trim();
    if (!question) question = 'What would you like to explore?';
    return {
      toolName: 'ask_user',
      content: question,
      data: {
        question: question,
        options: ['Emin\'s work', 'Open-source projects', 'Smart glasses', 'Contact']
      },
      interactive: true
    };
  }

  Tools.register('ask_user', {
    run: runAskUser,
    meta: { description: 'Ask the visitor to choose which portfolio area to explore', keywords: ['choose','which','explore','clarify','option'], selfContained: false, interactive: true, category: 'interactive', params: {} }
  });
})();

// tool-session.js — /status, /session and /sessions: the running session, and
// the saved ones. /resume and /forget are named here but run in router.js.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  var html = Tools.html;

  // Shared LLM state → display label.
  function llmLabel(models) {
    var state = models || {};
    if (state.llmReady) return 'ready';
    if (state.llmLoading && state.llmDownloadProgress > 0) return 'loading ' + state.llmDownloadProgress + '%';
    if (state.llmLoading) return 'loading';
    if (state.llmError) return 'unavailable';
    return 'idle';
  }

  // Accurate localStorage usage: JSON.stringify(localStorage) is always "{}"
  // (Storage isn't a plain object), so sum each key + value length instead.
  function storageSizeLabel() {
    try {
      var total = 0;
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key == null) continue;
        total += key.length + (localStorage.getItem(key) || '').length;
      }
      if (total < 1024) return total + 'B';
      if (total < 1024 * 1024) return (total / 1024).toFixed(1) + 'KB';
      return (total / (1024 * 1024)).toFixed(1) + 'MB';
    } catch(error) { return 'N/A'; }
  }

  function uptimeLabel(storeState) {
    var now = Date.now();
    var sessionStart = (storeState && storeState.session && storeState.session.start) || now;
    var elapsed = Math.floor((now - sessionStart) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    return mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
  }

  function runSession(storeState) {
    var duration = uptimeLabel(storeState);
    var msgCount = (storeState && storeState.session && storeState.session.messageCount) || 0;
    var sessionId = (storeState && storeState.session && storeState.session.id) || 'unknown';
    var modelStatus = llmLabel(storeState && storeState.models);

    return {
      toolName: 'session',
      content: html.box('SESSION', [
        'ID:      ' + sessionId,
        'Uptime:  ' + duration,
        'Messages:' + msgCount,
        'LLM:     ' + modelStatus,
        'Storage: ' + storageSizeLabel()
      ]),
      data: { sessionId: sessionId, duration: duration, msgCount: msgCount, llm: modelStatus }
    };
  }

  // ─── Tool: status — everything at a glance ────────────────
  function runStatus(storeState) {
    var duration = uptimeLabel(storeState);
    var llm = llmLabel(storeState && storeState.models);
    var nav = typeof navigator !== 'undefined' ? navigator : {};
    var online = nav.onLine ? 'yes' : 'no';
    var cores = nav.hardwareConcurrency || '?';
    var ram = nav.deviceMemory || '?';
    var conn = (nav.connection) ? nav.connection.effectiveType || '?' : '?';
    var scr = typeof screen !== 'undefined' ? screen : {};
    var dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    return {
      toolName: 'status',
      content: html.box('SYSTEM STATUS', [
        'Session:  ' + duration + ' · ' + ((storeState && storeState.session && storeState.session.messageCount) || 0) + ' msgs',
        'LLM:      ' + llm + ' · SmolLM2-360M',
        'Device:   ' + cores + ' cores · ' + ram + ' GB RAM',
        'Screen:   ' + scr.width + '×' + scr.height + ' @ ' + dpr + 'x',
        'Network:  ' + conn + ' · online: ' + online,
        '',
        'Try /device /screen /network for details'
      ]),
      data: { duration: duration, llm: llm, cores: cores }
    };
  }

  // ─── Session management tools ────────────────────────────
  function listSessions(sessions, storageSize) {
    if (!sessions || sessions.length === 0) {
      return {
        toolName: 'sessions',
        content: html.box('SESSIONS', ['No saved sessions.', 'Sessions auto-save after each message.', 'Storage: ' + (storageSize || '0KB')]),
        data: { count: 0 }
      };
    }
    var lines = [];
    for (var i = sessions.length - 1; i >= 0; i--) {
      var saved = sessions[i];
      var ago = Math.floor((Date.now() - saved.start) / 60000);
      var agoStr = ago < 60 ? ago + 'm ago' : Math.floor(ago/60) + 'h ago';
      var preview = (saved.firstMessage || 'empty').slice(0, 50);
      if (saved.firstMessage && saved.firstMessage.length > 50) preview += '...';
      lines.push(html.cmdLink('/resume ' + saved.id, '/resume ' + saved.id) + '  — ' + agoStr + ' · ' + saved.messageCount + ' msgs');
      // saved.firstMessage is the visitor's own raw first message (store.js
      // firstUserText, persisted unescaped) — escape it here, same as the
      // /blog and /game "no match" echoes, so a saved session can't plant
      // live markup (or an authored-looking onclick gadget) in this card.
      lines.push('  ' + html.escape(preview));
    }
    lines.push('');
    lines.push('/forget — clear all saved sessions (confirm)');
    lines.push('Storage: ' + (storageSize || '?'));
    return {
      toolName: 'sessions',
      content: html.box('SESSIONS (' + sessions.length + ')', lines),
      data: { count: sessions.length }
    };
  }

  Tools.sessions = listSessions;

  // status and session read the store's state, which execute() hands them.
  Tools.register('status', {
    run: runStatus,
    state: true,
    meta: { description: 'System status at a glance (needs store state)', keywords: ['status','system','health','info'], selfContained: true, category: 'meta', params: {} }
  });
  Tools.register('session', {
    run: runSession,
    state: true,
    meta: { description: 'Current session uptime and stats', keywords: ['session','uptime','stats','messages'], selfContained: true, category: 'session', params: {} }
  });
  // sessions, resume and forget are commands router.js runs itself: no run here.
  Tools.register('sessions', {
    run: null,
    meta: { description: 'List saved sessions', keywords: ['sessions','history','saved','list'], selfContained: true, category: 'session', params: {} }
  });
  Tools.register('resume', { run: null });
  Tools.register('forget', { run: null });
})();

// tools-match.js — how a visitor's text finds a tool or an FAQ entry, and the
// canned prose the agent falls back on, and the virtual registry entries.
// Needs tools.js and every tool-*.js before it: fuzzyMatch reads
// Tools.TOOL_REGISTRY, so a tool registered later would be missing from the
// scores.
// eslint-disable-next-line max-lines-per-function -- IIFE wrapper, as in tools.js
(function() {
  "use strict";

  // ─── Fuzzy tool matching ──────────────────────────────────
  // Scores user query against tool descriptions + keywords.
  // Returns {tool, score} for best match above threshold, or null.
  // This is the SINGLE matching function — no more per-tool keyword patching.
  var STOP_WORDS = {what:1,where:1,when:1,why:1,who:1,how:1,do:1,does:1,did:1,is:1,are:1,was:1,were:1,can:1,could:1,will:1,would:1,shall:1,should:1,tell:1,show:1,give:1,get:1,has:1,have:1,had:1,the:1,a:1,an:1,he:1,she:1,it:1,they:1,me:1,him:1,her:1,them:1,his:1,you:1,your:1,yours:1,for:1,to:1,of:1,in:1,on:1,at:1,by:1,with:1,from:1,about:1,any:1,some:1,just:1,please:1,open:1,last:1,latest:1,recent:1,newest:1};

  // A lone hit on one of these must not carry a tool over the threshold by
  // itself (a bare place name says nothing about intent — "pizza in
  // Vancouver" isn't a question about Emin). Requires a second corroborating
  // keyword hit, a phrase match, or a tool-name mention instead. 'who' isn't
  // listed here because it's a pure filler question word (STOP_WORDS above),
  // not a signal at all.
  var SOLO_INSUFFICIENT = { vancouver: 1 };

  // Keywords matched whole: a phrase ("hack overflow") or the game's URL-style
  // name ("hack://overflow"). Tokenized, either would leak a bare "overflow".
  var PHRASE_KEYWORD = /\s|:\/\//;

  function fuzzyMatch(text) {
    var TOOL_REGISTRY = Tools.TOOL_REGISTRY;
    // Exact tool-name match (e.g. bare "g1", "blog", "about") — unambiguous, so
    // it takes priority over the short-word filter (query words ≤2 chars and
    // stop words are otherwise dropped, which sent a bare "g1" or "about" query
    // to the out-of-scope sink instead of the tool).
    var bare = String(text || '').trim().toLowerCase().replace(/[^a-z0-9_-]+$/g, '');
    for (var tn = 0; tn < TOOL_REGISTRY.length; tn++) {
      var tnName = TOOL_REGISTRY[tn].name;
      if (tnName === 'chat' || tnName === 'stop' || tnName === 'faq' || tnName === 'out_of_scope') continue;
      if (bare === tnName) return { tool: tnName, score: 95 };
    }

    var rawWords = (text || '').toLowerCase().match(/[a-z][a-z0-9_-]*/g) || [];
    var qWords = [];
    for (var rw = 0; rw < rawWords.length; rw++) {
      var w = rawWords[rw];
      if (!STOP_WORDS[w] && w.length > 2) qWords.push(w);
    }
    if (!qWords.length) {
      // Every word was a stop word / short word. If the query is a second-person
      // question, the pronoun was the only signal — resolve it deterministically:
      //   capability ("what can you do") → help, identity ("what do you do") → about.
      var bareLower = String(text || '').toLowerCase();
      if (/\b(you|your|yours)\b/.test(bareLower)) {
        return /\b(can|could)\b/.test(bareLower) ? { tool: 'help', score: 70 } : { tool: 'about', score: 70 };
      }
      return null;
    }
    var qText = qWords.join(' ');

    var best = null, bestScore = 0;
    for (var i = 0; i < TOOL_REGISTRY.length; i++) {
      var rt = TOOL_REGISTRY[i];
      if (rt.name === 'chat' || rt.name === 'stop' || rt.name === 'faq' || rt.name === 'out_of_scope') continue;

      // Phrase keywords stay out of the corpus; the phrase bonus below matches them whole.
      var singleWordKws = [];
      var allKws = rt.keywords || [];
      for (var swk = 0; swk < allKws.length; swk++) {
        if (!PHRASE_KEYWORD.test(allKws[swk])) singleWordKws.push(allKws[swk]);
      }
      var corpus = (rt.name + ' ' + rt.description + ' ' + singleWordKws.join(' ')).toLowerCase();
      var cWords = corpus.match(/[a-z][a-z0-9_-]*/g) || [];

      // Filter stop words + tiny words from the corpus so common short words
      // (e.g. "to" in "visitor to choose") don't prefix-match query words
      // (e.g. "tokyo") and mis-route out-of-scope queries to the wrong tool.
      var cwFiltered = [];
      for (var cf = 0; cf < cWords.length; cf++) {
        var cw = cWords[cf];
        if (!STOP_WORDS[cw] && cw.length > 2) cwFiltered.push(cw);
      }
      cWords = cwFiltered;

      var score = 0;
      var hitWords = {}; // distinct query words that scored — see solo-signal guard below
      for (var wi = 0; wi < qWords.length; wi++) {
        var qw = qWords[wi];
        for (var ci = 0; ci < cWords.length; ci++) {
          var cw = cWords[ci];
          // Exact word, or the corpus keyword is a prefix of a longer query
          // word with a short leftover suffix (e.g. "projects"→"project", a
          // 1-letter plural). Capping the leftover at 3 chars still covers
          // regular plurals/-ing/-ed while rejecting an unrelated word that
          // merely happens to start the same way, e.g. "playwright"→"play"
          // (leftover "wright", 6 chars) — that used to wrongly score a game
          // hit for a testing-tool question. The inverse (a short query word
          // prefixing a longer corpus word, e.g. "good"→"goodfintech") used to
          // also score but let generic filler words piggyback on unrelated
          // company/project names, so that direction was removed outright.
          if (cw === qw || (qw.indexOf(cw) === 0 && qw.length - cw.length <= 3)) { score += 2; hitWords[qw] = true; break; }
        }
      }
      // Phrase bonus: phrase keywords found whole in the raw text
      var phraseHit = false;
      var kws = rt.keywords || [];
      for (var ki = 0; ki < kws.length; ki++) {
        var kw = String(kws[ki]).toLowerCase();
        if (PHRASE_KEYWORD.test(kw) && text.toLowerCase().indexOf(kw) !== -1) { score += 3; phraseHit = true; }
      }
      // Tool name match
      var nameHit = qText.indexOf(rt.name) !== -1 || text.toLowerCase().indexOf(rt.name) !== -1;
      if (nameHit) score += 2;

      // A lone incidental keyword (pronoun, question word, place name) must
      // not carry a tool over the threshold on its own — require either a
      // second corroborating hit, a phrase/tool-name match, or a keyword
      // that isn't in the generic/incidental SOLO_INSUFFICIENT list.
      var hitCount = 0, onlyHit = null;
      for (var hw in hitWords) { hitCount++; onlyHit = hw; }
      if (hitCount === 1 && !phraseHit && !nameHit && SOLO_INSUFFICIENT[onlyHit]) continue;

      var normalized = qWords.length > 0 ? score / Math.max(1, Math.sqrt(qWords.length)) : 0;
      if (normalized > bestScore) { bestScore = normalized; best = rt.name; }
    }

    // Threshold: need at least 1.0 normalized score for confident match
    if (best && bestScore >= 0.6) return { tool: best, score: Math.min(95, Math.round(bestScore * 25)) };
    return null;
  }

  // ─── FAQ ─────────────────────────────────────────────────
  function faq_match(text) {
    // Best-match scoring with word-boundary for short keywords.
    // This is a safety-net fallback — Needle ONNX is the primary classifier.
    var FAQ = Tools.getFAQ();
    if (!FAQ || !FAQ.faq) return null;
    var l = text.toLowerCase();
    var best = null, bestScore = 0, bestLongest = 0;

    for (var f = 0; f < FAQ.faq.length; f++) {
      var kws = FAQ.faq[f].keywords;
      if (!kws) continue;
      var score = 0, specific = false, longest = 0;
      for (var k = 0; k < kws.length; k++) {
        var kw = kws[k];
        var hit = false;
        if (kw.length <= 3) {
          // Word-boundary match for short keywords (avoids "old" matching "told")
          var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          var re = new RegExp('\\b' + escaped + '\\b');
          if (re.test(l)) { score += 3; hit = true; } // strong signal for exact short-word match
        } else if (l.indexOf(kw) !== -1) {
          score += kw.split(' ').length; // multi-word bonus
          hit = true;
        }
        // A keyword outside fuzzyMatch's generic filler list (STOP_WORDS) names
        // something specific.
        if (hit && !STOP_WORDS[kw]) specific = true;
        if (hit && kw.length > longest) longest = kw.length;
      }
      // A match built entirely out of generic filler words (e.g. a bare "who"
      // or "you" hitting "Who are you?") isn't a real signal — same reasoning
      // as fuzzyMatch's solo-signal guard. Without this, "Who won the last
      // Super Bowl?" got answered as if it were about Emin, and "does he do
      // consulting" scored 3 on "do" for "What does Emin do?", outranking
      // "Freelance?". Such an entry is never a candidate.
      if (!specific) continue;
      // On a tie the entry whose longest matched keyword is longer wins
      // ("how are you" over "hi"), instead of whichever entry happens to sit
      // earlier in the array.
      var ties = score === bestScore && score > 0;
      if (score > bestScore || (ties && longest > bestLongest)) {
        bestScore = score; best = FAQ.faq[f]; bestLongest = longest;
      }
    }

    // Lower threshold for short queries (single keyword is enough for "bye"/"thanks")
    var minScore = text.length < 30 ? 1 : 2;
    if (best && bestScore >= minScore) {
      return { toolName: 'faq', content: '<div class="faq-response">' + best.a + '</div>', data: null };
    }
    return null;
  }

  function faq_getFallback() {
    var FAQ = Tools.getFAQ();
    if (FAQ && FAQ.fallback && FAQ.fallback.responses) {
      return FAQ.fallback.responses[Math.floor(Math.random() * FAQ.fallback.responses.length)];
    }
    return 'I don\'t have an answer for that. Try <b>/help</b> to see commands!';
  }

  // Deterministic fast-path for well-known site questions. The Needle
  // classifier misroutes these ('tools on this site' → skills, 'learning hub'
  // → chat/LLM, 'is there a blog?' → chat/LLM), which produces wrong answers
  // or stalls. Matching these BEFORE classification guarantees the FAQ answer.
  //
  // The later patterns catch what no tool can answer (injection, thanks, a
  // joke, hello, hiring, the router): Needle's keywords sent those to a stray
  // tool or the chat model. A greeting or thanks counts only as the whole
  // message, so "hi, show me your repos" still reaches /repos.
  var FAST_PATH_PATTERNS = [
    // Site tools (NOT Emin's tech stack — those still go to skills). A bare
    // "tools are" also matches the tech-stack questions "what tools are in
    // his stack" and "what tools are you best at", so "tools are" counts
    // only before "on this site/page/website" or "here".
    /tools (on|here|available|does this)|tools are (available )?(on this (site|page|website)|here)\b|site tools|list of tools|tool list/,
    // Site mechanics / local agent. "how do you work" is scoped to the
    // agent's own mechanism (no trailing "with" — "how do you work with
    // clients" is a role question, not a chat-mechanics one), and
    // "data leaves/stays" requires a device/browser anchor so a bare
    // "where does my data stay" (no destination named) falls through to
    // normal classification instead of forcing this fast path.
    /how does this (chat|site|website|page|agent|work)|how do you work(?!\s+with)|how are you built|how is this (site|built|agent built)|100% local|run(s)? (entirely )?locally|runs (entirely )?in your browser|on-?device|local model|privacy|private|data (leaves?|stays?)( (on|in))? (my|your|the) (device|browser)|no servers|no api calls|zero (servers|tracking)/,
    // Learning hub (Emin's ultrafocus.space project)
    /learning hub|learning-hub|learning library|learn hub|learning center/,
    // Blog existence/overview (topic queries still go to the /blog tool)
    /is there a blog|does (he|emin) have a blog|has a blog|blog posts|blog articles|does emin write/,
    // The agent itself: its router, loop and architecture (the "How does this work?" entry)
    /how (does|do|is) (the |your |this )?(router|needle|agent loop|routing)\b|what(?:'s| is| are) (the |your )?(needle|router|agent loop|smollm2?)\b|\byour (agent loop|router|architecture)\b|explain your (architecture|design|system|loop|agent)/,
    // Prompt injection and probing for the prompt
    /\b(ignore|disregard|forget) (all |your )?(previous |prior )?instructions\b|\byour (system|hidden) prompt\b|jailbreak|developer mode/,
    // Hiring, availability, freelance and co-founding
    /\b(open|available) (to|for) (work|hire|hiring|new roles?|opportunit(y|ies))\b|\blooking for (work|new roles?|opportunit(y|ies))\b|\bhireable\b|\bco-?found(er|ers|ing)?\b|\bfounding engineer\b|\bfreelanc(e|er|ing)\b|\bconsult(ing|ant|ancy)\b|\bcontract(ing)? (work|role|basis|gig)|\b(is|are) (he|emin|you) (hiring|available)\b|\bcan i hire\b|\bhire (him|emin)\b/,
    // A joke
    /\b(jokes?|make me laugh|something funny)\b/,
    // Only a greeting, how-are-you, or thanks
    /^\W*(hi|hello|hey|yo|howdy|hola|sup|good (morning|afternoon|evening))( there| everyone| all| again)?\W*$/,
    /^\W*((hi|hello|hey|yo)\W+(there\W+)?)?(how are (you|u)|how's it going|how you doing|what's up)( doing)?( today)?\W*$/,
    /^\W*((thanks|thank you)( a lot| so much| very much| again)?|thank u|thx|thnx|cheers|much appreciated|appreciate it)\W*((that|this|it)( was| is)? (helpful|great|good|useful|awesome|nice|perfect)|(that|this|it) helps|great|nice|perfect|helpful|got it|ok|okay)?\W*$/
  ];

  function detectKnowledgeFastPath(text) {
    var lower = (text || '').toLowerCase();
    for (var i = 0; i < FAST_PATH_PATTERNS.length; i++) {
      if (FAST_PATH_PATTERNS[i].test(lower)) return 'faq';
    }
    return null;
  }

  // ─── Canned prose ────────────────────────────────────────
  // The honest miss: it echoes the visitor's words and offers two links that
  // run. While Needle is still loading it says so instead.
  function missLinks() {
    var cmdLink = Tools.html.cmdLink;
    return 'Try ' + cmdLink('/about', 'his background') + ' or ' + cmdLink('/repos', 'his projects') + ', or type <b>/help</b>.';
  }

  function matcherLoading() {
    var state = Tools._store && Tools._store.getState();
    return Boolean(state && state.models && state.models.needleLoading && !state.models.needleReady);
  }

  var MISS_ECHO_MAX = 80;
  function missEcho(query) {
    var chars = Array.from(String(query));
    var cut = chars.length > MISS_ECHO_MAX ? chars.slice(0, MISS_ECHO_MAX).join('') + '…' : chars.join('');
    return Tools.html.escape(cut);
  }

  function missMessage(query, why) {
    var echo = query ? ' "<b>' + missEcho(query) + '</b>"' : ' that';
    if (matcherLoading()) {
      return 'My question matcher is still loading, so I may have missed what you meant by' + echo + '. Ask again in a moment, or ' + missLinks().replace(/^Try/, 'try');
    }
    return 'I couldn\'t find anything on' + echo + ' in what Emin has published.' + (why ? ' ' + why : '') + ' ' + missLinks();
  }

  function outOfScopeMessage(query) {
    return missMessage(query);
  }

  function reducedModeMessage(query) {
    // Reached both when the model never loaded and when it loaded but then
    // hit a fatal error mid-session (worker crash) — word it so neither case
    // reads as wrong.
    return missMessage(query, 'The on-device chat model is not running in this session (it either couldn\'t load or stopped responding), so I can only answer from his notes.');
  }

  // Soft heads-up shown alongside (never instead of) a real answer: the
  // prompt itself is always clamped, so this never blocks a turn -- it just
  // flags that older turns may be fading from what the model can see.
  function contextExhaustedMessage() {
    return 'This session’s context is getting long, so earlier turns may be fading from what I can recall. Type <b>/new</b> for a completely fresh start if my answers seem to lose track — deterministic tools like /repos and /skills always work regardless.';
  }

  function profileFacts() {
    return 'TRUSTED PROFILE FACTS: Emin Gench is based in Vancouver, BC, Canada, and works as a Forward Deployed AI Engineer at Cresta AI. Previously Goodfintech (AI Engineer), Vivoo (Machine Learning Engineer), Novit AI (Full-stack AI Engineer), E-Kalite Software (Python Developer/QA), and indie game development (Founder, emdi_apps). He builds open-source AI and smart-glasses projects, including even_glasses, telegramGPT, G1 Voice AI, g1_flutter, and visionlink. He has 46 repositories and 250+ GitHub stars. Do not infer a different residence or employer.';
  }

  function llmConsentMessage(megabytes) {
    const button = 'display:inline-block;padding:6px 12px;border:1px solid var(--accent);border-radius:6px;font-family:monospace;font-size:var(--text-2xs);cursor:pointer;margin:6px 8px 0 0';
    return faq_getFallback() +
      '<br><br><span style="color:var(--muted)">The optional chat model answers in plain words. Downloads once, runs on this device, nothing leaves it.</span><br>' +
      '<span style="' + button + ';color:var(--accent)" onclick="window._enableLLM()">load ' + (megabytes ? megabytes + ' MB' : 'chat model') + '</span>' +
      '<span style="' + button + ';color:var(--muted)" onclick="window._declineLLM()">answer from files only</span>';
  }

  // ─── Registry entries no tool function backs ─────────────
  // The answer paths the router reaches by name (faq, chat, stop) and the
  // out-of-scope sink. They register after every tool, so fuzzyMatch and the
  // scope check see the real tools first.
  Tools.register('faq', {
    meta: { description: 'FAQ knowledge base lookup', keywords: [], selfContained: true, category: 'virtual', params: {} }
  });
  Tools.register('chat', {
    meta: { description: 'Conversational chat response', keywords: [], selfContained: true, category: 'virtual', params: {} }
  });
  Tools.register('stop', {
    meta: { description: 'No tool needed — greeting, thanks, or casual conversation', keywords: [], selfContained: true, category: 'virtual', params: {} }
  });
  Tools.register('out_of_scope', {
    run: null,
    meta: { description: 'Query is outside this portfolio assistant\'s verified scope', keywords: [], scopeWords: [], selfContained: true, terminal: true, category: 'virtual', params: {} }
  });

  Tools.fuzzyMatch = fuzzyMatch;
  Tools.faqMatch = faq_match;
  Tools.faqFallback = faq_getFallback;
  Tools.detectKnowledgeFastPath = detectKnowledgeFastPath;
  Tools.outOfScopeMessage = outOfScopeMessage;
  Tools.reducedModeMessage = reducedModeMessage;
  Tools.contextExhaustedMessage = contextExhaustedMessage;
  Tools.profileFacts = profileFacts;
  Tools.llmConsentMessage = llmConsentMessage;
})();
