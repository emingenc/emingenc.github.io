// tools.js v2 — Pure tools + FAQ + multi-intent routing + clickable outputs
// eslint-disable-next-line max-lines-per-function -- legacy module wrapper (IIFE); out of scope for this UI change
var Tools = (function() {
  "use strict";

  var FAQ = null;

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

  // ─── Keyword routing ─────────────────────────────────────
  var KEYWORDS = {
    about:   ['emin','gench','bio','archangel','goodfintech','vivoo','novit','cresta','aerospace','fde','vancouver','resume','cv','who','work','job','role','career','background','experience','title','company','position','education','degree','history','past','worked','studied','teams','lead','manage','shipped','launched','delivered','location','living','based','school','university','built','made','opportunities','available','employer','yourself','him','his','study','he'],
    repos:   ['repos','repo','github','project','code','open source','built','star','repository','portfolio','contribution','deploy','deployment','pipeline','infra','devops','ci/cd','docs','documentation','apps','applications','features','PR','pull request','patch','commit'],
    contact: ['email','contact','reach','reach out','touch','hire','collaborate','linkedin','twitter','mail','phone','social','handle','message','connect'],
    skills:  ['skills','skill','tech','tool','tools','stack','know','language','python','typescript','docker','programming','framework','database','cloud','aws','linux','fastapi','next','react','ml','llm','rag','agent'],
    blog:    ['blog','post','article','read','published','writing'],
    g1:      ['g1','smart glasses','smart glass','glasses','even realities','ble','flutter','wearable','hardware','even_glasses'],
    game:    ['game','play','playable','games','arcade','platformer','hack-overflow','hack overflow','hack://overflow','blind 75','run game','launch']
  };

  var ALL_CMDS = ['/about','/repos','/contact','/skills','/blog','/g1','/game','/time','/device','/screen','/network','/lucky','/ask','/status','/session','/help','/clear','/new','/sessions','/resume','/forget'];

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
  // ─── Blog posts index — single source of truth is data/knowledge/blog-index.json,
  //      loaded by KnowledgeBase. No hardcoded list here (read at call time below).

  // ─── Tool: about ─────────────────────────────────────────
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
      return Boolean(name) && kwBoundaryHit(lower, name.trim());
    });
  }

  function tool_about(text) {
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
      '249+ GitHub stars · 47 repos',
      'Former Air Defense Officer'
    ];
    return { toolName: 'about', content: box('EMIN GENCH', items), data: null };
  }

  // ─── Tool: repos (clickable links) ───────────────────────
  function tool_repos() {
    var repos = [
      { name: 'even_glasses', slug: 'even_glasses', stars: 78, desc: 'G1 BLE SDK (Python)' },
      { name: 'telegramGPT', slug: 'telegramGPT', stars: 52, desc: 'AI bot building guide' },
      { name: 'G1 Voice AI', slug: 'G1_voice_ai_assistant', stars: 25, desc: 'Voice assistant' },
      { name: 'g1_flutter', slug: 'g1_flutter_blue_plus', stars: 18, desc: 'Flutter BLE bridge' },
      { name: 'visionlink', slug: 'visionlink', stars: 11, desc: 'Multi-device OS' },
      { name: 'llm_adaptive_router', slug: 'llm_adaptive_router', stars: 6, desc: 'LLM routing' }
    ];
    var lines = repos.map(function(r) {
      var url = 'https://github.com/emingenc/' + r.slug;
      return '*' + r.stars + '  ' + link(url, r.name, 'repo-link') + ' — ' + r.desc;
    });
    lines.push('');
    lines.push(link('https://github.com/emingenc', 'github.com/emingenc — 47 repos', 'repo-link'));
    return {
      toolName: 'repos',
      content: box('OPEN SOURCE', lines),
      data: { repos: repos }
    };
  }

  // ─── Tool: contact (clickable links) ─────────────────────
  function tool_contact() {
    var lines = [
      link('https://github.com/emingenc', 'github.com/emingenc'),
      link('https://linkedin.com/in/emingench', 'linkedin.com/in/emingench'),
      link('https://x.com/emingench', 'x.com/emingench')
    ];
    var html = box('CONNECT', lines);
    var footer = 'Open to: open source collaboration';
    if (FAQ && FAQ.tools && FAQ.tools.contact && FAQ.tools.contact.footer) footer = FAQ.tools.contact.footer;
    html += '<div style="color:var(--muted);font-size:var(--text-2xs);margin-top:6px">' + footer + '</div>';
    return { toolName: 'contact', content: html, data: null };
  }

  // ─── Tool: skills ────────────────────────────────────────
  function tool_skills() {
    var html = box('TECH STACK', [
      'AI/ML — LLMs, Agents, RAG',
      'Languages — Python, TypeScript, Dart',
      'Backend — FastAPI, Next.js, PostgreSQL',
      'Infra — Docker, AWS, Linux, CI/CD'
    ]);
    return { toolName: 'skills', content: html, data: null };
  }

  // ─── Tool: blog (text-based routing) ─────────────────────
  function tool_blog(text) {
    // Single source of truth: KnowledgeBase loads blog-index.json (async).
    var BLOG_POSTS = (typeof KnowledgeBase !== 'undefined' && KnowledgeBase.getBlogPosts)
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

    if (query) {
      // Ordinal queries: last/latest/recent/newest → newest, first/oldest → oldest
      if (/\b(last|latest|recent|newest|most recent)\b/i.test(query) && BLOG_POSTS.length > 0) {
        return { toolName: 'blog', redirect: '/blog/' + BLOG_POSTS[0].slug, content: null, data: { matched: BLOG_POSTS[0].title } };
      }
      if (/\b(first|oldest|earliest)\b/i.test(query) && BLOG_POSTS.length > 0) {
        return { toolName: 'blog', redirect: '/blog/' + BLOG_POSTS[BLOG_POSTS.length - 1].slug, content: null, data: { matched: BLOG_POSTS[BLOG_POSTS.length - 1].title } };
      }
      // Try exact slug match
      for (var i = 0; i < BLOG_POSTS.length; i++) {
        if (BLOG_POSTS[i].slug === query.toLowerCase().replace(/\s+/g, '-')) {
          return { toolName: 'blog', redirect: '/blog/' + BLOG_POSTS[i].slug, content: null, data: null };
        }
      }
      // Fuzzy match: find best post by title keyword overlap
      var best = null, bestScore = 0;
      var qWords = query.toLowerCase().split(/\s+/);
      for (var i = 0; i < BLOG_POSTS.length; i++) {
        var score = 0;
        var titleLower = BLOG_POSTS[i].title.toLowerCase();
        for (var w = 0; w < qWords.length; w++) {
          if (titleLower.indexOf(qWords[w]) !== -1) score++;
        }
        if (score > bestScore) { bestScore = score; best = BLOG_POSTS[i]; }
      }
      if (best && bestScore > 0) {
        return { toolName: 'blog', redirect: '/blog/' + best.slug, content: null, data: { matched: best.title } };
      }
      // No match — show blog listing. Escape the echoed query: it reaches this
      // card verbatim from the URL/typed input (e.g. ?q=/blog+<img onerror=…>).
      return {
        toolName: 'blog',
        content: box('BLOG', [
          'No post matching "' + echoQuery(query) + '"',
          '',
          'Available posts:'
        ].concat(BLOG_POSTS.map(function(p) { return cmdLink('/blog ' + p.slug, p.title); }))),
        data: null
      };
    }

    // Just /blog — show listing
    var lines = BLOG_POSTS.map(function(p) {
      return cmdLink('/blog ' + p.slug, p.title);
    });
    if (lines.length === 0) lines = ['No posts yet — coming soon'];
    lines.push('');
    lines.push(link('/blog', 'Visit all posts →'));
    return { toolName: 'blog', content: box('WRITING', lines), data: null };
  }

  // ─── Tool: g1 ────────────────────────────────────────────
  function tool_g1() {
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

  // ─── Tool: time ─────────────────────────────────────────
  function tool_time() {
    var now = new Date();
    var weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    var timeStr = h12 + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0') + ' ' + ampm;
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
    // getTimezoneOffset() is minutes WEST of UTC; negate to get minutes EAST.
    var offMin = -now.getTimezoneOffset();
    var offSign = offMin >= 0 ? '+' : '-';
    var offAbs = Math.abs(offMin);
    var offH = Math.floor(offAbs / 60);
    var offM = offAbs % 60;
    // Whole-hour offsets render compactly (UTC-7). Fractional offsets (India
    // +5:30, Nepal +5:45, Newfoundland -3:30) render with a minute component so
    // they don't surface as misleading decimals like "UTC+5.5".
    var tzStr = 'UTC' + offSign + offH + (offM ? ':' + String(offM).padStart(2, '0') : '');

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

  // ─── Tool: session ───────────────────────────────────────
  // Shared LLM state → display label (mirrors renderer.js renderLLMStatus).
  function llmLabel(models) {
    var m = models || {};
    if (m.llmReady) return 'ready';
    if (m.llmLoading && m.llmDownloadProgress > 0) return 'loading ' + m.llmDownloadProgress + '%';
    if (m.llmLoading) return 'loading';
    if (m.llmError) return 'unavailable';
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
    } catch(e) { return 'N/A'; }
  }

  function tool_session(storeState) {
    var now = Date.now();
    var sessionStart = (storeState && storeState.session && storeState.session.start) || now;
    var elapsed = Math.floor((now - sessionStart) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var duration = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
    var msgCount = (storeState && storeState.session && storeState.session.messageCount) || 0;
    var sessionId = (storeState && storeState.session && storeState.session.id) || 'unknown';
    var modelStatus = llmLabel(storeState && storeState.models);

    return {
      toolName: 'session',
      content: box('SESSION', [
        'ID:      ' + sessionId,
        'Uptime:  ' + duration,
        'Messages:' + msgCount,
        'LLM:     ' + modelStatus,
        'Storage: ' + storageSizeLabel()
      ]),
      data: { sessionId: sessionId, duration: duration, msgCount: msgCount, llm: modelStatus }
    };
  }



  // ─── Tool: device — browser/hardware fingerprint ──────────
  function tool_device() {
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
  function tool_screen() {
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
  function tool_network() {
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

  // ─── Tool: game — playable builds published on this site ─────
  // Add new games by appending to GAMES. `path` is the same-origin route to
  // navigate to (works on the live site and any local/preview host); `url`
  // is the public address kept for display/reference only. Selectable:
  // /game shows the list, /game <id> redirects to launch it.
  var GAMES = [
    { id: 'hack-overflow', name: 'HACK://OVERFLOW', path: '/hack-overflow/', url: 'https://emingenc.github.io/hack-overflow/', desc: 'LeetCode puzzle game — solve each problem with one line of Python' }
  ];

  function tool_game(text) {
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
      var g = null;
      for (var i = 0; i < GAMES.length; i++) {
        if (GAMES[i].id === query || GAMES[i].name.toLowerCase().indexOf(query) !== -1) {
          g = GAMES[i]; break;
        }
      }
      if (g) {
        return { toolName: 'game', redirect: g.path || g.url, content: null, data: { matched: g.name } };
      }
      // Escape the echoed query — same crafted-link vector as the /blog "no match" card.
      var noLines = ['No game matching "' + echoQuery(query) + '"', '', 'Pick one:'];
      for (var ni = 0; ni < GAMES.length; ni++) noLines.push(cmdLink('/game ' + GAMES[ni].id, '> ' + GAMES[ni].name + ' — ' + GAMES[ni].desc));
      return { toolName: 'game', content: box('GAMES', noLines), data: { notFound: true } };
    }
    var lines = [];
    for (var gi = 0; gi < GAMES.length; gi++) lines.push(cmdLink('/game ' + GAMES[gi].id, '> ' + GAMES[gi].name + ' — ' + GAMES[gi].desc));
    lines.push('');
    lines.push('Select a game to launch it →');
    return { toolName: 'game', content: box('GAMES', lines), data: { games: GAMES } };
  }

  // ─── Tool: lucky — fun random surprises ───────────────────
  // eslint-disable-next-line id-match, max-lines-per-function -- legacy tool_* handler name and length; out of scope for this UI change
  function tool_lucky() {
    // Count answerable FAQ entries only (skip the decorative "═══ SECTION ═══"
    // header strings that also live in the faq array). Dynamic so it never
    // drifts out of sync with data/faq.json again.
    var faqCount = 0;
    if (FAQ && FAQ.faq) {
      for (var fi = 0; fi < FAQ.faq.length; fi++) {
        if (FAQ.faq[fi] && FAQ.faq[fi].q) faqCount++;
      }
    }
    var faqFact = faqCount > 0
      ? 'This FAQ alone has ' + faqCount + ' entries to answer almost any question instantly.'
      : 'This FAQ answers questions instantly — no servers, all local.';
    var facts = [
      'This entire website runs AI models locally in your browser. No servers!',
      'Emin taught himself to code while serving as an Air Defense Officer.',
      'The G1 smart glasses ecosystem spans 6 repos across 5 programming languages.',
      '249+ GitHub stars earned through open source, not marketing.',
      'Emin has a BSc in Aerospace Engineering — literally rocket science.',
      faqFact,
      'The AI model (SmolLM2-360M) is a 272 MB download (363 MB without WebGPU) and runs entirely in your browser.',
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

  // ─── Tool: status — everything at a glance ────────────────
  function tool_status(storeState) {
    var now = Date.now();
    var sessionStart = (storeState && storeState.session && storeState.session.start) || now;
    var elapsed = Math.floor((now - sessionStart) / 1000);
    var mins = Math.floor(elapsed / 60), secs = elapsed % 60;
    var duration = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
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
      content: box('SYSTEM STATUS', [
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

  // ─── Tool: ask_user — pause for an explicit visitor choice ──
  function tool_ask_user(text) {
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

  // ─── Tool: help ──────────────────────────────────────────
  function tool_help() {
    return {
      toolName: 'help',
      content: box('COMMANDS', [
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
      ]) + '<div style="color:var(--accent);font-size:var(--text-2xs);margin-top:6px;font-family:monospace">Tip: try /status or /lucky ⚡</div>',
      data: null
    };
  }

  // ─── Session management tools ────────────────────────────
  function tool_sessions(sessions, storageSize) {
    if (!sessions || sessions.length === 0) {
      return {
        toolName: 'sessions',
        content: box('SESSIONS', ['No saved sessions.', 'Sessions auto-save after each message.', 'Storage: ' + (storageSize || '0KB')]),
        data: { count: 0 }
      };
    }
    var lines = [];
    for (var i = sessions.length - 1; i >= 0; i--) {
      var s = sessions[i];
      var ago = Math.floor((Date.now() - s.start) / 60000);
      var agoStr = ago < 60 ? ago + 'm ago' : Math.floor(ago/60) + 'h ago';
      var preview = (s.firstMessage || 'empty').slice(0, 50);
      if (s.firstMessage && s.firstMessage.length > 50) preview += '...';
      lines.push(cmdLink('/resume ' + s.id, '/resume ' + s.id) + '  — ' + agoStr + ' · ' + s.messageCount + ' msgs');
      // s.firstMessage is the visitor's own raw first message (store.js
      // firstUserText, persisted unescaped) — escape it here, same as the
      // /blog and /game "no match" echoes, so a saved session can't plant
      // live markup (or an authored-looking onclick gadget) in this card.
      lines.push('  ' + escapeHtml(preview));
    }
    lines.push('');
    lines.push('/forget — clear all saved sessions (confirm)');
    lines.push('Storage: ' + (storageSize || '?'));
    return {
      toolName: 'sessions',
      content: box('SESSIONS (' + sessions.length + ')', lines),
      data: { count: sessions.length }
    };
  }

  function outOfScopeMessage() {
    return 'I can help with Emin\'s portfolio: his work, projects, skills, smart glasses, blog, or contact details. I don\'t have verified information about that topic. Try <b>/help</b> to see what I can explore.';
  }

  function reducedModeMessage() {
    // Reached both when the model never loaded and when it loaded but then
    // hit a fatal error mid-session (worker crash) — word it so neither case
    // reads as wrong.
    return 'I\'m running in <b>reduced mode</b> — the on-device language model isn\'t available in this session (it either couldn\'t load or stopped responding), so I can\'t write free-form answers. I can still help with Emin\'s work, projects, skills, smart glasses, blog, and commands — try <b>/help</b> or ask about a specific topic.';
  }

  // Deterministic fast-path for well-known site questions. The Needle
  // classifier misroutes these ('tools on this site' → skills, 'learning hub'
  // → chat/LLM, 'is there a blog?' → chat/LLM), which produces wrong answers
  // or stalls. Matching these BEFORE classification guarantees the FAQ answer.
  function detectKnowledgeFastPath(text) {
    var lower = (text || '').toLowerCase();
    var patterns = [
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
      /is there a blog|does (he|emin) have a blog|has a blog|blog posts|blog articles|does emin write/
    ];
    for (var i = 0; i < patterns.length; i++) {
      if (patterns[i].test(lower)) return 'faq';
    }
    return null;
  }

  var TOOL_MAP = {
    about: tool_about, repos: tool_repos, contact: tool_contact,
    skills: tool_skills, blog: tool_blog, g1: tool_g1, game: tool_game, help: tool_help,
    time: tool_time, device: tool_device, screen: tool_screen,
    network: tool_network, lucky: tool_lucky, ask_user: tool_ask_user, out_of_scope: null, status: null, session: null,
    sessions: null, resume: null, forget: null
  };

  var TOOL_REGISTRY = [
    { name: 'about', fn: tool_about, description: 'Emin Gench biography, career, current role at Cresta AI', keywords: ['emin','gench','bio','archangel','goodfintech','vivoo','novit','cresta','aerospace','fde','vancouver','resume','cv','who','work','job','role','career','background','experience','title','company','position','education','degree','history','past','worked','studied','teams','lead','manage','shipped','launched','delivered','location','living','based','school','university','built','made','opportunities','available','employer','yourself','him','his','study','he'], scopeWords: ['emin','gench','archangel','goodfintech','vivoo','novit','cresta','aerospace','fde','vancouver','career','role','job','work','title','position','company','employer','background','experience','education','degree','school','university','history','past','worked','studied','lead','manage','team','shipped','launched','delivered','built','made','location','based','living','available','opportunities','engineer','resume','cv','bio','his','him','he','yourself','study'], selfContained: true, category: 'discover', params: {} },
    { name: 'repos', fn: tool_repos, description: 'GitHub open source repositories by emingenc', keywords: ['repos','repo','github','project','code','open source','built','star','repository','portfolio','contribution','deploy','deployment','pipeline','infra','devops','ci/cd','docs','documentation','apps','applications','features','PR','pull request','patch','commit'], selfContained: true, category: 'discover', params: {} },
    { name: 'contact', fn: tool_contact, description: 'Contact Emin Gench: email, GitHub, LinkedIn, Twitter', keywords: ['email','contact','reach','reach out','touch','hire','collaborate','linkedin','twitter','mail','phone','social','handle','message','connect'], selfContained: true, category: 'discover', params: {} },
    { name: 'skills', fn: tool_skills, description: 'Technical skills: Python, TypeScript, Dart, FastAPI, Next.js, Docker, AWS', keywords: ['skills','skill','tech','tool','tools','stack','know','language','python','typescript','docker','programming','framework','database','cloud','aws','linux','fastapi','next','react','ml','llm','rag','agent'], selfContained: true, category: 'discover', params: {} },
    { name: 'blog', fn: tool_blog, description: 'Blog posts about building AI agents', keywords: ['blog','post','article','write','read','published'], selfContained: true, category: 'discover', params: {} },
    { name: 'g1', fn: tool_g1, description: 'G1 smart glasses by Even Realities: BLE SDK, voice assistant, mobile bridge', keywords: ['g1','smart glass','glasses','even realities','ble','flutter','wearable','hardware','even_glasses'], selfContained: true, category: 'discover', params: {} },
    { name: 'game', fn: tool_game, description: 'Emin\'s playable games', keywords: ['game','play','playable','games','arcade','platformer','hack-overflow','hack overflow','hack://overflow','blind 75'], selfContained: true, category: 'fun', params: {} },
    { name: 'help', fn: tool_help, description: 'List all available commands', keywords: ['help','commands','what can you do','options'], selfContained: true, category: 'meta', params: {} },
    { name: 'time', fn: tool_time, description: 'Current local time and timezone', keywords: ['time','date','clock','timezone','what time'], selfContained: true, category: 'device', params: {} },
    { name: 'device', fn: tool_device, description: 'Browser and hardware fingerprint', keywords: ['device','browser','hardware','cores','memory'], selfContained: true, category: 'device', params: {} },
    { name: 'screen', fn: tool_screen, description: 'Display resolution and color depth', keywords: ['screen','display','resolution','viewport'], selfContained: true, category: 'device', params: {} },
    { name: 'network', fn: tool_network, description: 'Network connection type and speed', keywords: ['network','connection','speed','online','offline'], selfContained: true, category: 'device', params: {} },
    { name: 'lucky', fn: tool_lucky, description: 'Random fun fact about the site', keywords: ['lucky','fun','fact','random','surprise'], selfContained: true, category: 'fun', params: {} },
    { name: 'ask_user', fn: tool_ask_user, description: 'Ask the visitor to choose which portfolio area to explore', keywords: ['choose','which','explore','clarify','option'], selfContained: false, interactive: true, category: 'interactive', params: {} },
    { name: 'status', fn: null, description: 'System status at a glance (needs store state)', keywords: ['status','system','health','info'], selfContained: true, category: 'meta', params: {} },
    { name: 'session', fn: null, description: 'Current session uptime and stats', keywords: ['session','uptime','stats','messages'], selfContained: true, category: 'session', params: {} },
    { name: 'sessions', fn: null, description: 'List saved sessions', keywords: ['sessions','history','saved','list'], selfContained: true, category: 'session', params: {} },
    { name: 'faq', fn: null, description: 'FAQ knowledge base lookup', keywords: [], selfContained: true, category: 'virtual', params: {} },
    { name: 'chat', fn: null, description: 'Conversational chat response', keywords: [], selfContained: true, category: 'virtual', params: {} },
    { name: 'stop', fn: null, description: 'No tool needed — greeting, thanks, or casual conversation', keywords: [], selfContained: true, category: 'virtual', params: {} },
    { name: 'out_of_scope', fn: null, description: 'Query is outside this portfolio assistant\'s verified scope', keywords: [], scopeWords: [], selfContained: true, terminal: true, category: 'virtual', params: {} }
  ];

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

  // session/status tools need store state — handled specially in execute()

  // ─── FAQ ─────────────────────────────────────────────────
  function faq_match(text) {
    // Best-match scoring with word-boundary for short keywords.
    // This is a safety-net fallback — Needle ONNX is the primary classifier.
    if (!FAQ || !FAQ.faq) return null;
    var l = text.toLowerCase();
    var best = null, bestScore = 0, bestSpecific = false;

    for (var f = 0; f < FAQ.faq.length; f++) {
      var kws = FAQ.faq[f].keywords;
      if (!kws) continue;
      var score = 0, specific = false;
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
        // something specific — used below to break ties between two entries
        // that scored equally (e.g. "today" vs "weather" for a weather question).
        if (hit && !STOP_WORDS[kw]) specific = true;
      }
      // On a tie the entry with a specific-keyword hit wins, instead of
      // whichever entry happens to sit earlier in the array.
      if (score > bestScore || (score === bestScore && score > 0 && specific && !bestSpecific)) {
        bestScore = score; best = FAQ.faq[f]; bestSpecific = specific;
      }
    }

    // Lower threshold for short queries (single keyword is enough for "bye"/"thanks")
    var minScore = text.length < 30 ? 1 : 2;
    // A match built entirely out of generic filler words (e.g. a bare "who" or
    // "you" hitting "Who are you?") isn't a real signal — same reasoning as
    // fuzzyMatch's solo-signal guard. Without this, an off-topic question like
    // "Who won the last Super Bowl?" cleared the score threshold on "who" alone
    // and got answered as if it were about Emin. Requiring one specific-keyword
    // hit still allows every existing entry (none rely purely on filler words).
    if (best && bestScore >= minScore && bestSpecific) {
      return { toolName: 'faq', content: '<div class="faq-response">' + best.a + '</div>', data: null };
    }
    return null;
  }

  function faq_getFallback() {
    if (FAQ && FAQ.fallback && FAQ.fallback.responses) {
      return FAQ.fallback.responses[Math.floor(Math.random() * FAQ.fallback.responses.length)];
    }
    return 'I don\'t have an answer for that. Try <b>/help</b> to see commands!';
  }

  function profileFacts() {
    return 'TRUSTED PROFILE FACTS: Emin Gench is based in Vancouver, BC, Canada, and works as a Forward Deployed AI Engineer at Cresta AI. Previously Goodfintech (AI Engineer), Vivoo (Machine Learning Engineer), Novit AI (Full-stack AI Engineer), E-Kalite Software (Python Developer/QA), and indie game development (Founder, emdi_apps). He builds open-source AI and smart-glasses projects, including even_glasses, telegramGPT, G1 Voice AI, g1_flutter, and visionlink. He has 47 repositories and 249+ GitHub stars. Do not infer a different residence or employer.';
  }

  // eslint-disable-next-line id-match -- legacy name (exported as llmConsentMessage); out of scope for this UI change
  function llm_consentMessage() {
    return faq_getFallback() +
      '<br><br><span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--accent-dim);border:1px solid var(--accent);border-radius:6px;color:var(--accent);font-family:monospace;font-size:var(--text-2xs);cursor:pointer;margin-top:6px" onclick="window._enableLLM()">⚡ Enable on-device AI <span style="opacity:.5;font-size:var(--text-2xs)">downloads once · 272 MB (363 MB without WebGPU)</span></span>';
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

  function loadFAQ() {
    return fetch('/data/faq.json')
      .then(function(r) { return r.json(); })
      .then(function(data) { FAQ = data; return data; })
      .catch(function(e) { console.warn('FAQ load failed:', e.message); FAQ = { faq: [], fallback: { responses: ['I don\'t have an answer for that. Try <b>/help</b> to see commands!'] } }; });
  }

  // ─── Persona prose layer ─────────────────────────────────
  // Deterministic hand-written replies so the chat SOUNDS like a person.
  // The 360M model is never the voice for factual answers — these templates
  // are the voice (facts are slots, prose is Emin's own site copy).

  // Company/role-specific prose for a KnowledgeBase-matched 'about' result
  // (tool_about → KnowledgeBase.search/formatResult). Built only from the
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

  // data: the matched tool result's data, if any. 'about' reads its
  // KnowledgeBase match, 'game' its notFound flag.
  function replyFor(toolName, isFollowUp, data) {
    var open = isFollowUp ? 'Happy to dig deeper. ' : '';
    switch (toolName) {
      case 'about':
        // Company prose replaces the generic bio only when the question named
        // that company (namesCompany above). Every other card is followed by
        // the generic bio: timeline, education, tech stack, blog post, or a
        // company KnowledgeBase.search() matched on a word that names none.
        if (data && data.namedInQuestion) {
          return aboutCompanyProse(data, isFollowUp);
        }
        return open + 'Emin Gench is based in Vancouver, BC, and works as a <b>Forward Deployed AI Engineer at Cresta AI</b> — aerospace engineer turned AI builder; he works where systems thinking meets large language models. Before Cresta: Goodfintech (AI engineer), Vivoo (ML engineer), Novit AI (full-stack AI engineer), and indie game dev. BSc Aerospace Engineering, Turkish Air Force Academy; former Air Defense Officer. He also builds open source — 249+ GitHub stars across 47 repos.';
      case 'repos':
        return open + 'He has <b>47 repositories</b> and <b>249+ GitHub stars</b>. The one people find first: <b>even_glasses</b> — a smart-glasses integration platform (78★ and counting), plus <b>telegramGPT</b> (52★) and a voice AI assistant (25★).';
      case 'skills':
        return open + 'Day-to-day it\u2019s <b>Python, TypeScript, and Dart</b> — FastAPI and Next.js on the web side, Docker + AWS to ship it, and LLMs / agents / RAG on the AI side.';
      case 'contact':
        return open + 'You can reach Emin by email, or connect on <b>GitHub</b> or <b>LinkedIn</b> — all the links are below.';
      case 'blog':
        return open + 'Emin writes about AI engineering and building things — the posts are below.';
      case 'g1':
        return open + 'The G1 project is his flagship open-source build: <b>even_glasses</b> — a BLE SDK + Flutter integration for the Even Realities G1 smart glasses, 78★ and counting.';
      case 'game':
        // Never echo the unmatched id here: the card above already shows it, escaped.
        if (data && data.notFound) {
          return open + 'No game goes by that name. The one Emin has published is <b>HACK://OVERFLOW</b>, a LeetCode puzzle game: you solve 24 problems, each with one line of Python judged right in your browser. Pick it below to launch it.';
        }
        return open + 'He made <b>HACK://OVERFLOW</b> — a LeetCode puzzle game: you solve 24 problems, each with one line of Python judged right in your browser. Pick it below and it opens at /hack-overflow.';
      default:
        return null;
    }
  }

  // Soft heads-up shown alongside (never instead of) a real answer: the
  // prompt itself is always clamped, so this never blocks a turn -- it just
  // flags that older turns may be fading from what the model can see.
  function contextExhaustedMessage() {
    return 'This session\u2019s context is getting long, so earlier turns may be fading from what I can recall. Type <b>/new</b> for a completely fresh start if my answers seem to lose track — deterministic tools like /repos and /skills always work regardless.';
  }

  return {
    loadFAQ: loadFAQ,
    _store: null,
    setStore: function(s) { this._store = s; },
    execute: function(name, text) {
      var fn = TOOL_MAP[name];
      if (fn) return (fn === tool_session || fn === tool_status) ? fn(this._store ? this._store.getState() : null) : fn(text);
      if (name === 'blog') return tool_blog(text || '/blog');
      if (name === 'session') return tool_session(this._store ? this._store.getState() : null);
      if (name === 'status') return tool_status(this._store ? this._store.getState() : null);
      return null;
    },
    sessions: tool_sessions,
    askUser: askBox,
    faqMatch: faq_match,
    faqFallback: faq_getFallback,
    profileFacts: profileFacts,
    llmConsentMessage: llm_consentMessage,
    getTopIntents: getTopIntents,
    isCompound: isCompound,
    getCommands: getCommands,
    isSlash: isSlash,
    parseSlash: parseSlash,
    isBlogCommand: isBlogCommand,
    isDestructiveCommand: isDestructiveCommand,
    toolNames: Object.keys(TOOL_MAP),
    detectExtraTools: detectExtraTools,
    fuzzyMatch: fuzzyMatch,
    getTool: getTool,
    replyFor: replyFor,
    games: GAMES,
    contextExhaustedMessage: contextExhaustedMessage,
    validateToolResult: validateToolResult,
    getSelfContainedTools: getSelfContainedTools,
    outOfScopeMessage: outOfScopeMessage,
    reducedModeMessage: reducedModeMessage,
    detectKnowledgeFastPath: detectKnowledgeFastPath,
    TOOL_REGISTRY: TOOL_REGISTRY
  };

})();
