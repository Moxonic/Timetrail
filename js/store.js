/* Application state, with a tiny subscribe/notify loop and localStorage persistence.
 * Anything the visitor would be annoyed to lose between sessions is persisted:
 * which trail they are on, what they have already seen, and their filters.
 */
window.TT = window.TT || {};

TT.store = (function () {
  var KEY = 'timetrail.state.v1';

  var defaults = {
    lang: 'en',            // 'en' | 'no' — which Wikipedia to read
    theme: 'light',        // always boots in day mode — see the restore below
    eras: [],              // selected era ids; empty = all
    themes: [],            // selected theme ids; empty = all
    years: [800, 2030],    // timeline range
    trail: null,           // active trail id
    trailIndex: 0,         // how far along it they are
    selected: null,        // selected place id (curated id or 'wiki:...')
    visited: [],           // place ids already seen
    walkMode: false,       // follow my position
    showWiki: true,        // overlay live Wikipedia geosearch results
    onlyUnvisited: false,
    trivia: true,          // show the small details layer
    autoNarrate: false,    // read places aloud as I come near them
    speechRate: 1,         // narration speed
    voicePrefs: {},        // lang -> voiceURI, when the visitor picked a voice
    showSpots: true,       // mark things you pass along a route
    center: null,          // last map centre, so a reload puts you back
    zoom: null,
    panelSnap: null,       // where the visitor left the panel: open/hidden/peek/half/full
    cityName: TT.CITY ? TT.CITY.name : 'Oslo'
  };

  var state = Object.assign({}, defaults);
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    Object.keys(saved).forEach(function (k) {
      // Theme is deliberately not restored: every visit starts in day mode,
      // and the toggle only lasts for that session.
      if (k in defaults && k !== 'theme') state[k] = saved[k];
    });
  } catch (e) { /* start fresh */ }

  var subs = [];
  var persist = TT.debounce(function () {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }, 300);

  function get() { return state; }

  /* set({eras: [...]}, 'filters') — the reason string lets subscribers skip work. */
  function set(patch, reason) {
    var changed = [];
    Object.keys(patch).forEach(function (k) {
      if (JSON.stringify(state[k]) !== JSON.stringify(patch[k])) {
        state[k] = patch[k];
        changed.push(k);
      }
    });
    if (!changed.length) return;
    persist();
    subs.forEach(function (fn) { fn(state, changed, reason || ''); });
  }

  function subscribe(fn) {
    subs.push(fn);
    return function () { subs = subs.filter(function (f) { return f !== fn; }); };
  }

  function toggleIn(key, value) {
    var list = state[key].slice();
    var i = list.indexOf(value);
    if (i === -1) list.push(value); else list.splice(i, 1);
    var patch = {};
    patch[key] = list;
    set(patch, key);
  }

  function markVisited(id) {
    if (!id || state.visited.indexOf(id) !== -1) return;
    set({ visited: state.visited.concat([id]) }, 'visited');
  }

  function isVisited(id) { return state.visited.indexOf(id) !== -1; }

  function resetProgress() {
    set({ visited: [], trail: null, trailIndex: 0, selected: null }, 'reset');
  }

  function resetFilters() {
    set({ eras: [], themes: [], years: [800, 2030], onlyUnvisited: false }, 'filters');
  }

  return {
    get: get,
    set: set,
    subscribe: subscribe,
    toggleIn: toggleIn,
    markVisited: markVisited,
    isVisited: isVisited,
    resetProgress: resetProgress,
    resetFilters: resetFilters
  };
})();
