// knowledge.js — Modular knowledge base powered by structured career data
// Loads from /data/knowledge/ and provides clean search + formatting.
// Add a JSON file to add knowledge. No code changes needed.
var KnowledgeBase = (function() {
  "use strict";

  var career = null;
  var blogIndex = null;
  var aliases = {};
  var loaded = false;

  function load() {
    return Promise.all([
      fetch('/data/knowledge/career.json').then(function(r) { return r.json(); }),
      fetch('/data/knowledge/blog-index.json').then(function(r) { return r.json(); }).catch(function() { return null; })
    ]).then(function(results) {
      career = results[0];
      blogIndex = results[1];
      if (career) {
        if (career.current && career.current.company) {
          aliases[career.current.company.toLowerCase()] = 'current';
        }
        var hist = career.history || [];
        for (var i = 0; i < hist.length; i++) {
          var name = (hist[i].company || '').toLowerCase().split('(')[0].trim();
          aliases[name] = hist[i].company;
          if (hist[i].aka) aliases[hist[i].aka.toLowerCase()] = hist[i].company;
        }
      }
      loaded = true;
    }).catch(function(e) {
      console.warn('Knowledge base load failed:', e.message);
      loaded = true;
    });
  }

  function search(query) {
    if (!loaded || !career) return null;
    var q = (query || '').toLowerCase();
    var words = q.match(/[a-z]{3,}/g) || [];

    // Find which company the query is about
    var target = null;
    var isCurrent = false;

    // Check current company
    if (career.current) {
      var curName = career.current.company.toLowerCase();
      if (q.indexOf(curName) !== -1) { target = career.current; isCurrent = true; }
    }

    // Check history
    if (!target) {
      var hist = career.history || [];
      for (var i = 0; i < hist.length; i++) {
        var h = hist[i];
        var hName = (h.company || '').toLowerCase().split('(')[0].trim();
        var aka = (h.aka || '').toLowerCase();
        if (q.indexOf(hName) !== -1 || (aka && q.indexOf(aka) !== -1)) {
          target = h; break;
        }
        // Check individual words
        var nameWords = hName.split(/\s+/);
        for (var wi = 0; wi < nameWords.length; wi++) {
          if (nameWords[wi].length > 3 && q.indexOf(nameWords[wi]) !== -1) {
            target = h; break;
          }
        }
        if (target) break;
      }
    }

    // Check for career overview / timeline query
    var overviewWords = ['career','history','timeline','path','journey','experience','background','resume','cv','worked','jobs','companies'];
    var isOverview = false;
    for (var oi = 0; oi < overviewWords.length; oi++) {
      if (q.indexOf(overviewWords[oi]) !== -1) { isOverview = true; break; }
    }

    // Check for education
    var eduWords = ['education','school','degree','study','studied','aerospace','academy','university','military'];
    var isEducation = false;
    for (var ei = 0; ei < eduWords.length; ei++) {
      if (q.indexOf(eduWords[ei]) !== -1) { isEducation = true; break; }
    }

    // Check for tech stack
    var techWords = ['tech','stack','technologies','skills','languages','python','typescript','docker','aws','langgraph','langchain'];
    var isTech = false;
    for (var ti = 0; ti < techWords.length; ti++) {
      if (q.indexOf(techWords[ti]) !== -1) { isTech = true; break; }
    }

    // Build result
    if (target) {
      return {
        type: 'company',
        found: true,
        company: target.company || '',
        role: target.title || '',
        period: target.years || '',
        location: target.location || '',
        description: target.description || '',
        highlights: target.highlights || [],
        url: target.url || '',
        aka: target.aka || '',
        isCurrent: isCurrent
      };
    }

    if (isOverview) {
      return { type: 'timeline', found: true, career: career };
    }

    if (isEducation) {
      return {
        type: 'education',
        found: true,
        education: career.education,
        military: career.military
      };
    }

    if (isTech) {
      return { type: 'technologies', found: true, technologies: career.technologies };
    }

    // Check blog posts
    if (blogIndex && blogIndex.posts) {
      var blogWords = ['blog','post','article','write','read','published','writing','agent','shipping','lessons','guardrails'];
      var isBlogQuery = false;
      for (var bi = 0; bi < blogWords.length; bi++) {
        if (q.indexOf(blogWords[bi]) !== -1) { isBlogQuery = true; break; }
      }
      if (isBlogQuery) {
        var posts = blogIndex.posts;
        var bestPost = null; var bestPostScore = 0;
        for (var pi = 0; pi < posts.length; pi++) {
          var score = 0;
          var postText = (posts[pi].title + ' ' + posts[pi].description + ' ' + (posts[pi].topics || []).join(' ')).toLowerCase();
          for (var wi = 0; wi < words.length; wi++) {
            if (postText.indexOf(words[wi]) !== -1) score++;
          }
          if (score > bestPostScore) { bestPostScore = score; bestPost = posts[pi]; }
        }
        if (bestPost && bestPostScore >= 1) {
          return { type: 'blog', found: true, post: bestPost };
        }
      }
    }

    // Current role as default
    if (q.indexOf('current') !== -1 || q.indexOf('now') !== -1 || q.indexOf('doing') !== -1) {
      return {
        type: 'company',
        found: true,
        company: career.current.company,
        role: career.current.title,
        period: career.current.since,
        description: career.current.description || '',
        highlights: career.current.highlights || [],
        isCurrent: true
      };
    }

    return null;
  }

  function formatResult(result) {
    if (!result || !result.found) return null;

    if (result.type === 'company') {
      var title = (result.company || '').toUpperCase();
      if (result.aka) title += ' (AKA ' + result.aka.toUpperCase() + ')';
      var lines = [title];
      lines.push('─'.repeat(Math.min(44, title.length + 4)));
      lines.push(result.role || '');
      lines.push(result.period || '');
      if (result.location) lines.push('@ ' + result.location);
      if (result.isCurrent) lines.push('📍 CURRENT ROLE');
      if (result.description) { lines.push(''); lines.push(result.description); }
      lines.push('');
      var highlights = result.highlights || [];
      for (var hi = 0; hi < highlights.length; hi++) {
        lines.push('• ' + highlights[hi]);
      }
      if (result.url) lines.push('', result.url);
      return { toolName: 'about', content: box(title.split('(')[0].trim(), lines), data: result };
    }

    if (result.type === 'timeline') {
      var c = result.career;
      var tlines = ['CAREER TIMELINE'];
      tlines.push('─'.repeat(44));
      tlines.push('');
      tlines.push('📍 CURRENT: ' + c.current.title + ' @ ' + c.current.company + ' (' + c.current.since + ')');
      tlines.push('');
      var hist = c.history || [];
      for (var i = 0; i < hist.length; i++) {
        var h = hist[i];
        tlines.push(h.years + '  ' + h.title + ' @ ' + h.company);
      }
      tlines.push('');
      if (c.military) tlines.push('🎖  ' + c.military);
      return { toolName: 'about', content: box('CAREER', tlines), data: result };
    }

    if (result.type === 'education') {
      var ed = result.education;
      var elines = [
        ed.degree || '',
        ed.institution || '',
        ed.location || '',
        '',
        result.military || ''
      ];
      return { toolName: 'about', content: box('EDUCATION', elines), data: result };
    }

    if (result.type === 'blog') {
      var p = result.post;
      var blines = [
        p.title || '',
        '',
        p.description || '',
        'Date: ' + (p.date || ''),
        'Tags: ' + (p.tags || []).join(', '),
        '',
        'Key takeaways:'
      ];
      var kt = p.keyTakeaways || [];
      for (var ki = 0; ki < kt.length; ki++) {
        blines.push('• ' + kt[ki]);
      }
      blines.push('', 'Read: /blog/' + (p.slug || ''));
      return { toolName: 'about', content: box('BLOG POST', blines), data: result };
    }

    if (result.type === 'technologies') {
      var tech = result.technologies;
      var techlines = [];
      for (var cat in tech) {
        techlines.push(cat + ': ' + tech[cat]);
      }
      return { toolName: 'about', content: box('TECH STACK', techlines), data: result };
    }

    return null;
  }

  function box(title, lines) {
    var w = title.length + 4;
    for (var i = 0; i < lines.length; i++) w = Math.max(w, (lines[i] || '').length + 4);
    w = Math.min(w, 80);
    var t = '┌' + '─'.repeat(w) + '┐\n';
    t += '│ ' + title + ' '.repeat(Math.max(0, w - title.length - 1)) + '│\n';
    t += '│' + '─'.repeat(w) + '│\n';
    for (var i = 0; i < lines.length; i++) {
      var line = (lines[i] || '');
      if (line.length > w - 2) line = line.slice(0, w - 5) + '...';
      t += '│ ' + line + ' '.repeat(Math.max(0, w - line.length - 1)) + '│\n';
    }
    t += '└' + '─'.repeat(w) + '┘';
    return '<pre class="ascii">' + t + '</pre>';
  }

  return {
    load: load,
    search: search,
    formatResult: formatResult
  };
})();
