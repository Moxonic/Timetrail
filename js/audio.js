/* Spoken guide, built on the browser's own speech synthesis.
 *
 * Two jobs:
 *   1. Read a place aloud on demand — curated blurb, then the Wikipedia lead.
 *   2. Run a hands-free tour: while you walk, narrate whatever you come near,
 *      once each, without you touching the phone.
 *
 * Long text is split into sentences and spoken as separate short utterances.
 * That is not a style choice: Chrome silently stops a single utterance after
 * roughly fifteen seconds, and short ones also let us report progress and
 * stop promptly when the visitor walks on.
 */
window.TT = window.TT || {};

TT.audio = (function () {
  var synth = window.speechSynthesis || null;
  var voices = [];
  var queue = [];          // items waiting to be narrated
  var current = null;      // { id, title, text, lang, chunks, index }
  var playing = false;
  var paused = false;
  var spoken = {};         // id -> true, so the tour never repeats itself
  var listeners = [];
  var keepAlive = null;
  var rate = 1;
  var prefs = {};          // lang -> voiceURI the visitor picked; absent = automatic
  var ranked = {};         // lang -> voices, best first (cleared when the set changes)

  function supported() { return !!synth && typeof SpeechSynthesisUtterance === 'function'; }

  function loadVoices() {
    if (!supported()) return;
    voices = synth.getVoices() || [];
    ranked = {};
  }
  if (supported()) {
    loadVoices();
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = function () { loadVoices(); emit(); };
    }
  }

  /* How well a voice fits the language. Null means it is not a candidate.
   * British English is preferred for an Oslo guide, but only mildly: a natural
   * American voice should still beat a robotic British one. */
  function localeScore(v, lang) {
    var tag = (v.lang || '').toLowerCase().replace('_', '-');
    var want = lang === 'no'
      ? [['nb-no', 100], ['no', 95], ['nn-no', 70]]
      : [['en-gb', 100], ['en-us', 85], ['en', 70]];
    for (var i = 0; i < want.length; i++) {
      if (tag.indexOf(want[i][0]) === 0) return want[i][1];
    }
    return null;
  }

  /* The API exposes no quality field, so infer one. These signals are indirect
   * but they hold across browsers: the natural-sounding voices are the
   * cloud-served ones, and every vendor advertises them in the name. Edge's
   * "Online (Natural)" set and Apple's Enhanced/Premium downloads are both
   * free — they are simply never first in getVoices(), which is why picking
   * the first locale match used to leave us with the 1990s robot. */
  var GOOD = [
    [/natural|neural|wavenet|journey|multilingual/, 60],
    [/premium|enhanced/, 45],
    [/siri/, 45],
    [/online/, 35],
    [/^google/, 30]
  ];

  /* And the ones to push down, which matters just as much. Every platform still
   * ships something old: Windows keeps the SAPI "Desktop" voices, Linux and
   * older Android fall back to eSpeak, and macOS carries a shelf of novelty
   * voices from the 1980s. All of them answer to a locale as readily as a good
   * voice does, so without this the automatic pick is a coin toss on exactly
   * the browsers with the least to offer. */
  var BAD = [
    [/\bespeak|\bpico\b|festival|flite/, 80],
    [/\bdesktop\b/, 55],
    [/\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|junior|kathy|princess|ralph|fred|agnes|victoria|bruce)\b/, 70]
  ];


  function scoreVoice(v, lang) {
    var base = localeScore(v, lang);
    if (base == null) return null;
    var name = ((v.name || '') + ' ' + (v.voiceURI || '')).toLowerCase();
    var good = false;
    GOOD.forEach(function (h) {
      if (h[0].test(name)) { base += h[1]; good = true; }
    });
    // Where an engine offers both, the remote voice is the neural one.
    if (v.localService === false) { base += 25; good = true; }
    BAD.forEach(function (h) { if (h[0].test(name)) base -= h[1]; });

    // Apple's low-footprint voices — but the good Siri ones are also shipped
    // under a "...compact" URI, so this only demotes a voice with nothing
    // going for it otherwise.
    if (!good && /compact/.test(name)) base -= 45;
    return base;
  }

  /* Every usable voice for a language, best-sounding first. */
  function listVoices(lang) {
    // Voices arrive late, and Safari has never been dependable about firing
    // onvoiceschanged, so notice the list growing rather than trusting the event.
    var live = supported() ? (synth.getVoices() || []) : [];
    if (live.length !== voices.length || (live[0] && live[0] !== voices[0])) loadVoices();
    if (ranked[lang]) return ranked[lang];
    var scored = [];
    voices.forEach(function (v) {
      var s = scoreVoice(v, lang);
      if (s != null) scored.push({ v: v, s: s });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    ranked[lang] = scored.map(function (x) { return x.v; });
    return ranked[lang];
  }

  /* What the visitor chose, if it is still installed; otherwise our best guess. */
  function voiceFor(lang) {
    var list = listVoices(lang);
    var want = prefs[lang];
    if (want) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].voiceURI === want) return list[i];
      }
    }
    return list[0] || null;
  }

  /* prefs is the whole map, { en: voiceURI, no: voiceURI }; empty = automatic. */
  function setVoice(next) {
    prefs = next || {};
    restartCurrent();
    emit();
  }

  function hasVoiceFor(lang) { return !!voiceFor(lang); }

  /* Split into utterance-sized pieces on sentence boundaries. */
  function chunk(text) {
    var clean = String(text || '')
      .replace(/\s+/g, ' ')
      .replace(/\(([^)]{0,40})\)/g, '$1')   // parentheses read badly aloud
      .trim();
    if (!clean) return [];
    var sentences = clean.match(/[^.!?]+[.!?]*\s*/g) || [clean];
    var out = [], buf = '';
    sentences.forEach(function (s) {
      s = s.trim();
      if (!s) return;
      if ((buf + ' ' + s).length > 190 && buf) { out.push(buf.trim()); buf = s; }
      else buf = buf ? buf + ' ' + s : s;
    });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function emit() {
    var s = status();
    listeners.forEach(function (fn) { fn(s); });
  }

  function status() {
    var at = current ? chapterAt(current, current.index) : -1;
    return {
      supported: supported(),
      playing: playing,
      paused: paused,
      title: current ? current.title : null,
      id: current ? current.id : null,
      progress: current ? (current.index + 1) : 0,
      total: current ? current.chunks.length : 0,
      queued: queue.length,
      rate: rate,
      voices: voices.length,
      // Copies: the player rebuilds its chapter list from these on every tick.
      chapters: current ? current.chapters.map(function (c) {
        return { label: c.label, level: c.level, count: c.count };
      }) : [],
      chapter: at,
      chapterTitle: at >= 0 ? current.chapters[at].label : null,
      moreChapters: nextChapterIndex() >= 0
    };
  }

  /* Chrome pauses synthesis when a background tab idles; nudging it keeps a
   * pocketed phone talking. Harmless where it is not needed. */
  function startKeepAlive() {
    stopKeepAlive();
    keepAlive = setInterval(function () {
      if (playing && !paused && synth.speaking) { synth.pause(); synth.resume(); }
    }, 9000);
  }
  function stopKeepAlive() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }

  function speakChunk() {
    if (!current || current.index >= current.chunks.length) return finishItem();

    var u = new SpeechSynthesisUtterance(current.chunks[current.index]);
    var v = voiceFor(current.lang);
    if (v) u.voice = v;
    u.lang = v ? v.lang : (current.lang === 'no' ? 'nb-NO' : 'en-GB');
    u.rate = rate;
    u.pitch = 1;

    u.onend = function () {
      if (!playing || !current) return;
      current.index++;
      emit();
      speakChunk();
    };
    u.onerror = function (e) {
      // 'interrupted'/'canceled' are what a deliberate stop looks like.
      if (!playing || !current || e.error === 'interrupted' || e.error === 'canceled') return;
      current.index++;
      speakChunk();
    };

    synth.speak(u);
    emit();
  }

  function finishItem() {
    if (current) spoken[current.id] = true;
    current = null;
    if (queue.length) {
      current = queue.shift();
      current.index = 0;
      emit();
      speakChunk();
    } else {
      playing = false;
      stopKeepAlive();
      emit();
    }
  }

  /* An item is either one lump of text, or a list of parts — the chapters of a
   * Wikipedia article. Parts are chunked separately so we can record where each
   * one starts, but they share a single chunk list: reading simply carries on
   * across a chapter boundary, which is what listening to an article means. */
  function makeItem(item) {
    var parts = (item.parts && item.parts.length)
      ? item.parts
      : [{ label: item.title, text: item.text }];
    var chunks = [];
    var chapters = [];

    parts.forEach(function (part) {
      var c = chunk(part.text);
      chapters.push({
        label: part.label || '',
        level: part.level || 2,
        from: chunks.length,
        count: c.length
      });
      chunks = chunks.concat(c);
    });

    return {
      id: item.id,
      title: item.title,
      lang: item.lang || 'en',
      chunks: chunks,
      chapters: chapters,
      index: 0
    };
  }

  /* Which chapter the chunk at `i` falls in. Chapters with nothing of their own
   * are passed over, so a heading that only introduces subsections never claims
   * the sentences belonging to the one after it. */
  function chapterAt(item, i) {
    var found = -1;
    for (var n = 0; n < item.chapters.length; n++) {
      var ch = item.chapters[n];
      if (ch.from <= i && ch.count > 0) found = n;
    }
    return found;
  }

  /* Where a chapter starts. An empty one points at whatever follows it, so
   * jumping to a bare heading begins at its first subsection. */
  function chapterStart(item, n) {
    var ch = item.chapters[n];
    if (!ch) return -1;
    return Math.min(ch.from, item.chunks.length - 1);
  }

  /* Jump to a chapter of what is being read and carry on from there. */
  function seekChapter(n) {
    if (!supported() || !current) return false;
    var at = chapterStart(current, n);
    if (at < 0) return false;
    var item = current, wasPaused = paused;
    // The cancel arrives as a 'canceled' error, which speakChunk ignores.
    synth.cancel();
    if (wasPaused) synth.resume();
    current = item;
    current.index = at;
    playing = true;
    paused = false;
    startKeepAlive();
    setTimeout(speakChunk, 60);
    emit();
    return true;
  }

  /* The next chapter with something in it, or -1 at the end of the article. */
  function nextChapterIndex() {
    if (!current) return -1;
    for (var n = chapterAt(current, current.index) + 1; n < current.chapters.length; n++) {
      if (current.chapters[n].count > 0) return n;
    }
    return -1;
  }

  function nextChapter() {
    var n = nextChapterIndex();
    return n < 0 ? false : seekChapter(n);
  }

  function hasNextChapter() { return nextChapterIndex() >= 0; }

  /* Speak now, dropping whatever is being said. `startChapter` begins partway
   * in — a chapter button — and reading continues to the end of the article
   * from there, rather than stopping at the end of that chapter. */
  function play(item) {
    if (!supported()) return false;
    cancel();
    var made = makeItem(item);
    if (!made.chunks.length) return false;
    current = made;
    if (item.startChapter) {
      var at = chapterStart(made, item.startChapter);
      if (at >= 0) current.index = at;
    }
    playing = true;

    paused = false;
    startKeepAlive();
    // Some engines need the cancel to settle before the next speak lands.
    setTimeout(speakChunk, 60);
    emit();
    return true;
  }

  /* Add to the back of the queue; start if idle. */
  function enqueue(item) {
    if (!supported()) return false;
    if (spoken[item.id] || (current && current.id === item.id)) return false;
    if (queue.some(function (q) { return q.id === item.id; })) return false;
    var made = makeItem(item);
    if (!made.chunks.length) return false;
    if (!playing) {
      current = made;
      playing = true;
      paused = false;
      startKeepAlive();
      setTimeout(speakChunk, 60);
    } else {
      queue.push(made);
    }
    emit();
    return true;
  }

  function pause() {
    if (!supported() || !playing) return;
    synth.pause();
    paused = true;
    emit();
  }

  function resume() {
    if (!supported() || !playing) return;
    synth.resume();
    paused = false;
    emit();
  }

  function toggle() {
    if (!playing) return;
    if (paused) resume(); else pause();
  }

  /* Skip the rest of this place and move to the next queued one. */
  function next() {
    if (!supported() || !current) return;
    if (current) spoken[current.id] = true;
    synth.cancel();
    current = null;
    if (queue.length) {
      current = queue.shift();
      current.index = 0;
      startKeepAlive();
      setTimeout(speakChunk, 60);
    } else {
      playing = false;
      stopKeepAlive();
    }
    emit();
  }

  function cancel() {
    if (!supported()) return;
    synth.cancel();
    playing = false;
    paused = false;
    current = null;
    stopKeepAlive();
  }

  function stop() { cancel(); queue = []; emit(); }

  /* Apply a change in how we sound without waiting for the next place: re-speak
   * the sentence in progress. The cancel lands as an 'interrupted' error, which
   * speakChunk already knows to ignore.
   *
   * Not while paused, though: cancelling clears the engine's paused state, so
   * re-speaking would start talking again underneath a player that still says
   * paused. The new voice or rate takes effect on the next sentence instead. */
  function restartCurrent() {
    if (!playing || !current || paused) return;
    var item = current, resumeAt = current.index;
    synth.cancel();
    current = item;
    current.index = resumeAt;
    setTimeout(speakChunk, 60);
  }

  /* Speeds worth offering. 1.5 is the one people reach for — quick enough to get
   * through a long article on a walk, slow enough to stay intelligible on the
   * plainer voices some browsers are stuck with. */
  var RATES = [0.75, 1, 1.25, 1.5, 1.75];

  function rates() { return RATES.slice(); }

  function setRate(r) {
    rate = TT.clamp(r, 0.6, 2);
    restartCurrent();
    emit();
  }

  /* Step to the next speed, wrapping round. Returns the speed now in force.
   * Starts from whichever step is nearest, so a rate restored from an older
   * setting still lands somewhere sensible. */
  function cycleRate() {
    var i = 0, best = Infinity;
    RATES.forEach(function (r, n) {
      var d = Math.abs(r - rate);
      if (d < best) { best = d; i = n; }
    });
    setRate(RATES[(i + 1) % RATES.length]);
    return rate;
  }


  function hasSpoken(id) { return !!spoken[id]; }
  function forget(id) { if (id) delete spoken[id]; else spoken = {}; }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  return {
    supported: supported, hasVoiceFor: hasVoiceFor, voiceFor: voiceFor,
    listVoices: listVoices, setVoice: setVoice,
    play: play, enqueue: enqueue, pause: pause, resume: resume, toggle: toggle,
    next: next, stop: stop, setRate: setRate, cycleRate: cycleRate, rates: rates,

    seekChapter: seekChapter, nextChapter: nextChapter, hasNextChapter: hasNextChapter,

    hasSpoken: hasSpoken, forget: forget,
    status: status, subscribe: subscribe,
    queueLength: function () { return queue.length; }
  };
})();

/* Build the narration script for a place: what it is, then the encyclopedia.
 * Reads like a guide talking rather than a page being recited. */
TT.narrationFor = function (place, wiki, opts) {
  opts = opts || {};
  var parts = [];
  var isWiki = !place.eras;

  if (!isWiki) {
    parts.push(place.name + '.');
    if (place.from != null) {
      var span = TT.fmtSpan(place.from, place.to);
      if (span) parts.push(span.replace('–', 'to').replace(' – ', ' to ') + '.');
    }
    parts.push(place.blurb);
  } else {
    parts.push(place.title || place.name);
    if (place.description) parts.push(place.description + '.');
  }

  if (wiki && wiki.extract) parts.push(wiki.extract);

  if (!isWiki && place.trivia && place.trivia.length && opts.trivia !== false) {
    parts.push('One more thing.');
    parts.push(place.trivia[0].text);
    if (opts.allTrivia) {
      place.trivia.slice(1).forEach(function (t) { parts.push(t.text); });
    }
  }

  return parts.filter(Boolean).join(' ');
};

/* The same place as a list of chapters, for a deliberate listen rather than a
 * passing mention: the guide's own opening, then one part per Wikipedia heading.
 * Reading runs straight through them, so pressing Listen means the whole article
 * and not just its first paragraph.
 *
 * `article` is what TT.wiki.article() returned; `wiki` is the summary, used for
 * the opening when there is no parsed article to work from. */
TT.narrationParts = function (place, article, wiki, opts) {
  opts = opts || {};
  var lang = opts.lang || (article && article.lang) || 'en';
  var isWiki = !place.eras;
  var parts = [];
  var open = [];

  if (!isWiki) {
    open.push(place.name + '.');
    if (place.from != null) {
      var span = TT.fmtSpan(place.from, place.to);
      if (span) open.push(span.replace(' – ', ' to ') + '.');
    }
    if (place.blurb) open.push(place.blurb);
  } else {
    open.push(place.title || place.name);
    if (place.description) open.push(place.description + '.');
  }

  var lead = (article && article.lead) || (wiki && wiki.extract) || '';
  if (lead) open.push(lead);

  parts.push({
    label: lang === 'no' ? 'Innledning' : 'Introduction',
    level: 2,
    text: open.filter(Boolean).join(' ')
  });

  ((article && article.sections) || []).forEach(function (sec) {
    // The heading is spoken, not just used as a label: without it you cannot
    // hear where you have arrived, and it gives a heading that has no prose of
    // its own something to say when it is jumped to.
    parts.push({
      label: sec.title,
      level: sec.level,
      text: sec.text ? sec.title + '. ' + sec.text : sec.title + '.'
    });
  });

  // Curiosity mode's details, kept as a chapter of their own at the end rather
  // than dropped into the middle of the encyclopedia.
  if (!isWiki && place.trivia && place.trivia.length && opts.trivia !== false) {
    var label = lang === 'no' ? 'Verdt å vite' : 'Worth knowing';
    parts.push({
      label: label,
      level: 2,
      text: [label + '.'].concat(place.trivia.map(function (t) { return t.text; })).join(' ')
    });
  }

  return parts.filter(function (p) { return p.text && p.text.trim(); });
};

