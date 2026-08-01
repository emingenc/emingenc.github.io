// knowledge.js — Modular knowledge base for portfolio agent
// Loads structured data files and provides clean search interface.
// No more keyword array patching or monolithic FAQ searching.
var KnowledgeBase = (function() {
  "use strict";

  var career = null;
  var aliases = {};
  var education = null;
  var loaded = false;

  // ─── Load all knowledge files ──────────────────────────
  function load() {
    return Promise.all([
      fetch('/data/knowledge/career.json').then(function(r) { return r.json(); }),
      fetch('/data/knowledge/aliases.json').then(function(r) { return r.json(); })
    ]).then(function(results) {
      career = results[0];
      aliases = results[1];
      loaded = true;
    }).catch(function(e) {
      console.warn('Knowledge base load failed:', e.message);
      loaded = true; // degrade gracefully
    });
  }

  // ─── Resolve company name via aliases ──────────────────
  function resolveCompany(query) {
    var q = (query || '').toLowerCase().trim();
    // Direct alias lookup
    if (aliases[q]) return aliases[q];
    // Partial match against alias keys
    for (var key in aliases) {
      if (q.indexOf(key) !== -1 || key.indexOf(q) !== -1) return aliases[key];
    }
    return null;
  }

  // ─── Search: find relevant knowledge ───────────────────
  function search(query) {
    if (!loaded || !career) return null;
    var q = (query || '').toLowerCase();
    var words = q.match(/[a-z]{3,}/g) || [];

    // 1. Check if query is about a specific company
    var companyFile = resolveCompany(q);
    if (!companyFile) {
      // Try matching company names in query
      if (q.indexOf('cresta') !== -1) companyFile = 'cresta';
      else if (q.indexOf('goodfintech') !== -1) companyFile = 'goodfintech';
      else if (q.indexOf('vivoo') !== -1) companyFile = 'vivoo';
      else if (q.indexOf('novit') !== -1 || q.indexOf('archangel') !== -1) companyFile = 'novit-ai';
    }

    // 2. Build response from career data
    var result = { type: 'career', found: false };

    if (companyFile) {
      // Find in history array
      var hist = career.history || [];
      for (var i = 0; i < hist.length; i++) {
        if (companyFile === 'cresta') {
          result = {
            type: 'company',
            found: true,
            company: career.current.company,
            role: career.current.title,
            period: career.current.since + ' → present',
            description: career.current.summary,
            url: career.current.url,
            location: career.current.location
          };
          break;
        }
        var h = hist[i];
        var hName = (h.company || '').toLowerCase().replace(/\s+/g, '-');
        if (hName === companyFile || hName.indexOf(companyFile) !== -1 || companyFile.indexOf(hName) !== -1) {
          result = {
            type: 'company',
            found: true,
            company: h.company,
            role: h.title,
            period: h.years,
            description: h.summary,
            url: h.url
          };
          break;
        }
      }
      if (!result.found && career.current && (companyFile === 'cresta')) {
        result = {
          type: 'company',
          found: true,
          company: career.current.company,
          role: career.current.title,
          period: career.current.since + ' → present',
          description: career.current.summary
        };
      }
    }

    // 3. If not a company match, check for career overview
    if (!result.found) {
      var careerWords = ['career','history','timeline','path','journey','experience','background','resume','cv'];
      for (var ci = 0; ci < careerWords.length; ci++) {
        if (q.indexOf(careerWords[ci]) !== -1) {
          result = { type: 'timeline', found: true, career: career };
          break;
        }
      }
    }

    // 4. Education
    if (!result.found && (q.indexOf('education') !== -1 || q.indexOf('school') !== -1 || q.indexOf('degree') !== -1 || q.indexOf('study') !== -1 || q.indexOf('aerospace') !== -1)) {
      result = { type: 'education', found: true, text: career.beforeTech };
    }

    // 5. Current role
    if (!result.found && (q.indexOf('current') !== -1 || q.indexOf('now') !== -1 || q.indexOf('doing') !== -1)) {
      result = {
        type: 'company',
        found: true,
        company: career.current.company,
        role: career.current.title,
        period: career.current.since + ' → present',
        description: career.current.summary
      };
    }

    return result;
  }

  // ─── Format result as natural text ─────────────────────
  function formatResult(result) {
    if (!result || !result.found) return null;
    if (result.type === 'company') {
      var lines = [
        result.company ? result.company.toUpperCase() : '',
        '────────────────────────────────────────────',
        result.role,
        result.period,
        '',
        result.description || ''
      ];
      if (result.location) lines.splice(1, 0, '@ ' + result.location);
      if (result.url) lines.push('', result.url);
      return { toolName: 'about', content: box(lines), data: result };
    }
    if (result.type === 'timeline') {
      var c = result.career;
      var tlines = [
        'CAREER TIMELINE',
        '────────────────────────────',
        c.current.since + ' → ' + c.current.title + ' @ ' + c.current.company
      ];
      var hist = c.history || [];
      for (var i = 0; i < hist.length; i++) {
        tlines.push(hist[i].years + '  ' + hist[i].title + ' @ ' + hist[i].company);
      }
      tlines.push('', c.beforeTech);
      return { toolName: 'about', content: box(tlines), data: result };
    }
    if (result.type === 'education') {
      return { toolName: 'about', content: box('EDUCATION', [result.text]), data: result };
    }
    return null;
  }

  // ASCII box helper
  function box(title, lines) {
    var w = title.length + 4;
    for (var i = 0; i < lines.length; i++) w = Math.max(w, (lines[i] || '').length + 4);
    var t = '┌' + '─'.repeat(w) + '┐\n';
    t += '│ ' + title + ' '.repeat(w - title.length - 1) + '│\n';
    t += '│' + '─'.repeat(w) + '│\n';
    for (var i = 0; i < lines.length; i++) {
      t += '│ ' + (lines[i] || '') + ' '.repeat(Math.max(0, w - (lines[i] || '').length - 1)) + '│\n';
    }
    t += '└' + '─'.repeat(w) + '┘';
    return '<pre class="ascii">' + t + '</pre>';
  }

  return {
    load: load,
    search: search,
    formatResult: formatResult,
    resolveCompany: resolveCompany
  };
})();
