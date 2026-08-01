// tools.js v2 — Pure tools + FAQ + multi-intent routing + clickable outputs
var Tools = (function() {
  "use strict";

  var FAQ = null;

  // ─── HTML helpers ────────────────────────────────────────
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
      return '<span class="ask-btn" onclick="window._answerAsk(' + i + ')">' + o + '</span>';
    }).join('');
    return '<div class="ask-user"><div class="ask-user-q">' + question + '</div><div class="ask-user-opts">' + btns + '</div></div>';
  }

  // ─── Keyword routing ─────────────────────────────────────
  var KEYWORDS = {
    about:   ['emin','gench','bio','cresta','aerospace','fde','vancouver','resume','cv','who','work','job','role','career','background','experience','title','company','position','education','degree','history','past','worked','studied','teams','lead','manage','shipped','launched','delivered','location','living','based','school','university','built','made','opportunities','available','employer','yourself','him','his','study','he'],
    repos:   ['repos','repo','github','project','code','open source','built','star','repository','portfolio','contribution','deploy','deployment','pipeline','infra','devops','ci/cd','docs','documentation','apps','applications','features','PR','pull request','patch','commit'],
    contact: ['email','contact','reach','linkedin','twitter','mail','phone','social','handle','message','connect'],
    skills:  ['skills','skill','tech','stack','know','language','python','typescript','docker','programming','framework','tools','database','cloud','aws','linux','fastapi','next','react','ml','llm','rag','agent'],
    blog:    ['blog','post','article','read','published','writing'],
    g1:      ['g1','smart glasses','smart glass','glasses','even realities','ble','flutter','wearable','hardware','even_glasses']
  };

  var ALL_CMDS = ['/about','/repos','/contact','/skills','/blog','/g1','/time','/device','/screen','/network','/lucky','/ask','/status','/session','/help','/clear','/new','/sessions','/resume','/forget'];

  // ─── Compound query detection ────────────────────────────
  function detectExtraTools(text, primaryTool) {
    var lower = (text || '').toLowerCase();
    var words = lower.match(/[a-z][a-z0-9_-]*/g) || [];
    var extra = [];
    var seen = {};
    seen[primaryTool] = true;
    var toolNames = Object.keys(KEYWORDS);
    for (var i = 0; i < toolNames.length; i++) {
      var tool = toolNames[i];
      if (seen[tool]) continue;
      var kws = KEYWORDS[tool];
      for (var j = 0; j < kws.length; j++) {
        var kw = kws[j];
        // Short keywords (≤3 chars): must match standalone word (avoids "he" in "where")
        if (kw.length <= 3) {
          for (var wi = 0; wi < words.length; wi++) {
            if (words[wi] === kw) { extra.push(tool); seen[tool] = true; break; }
          }
          if (seen[tool]) break;
        } else if (lower.indexOf(kw) !== -1) {
          extra.push(tool);
          seen[tool] = true;
          break;
        }
      }
      if (extra.length >= 2) break; // max 2 extra tools
    }
    return extra;
  }
  // ─── Blog posts index (for /blog <text> matching) ─────────
  var BLOG_POSTS = [
    { slug: 'hello-world', title: 'Building AI agents that ship — lessons from the field' }
  ];

  // ─── Tool: about ─────────────────────────────────────────
  function tool_about() {
    var items = [
      'Forward Deployed AI Engineer',
      '@ Cresta AI · Vancouver, BC',
      '',
      'Previously: Goodfintech, Vivoo, Novit AI',
      'BSc Aerospace Engineering',
      '174+ GitHub stars'
    ];
    return { toolName: 'about', content: box('EMIN GENCH', items), data: null };
  }

  // ─── Tool: repos (clickable links) ───────────────────────
  function tool_repos() {
    var repos = [
      { name: 'even_glasses', stars: 79, desc: 'G1 BLE SDK (Python)' },
      { name: 'telegramGPT', stars: 52, desc: 'AI bot building guide' },
      { name: 'G1 Voice AI', stars: 25, desc: 'Voice assistant' },
      { name: 'g1_flutter', stars: 18, desc: 'Flutter BLE bridge' },
      { name: 'visionlink', stars: 11, desc: 'Multi-device OS' },
      { name: 'llm_adaptive_router', stars: 6, desc: 'LLM routing' }
    ];
    var lines = repos.map(function(r) {
      var url = 'https://github.com/emingenc/' + r.name;
      return '★' + r.stars + '  ' + link(url, r.name, 'repo-link') + ' — ' + r.desc;
    });
    lines.push('');
    lines.push(link('https://github.com/emingenc', 'github.com/emingenc — 46 repos', 'repo-link'));
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
    html += '<div style="color:var(--muted);font-size:11px;margin-top:6px">' + footer + '</div>';
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
    // /blog <slug or text>
    var query = (text || '').replace(/^\/blog\s*/i, '').trim();

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
      // No match — show blog listing
      return {
        toolName: 'blog',
        content: box('BLOG', [
          'No post matching "' + query + '"',
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
      '★79 even_glasses  — BLE driver (Python)',
      '★25 G1 Voice AI   — Voice assistant',
      '★18 g1_flutter    — Mobile bridge (Dart)',
      '★11 visionlink    — Multi-device OS (C)',
      '★3  smart_glass_mcp — AI agent connector',
      '★7  even_glasses_redis_control',
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
    var tzOffset = -now.getTimezoneOffset() / 60;
    var tzStr = 'UTC' + (tzOffset >= 0 ? '+' : '') + tzOffset;

    return {
      toolName: 'time',
      content: box('LOCAL TIME', [
        weekdays[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear(),
        timeStr + ' · ' + tzStr,
        tz
      ]),
      data: { iso: now.toISOString(), tz: tz, offset: tzOffset }
    };
  }

  // ─── Tool: session ───────────────────────────────────────
  function tool_session(storeState) {
    var now = Date.now();
    var sessionStart = (storeState && storeState.session && storeState.session.start) || now;
    var elapsed = Math.floor((now - sessionStart) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var duration = mins > 0 ? mins + 'm ' + secs + 's' : secs + 's';
    var msgCount = (storeState && storeState.session && storeState.session.messageCount) || 0;
    var sessionId = (storeState && storeState.session && storeState.session.id) || 'unknown';
    var modelStatus = (storeState && storeState.models && storeState.models.llmReady) ? 'ready' : 'loading';

    return {
      toolName: 'session',
      content: box('SESSION', [
        'ID:      ' + sessionId,
        'Uptime:  ' + duration,
        'Messages:' + msgCount,
        'LLM:     ' + modelStatus,
        'Storage: ' + (typeof localStorage !== 'undefined' ? (JSON.stringify(localStorage).length / 1024).toFixed(1) + ' KB' : 'N/A')
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
        'Resolution: ' + scr.width + '×' + scr.height + ' @ ' + dpr + 'x (' + (scr.width * dpr) + '×' + (scr.height * dpr) + ' logical)',
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
    lines.push('Online:    ' + (online ? 'yes ✓' : 'no ✗'));
    return {
      toolName: 'network',
      content: box('YOUR NETWORK', lines),
      data: conn ? { type: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt } : null
    };
  }

  // ─── Tool: lucky — fun random surprises ───────────────────
  function tool_lucky() {
    var facts = [
      'This entire website runs AI models locally in your browser. No servers!',
      'Emin taught himself to code while serving as an Air Defense Officer.',
      'The G1 smart glasses ecosystem spans 6 repos across 5 programming languages.',
      '174+ GitHub stars earned through open source, not marketing.',
      'Emin has a BSc in Aerospace Engineering — literally rocket science.',
      'This FAQ alone has 148 entries to answer almost any question instantly.',
      'The AI model (SmolLM2-1.7B) is ~1GB and runs entirely in your browser.',
      'Type /matrix for a surprise. Just kidding — or am I?',
      "Emin's first tech role was Data Analyst. Now he's an FDE at Cresta AI.",
      'This site has zero tracking on the agent page. Your chats are 100% private.'
    ];
    var pick = facts[Math.floor(Math.random() * facts.length)];
    return {
      toolName: 'lucky',
      content: box('DID YOU KNOW?', ['★ ' + pick]) + '<div style="color:var(--muted);font-size:10px;margin-top:6px">Try /lucky again for another random fact</div>',
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
    var llm = (storeState && storeState.models && storeState.models.llmReady) ? 'ready' : 'loading';
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
        'LLM:      ' + llm + ' · SmolLM2-1.7B',
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
        '/forget   — clear all data',
        '/clear    — reset transcript'
      ]) + '<div style="color:var(--accent);font-size:11px;margin-top:6px;font-family:monospace">Tip: try /status or /lucky ⚡</div>',
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
      lines.push('  ' + preview);
    }
    lines.push('');
    lines.push(cmdLink('/forget', '/forget — clear all saved sessions'));
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

  var TOOL_MAP = {
    about: tool_about, repos: tool_repos, contact: tool_contact,
    skills: tool_skills, blog: tool_blog, g1: tool_g1, help: tool_help,
    time: tool_time, device: tool_device, screen: tool_screen,
    network: tool_network, lucky: tool_lucky, ask_user: tool_ask_user, out_of_scope: null, status: null, session: null,
    sessions: null, resume: null, forget: null
  };

  var TOOL_REGISTRY = [
    { name: 'about', fn: tool_about, description: 'Emin Gench biography, career, current role at Cresta AI', keywords: ['emin','gench','bio','cresta','aerospace','fde','vancouver','resume','cv','who','work','job','role','career','background','experience','title','company','position','education','degree','history','past','worked','studied','teams','lead','manage','shipped','launched','delivered','location','living','based','school','university','built','made','opportunities','available','employer','yourself','him','his','study'], scopeWords: ['emin','gench','cresta','aerospace','fde','vancouver','career','role','job','work','title','position','company','employer','background','experience','education','degree','school','university','history','past','worked','studied','lead','manage','team','shipped','launched','delivered','built','made','location','based','living','available','opportunities','engineer','resume','cv','bio','his','him','he','yourself','study'], selfContained: true, category: 'discover', params: {} },
    { name: 'repos', fn: tool_repos, description: 'GitHub open source repositories by emingenc', keywords: ['repos','repo','github','project','code','open source','built','star','repository','portfolio','contribution','deploy','deployment','pipeline','infra','devops','ci/cd','docs','documentation','apps','applications','features','PR','pull request','patch','commit'], selfContained: true, category: 'discover', params: {} },
    { name: 'contact', fn: tool_contact, description: 'Contact Emin Gench: email, GitHub, LinkedIn, Twitter', keywords: ['email','contact','reach','linkedin','twitter','mail','phone','social','handle','message','connect'], selfContained: true, category: 'discover', params: {} },
    { name: 'skills', fn: tool_skills, description: 'Technical skills: Python, TypeScript, Dart, FastAPI, Next.js, Docker, AWS', keywords: ['skills','skill','tech','stack','know','language','python','typescript','docker','programming','framework','tools','database','cloud','aws','linux','fastapi','next','react','ml','llm','rag','agent'], selfContained: true, category: 'discover', params: {} },
    { name: 'blog', fn: tool_blog, description: 'Blog posts about building AI agents', keywords: ['blog','post','article','write','read','published'], selfContained: true, category: 'discover', params: {} },
    { name: 'g1', fn: tool_g1, description: 'G1 smart glasses by Even Realities: BLE SDK, voice assistant, mobile bridge', keywords: ['g1','smart glass','glasses','even realities','ble','flutter','wearable','hardware','even_glasses'], selfContained: true, category: 'discover', params: {} },
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
    var best = null, bestScore = 0;

    for (var f = 0; f < FAQ.faq.length; f++) {
      var kws = FAQ.faq[f].keywords;
      if (!kws) continue;
      var score = 0;
      for (var k = 0; k < kws.length; k++) {
        var kw = kws[k];
        if (kw.length <= 3) {
          // Word-boundary match for short keywords (avoids "old" matching "told")
          var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          var re = new RegExp('\\b' + escaped + '\\b');
          if (re.test(l)) score += 3; // strong signal for exact short-word match
        } else if (l.indexOf(kw) !== -1) {
          score += kw.split(' ').length; // multi-word bonus
        }
      }
      if (score > bestScore) { bestScore = score; best = FAQ.faq[f]; }
    }

    if (best && bestScore >= 2) {
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
    return 'TRUSTED PROFILE FACTS: Emin Gench is a Forward Deployed AI Engineer at Cresta AI in Vancouver, BC, Canada. Previously Goodfintech, Vivoo, and Novit AI. He builds open-source AI and smart-glasses projects, including even_glasses, telegramGPT, G1 Voice AI, g1_flutter, and visionlink. He has 46 repositories and 174+ GitHub stars. Do not infer a different residence or employer.';
  }

  function llm_consentMessage() {
    return faq_getFallback() +
      '<br><br><span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;background:var(--accent-dim);border:1px solid var(--accent);border-radius:6px;color:var(--accent);font-family:monospace;font-size:11px;cursor:pointer;margin-top:6px" onclick="window._enableLLM()">⚡ Enable on-device AI <span style="opacity:.5;font-size:10px">downloads once · ~80MB</span></span>';
  }

  // ─── v2: Multi-intent detection ──────────────────────────
  function getTopIntents(text) {
    var l = text.toLowerCase();
    var scores = {};
    for (var t in KEYWORDS) { scores[t] = 0; for (var i = 0; i < KEYWORDS[t].length; i++) { if (l.indexOf(KEYWORDS[t][i]) !== -1) scores[t]++; } }
    var results = [];
    for (var name in scores) { if (scores[name] > 0) results.push({ tool: name, score: scores[name] }); }
    results.sort(function(a, b) { return b.score - a.score; });
    return results;
  }

  function isCompound(text) { return /\band\b|\balso\b|\bplus\b|\bas well\b/i.test(text); }

  function keywordRoute(text) {
    // Best-match for FAQ, then tools
    if (FAQ && FAQ.faq) {
      var l = text.toLowerCase();
      var best = null, bestScore = 0;
      for (var f = 0; f < FAQ.faq.length; f++) {
        var kws = FAQ.faq[f].keywords; if (!kws) continue;
        var score = 0;
        for (var k = 0; k < kws.length; k++) {
          var kw = kws[k];
          if (kw.length <= 3) {
            var escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (new RegExp('\\b' + escaped + '\\b').test(l)) score += 3;
          } else if (l.indexOf(kw) !== -1) {
            score += kw.split(' ').length;
          }
        }
        if (score > bestScore) { bestScore = score; best = { type: 'faq', index: f }; }
      }
      if (best) return best;
    }
    var lt = text.toLowerCase();
    for (var t in KEYWORDS) { for (var i = 0; i < KEYWORDS[t].length; i++) { if (lt.indexOf(KEYWORDS[t][i]) !== -1) return { type: 'tool', name: t }; } }
    return null;
  }

  function getCommands() { return ALL_CMDS; }
  function isSlash(text) { return text.startsWith('/'); }
  function parseSlash(text) { return text.slice(1).toLowerCase().split(' ')[0]; }
  function isBlogCommand(text) { return text.toLowerCase().startsWith('/blog'); }

  // ─── Fuzzy tool matching ──────────────────────────────────
  // Scores user query against tool descriptions + keywords.
  // Returns {tool, score} for best match above threshold, or null.
  // This is the SINGLE matching function — no more per-tool keyword patching.
  var STOP_WORDS = {what:1,where:1,when:1,why:1,how:1,do:1,does:1,did:1,is:1,are:1,was:1,were:1,can:1,could:1,will:1,would:1,shall:1,should:1,tell:1,show:1,give:1,get:1,has:1,have:1,had:1,the:1,a:1,an:1,he:1,she:1,it:1,they:1,me:1,him:1,her:1,them:1,his:1,for:1,to:1,of:1,in:1,on:1,at:1,by:1,with:1,from:1,about:1,any:1,some:1,just:1,please:1,open:1,last:1,latest:1,recent:1,newest:1};

  function fuzzyMatch(text) {
    var rawWords = (text || '').toLowerCase().match(/[a-z][a-z0-9_-]*/g) || [];
    var qWords = [];
    for (var rw = 0; rw < rawWords.length; rw++) {
      var w = rawWords[rw];
      if (!STOP_WORDS[w] && w.length > 2) qWords.push(w);
    }
    if (!qWords.length) return null;
    var qText = qWords.join(' ');

    var best = null, bestScore = 0;
    for (var i = 0; i < TOOL_REGISTRY.length; i++) {
      var rt = TOOL_REGISTRY[i];
      if (rt.name === 'chat' || rt.name === 'stop' || rt.name === 'faq' || rt.name === 'out_of_scope') continue;

      var corpus = (rt.name + ' ' + rt.description + ' ' + (rt.keywords || []).join(' ')).toLowerCase();
      var cWords = corpus.match(/[a-z][a-z0-9_-]*/g) || [];

      var score = 0;
      for (var wi = 0; wi < qWords.length; wi++) {
        var qw = qWords[wi];
        for (var ci = 0; ci < cWords.length; ci++) {
          // Exact match or substring (catches "build"→"built", "work"→"worked")
          if (cWords[ci] === qw || cWords[ci].indexOf(qw) === 0 || qw.indexOf(cWords[ci]) === 0) {
            score += 1; break;
          }
        }
      }
      // Phrase bonus: multi-word keyword matches
      var kws = rt.keywords || [];
      for (var ki = 0; ki < kws.length; ki++) {
        var kw = String(kws[ki]).toLowerCase();
        if (kw.indexOf(' ') !== -1 && text.toLowerCase().indexOf(kw) !== -1) score += 3;
      }
      // Tool name match
      if (qText.indexOf(rt.name) !== -1 || text.toLowerCase().indexOf(rt.name) !== -1) score += 2;

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
    keywordRoute: keywordRoute,
    getTopIntents: getTopIntents,
    isCompound: isCompound,
    getCommands: getCommands,
    isSlash: isSlash,
    parseSlash: parseSlash,
    isBlogCommand: isBlogCommand,
    toolNames: Object.keys(TOOL_MAP),
    detectExtraTools: detectExtraTools,
    fuzzyMatch: fuzzyMatch,
    getTool: getTool,
    validateToolResult: validateToolResult,
    getSelfContainedTools: getSelfContainedTools,
    outOfScopeMessage: outOfScopeMessage,
    TOOL_REGISTRY: TOOL_REGISTRY
  };

})();
