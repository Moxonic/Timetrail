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

  function supported() { return !!synth && typeof SpeechSynthesisUtterance === 'function'; }

  function loadVoices() {
    if (!supported()) return;
    voices = synth.getVoices() || [];
  }
  if (supported()) {
    loadVoices();
    if (typeof synth.onvoiceschanged !== 'undefined') {
      synth.onvoiceschanged = function () { loadVoices(); emit(); };
    }
  }

  /* Pick the closest voice for a language, preferring an exact locale. */
  function voiceFor(lang) {
    if (!voices.length) loadVoices();
    var want = lang === 'no' ? ['nb-no', 'nn-no', 'no'] : ['en-gb', 'en-us', 'en'];
    for (var i = 0; i < want.length; i++) {
      var hit = voices.find(function (v) {
        return v.lang && v.lang.toLowerCase().replace('_', '-').indexOf(want[i]) === 0;
      });
      if (hit) return hit;
    }
    return null;
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
      voices: voices.length
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

  function makeItem(item) {
    return {
      id: item.id,
      title: item.title,
      lang: item.lang || 'en',
      chunks: chunk(item.text),
      index: 0
    };
  }

  /* Speak now, dropping whatever is being said. */
  function play(item) {
    if (!supported()) return false;
    cancel();
    var made = makeItem(item);
    if (!made.chunks.length) return false;
    current = made;
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

  function setRate(r) {
    rate = TT.clamp(r, 0.6, 1.6);
    // Apply immediately by restarting the sentence in progress.
    if (playing && current) {
      var resumeAt = current.index;
      var item = current;
      synth.cancel();
      current = item;
      current.index = resumeAt;
      setTimeout(speakChunk, 60);
    }
    emit();
  }

  function hasSpoken(id) { return !!spoken[id]; }
  function forget(id) { if (id) delete spoken[id]; else spoken = {}; }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  return {
    supported: supported, hasVoiceFor: hasVoiceFor, voiceFor: voiceFor,
    play: play, enqueue: enqueue, pause: pause, resume: resume, toggle: toggle,
    next: next, stop: stop, setRate: setRate,
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
