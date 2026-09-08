/* Wiring. Owns the flow between store → map → panel, plus geolocation. */
(function () {
  var store = TT.store;
  var here = null;          // last known position {lat,lng,accuracy}
  var watchId = null;
  var announced = {};       // place ids we have already popped an arrival for
  var wikiCache = [];       // last geosearch result set
  var currentModel = null;
  var currentRoute = null;  // routed geometry for the active trail
  var currentStops = [];    // [{place, leg, spots, fromHere}]
  var routeToken = 0;       // guards against a stale route arriving late
  var narrated = {};        // ids already read aloud on this outing

  function state() { return store.get(); }

  /* ---------- rendering ---------- */

  function visiblePlaces() {
    return TT.filterPlaces(TT.PLACES, state());
  }

  function refreshMap() {
    var places = visiblePlaces();
    TT.map.renderPlaces(places, state().selected);
  }

  function refreshList() {
    var s = state();
    var places = visiblePlaces();
    var items;

    if (here) {
      items = places.map(function (p) {
        return { place: p, dist: TT.distance(here, p) };
      }).sort(function (a, b) { return a.dist - b.dist; });
      TT.ui.renderList(items, { groupByEra: false });
    } else {
      // No position: group by era so the list reads as a table of contents.
      items = places.map(function (p) { return { place: p }; });
      TT.ui.renderList(items, { groupByEra: true });
    }
  }

  function refreshTrailStrip() {
    var s = state();
    if (!s.trail) { TT.ui.renderActiveTrail(null); return; }
    var prog = TT.trailProgress(s.trail);
    var nextPlace = prog.next ? TT.placeById(prog.next) : null;
    var info = {
      dist: (nextPlace && here) ? TT.distance(here, nextPlace) : null,
      route: currentRoute,
      spots: currentStops.reduce(function (n, st) {
        return n + ((st.spots && st.spots.length) || 0);
      }, 0)
    };
    // If the next stop is on the routed itinerary, use its real walking time.
    if (nextPlace) {
      var match = currentStops.find(function (st) { return st.place.id === nextPlace.id; });
      if (match && match.leg) info.legTime = match.leg.time;
    }
    TT.ui.renderActiveTrail(prog, nextPlace, info);
  }

  function refreshAll() {
    refreshMap();
    refreshList();
    refreshTrailStrip();
    TT.ui.renderTrails(state().trail);
  }

  /* ---------- selection & detail ---------- */

  function buildModel(place, kind) {
    var s = state();
    var origin = { lat: place.lat, lng: place.lng };
    var next = kind === 'curated'
      ? TT.recommendNext(place, { from: here || origin, state: s, limit: 3 })
      : TT.recommendNext(null, { from: origin, state: s, limit: 3 });

    // "Change the subject" must not re-offer something already listed under
    // "where to go next", or the two blocks stop meaning different things.
    var alreadyOffered = next.map(function (r) { return r.place.id; });

    var model = {
      place: place,
      kind: kind,
      wikiLoading: true,
      wiki: null,
      next: next,
      switches: kind === 'curated'
        ? TT.recommendSwitch(place, {
            from: here || origin, state: s, limit: 2, exclude: alreadyOffered
          })
        : [],
      wikiNearby: wikiCache.filter(function (r) {
        return TT.distance(origin, r) < 400 && r.title !== place.name;
      }).slice(0, 6)
    };
    return model;
  }

  function select(id, source, record) {
    var isWiki = String(id).indexOf('wiki:') === 0;
    var place, kind;

    if (isWiki) {
      place = record || wikiCache.find(function (r) { return r.id === id; });
      if (!place) return;
      kind = 'wiki';
    } else {
      place = TT.placeById(id);
      if (!place) return;
      kind = 'curated';
    }

    store.set({ selected: id }, 'select');
    TT.map.setActive(isWiki ? null : id);
    if (source !== 'map') TT.map.focus({ lat: place.lat, lng: place.lng }, 16);

    currentModel = buildModel(place, kind);
    TT.ui.renderDetail(currentModel);

    var lang = state().lang;
    var p = isWiki
      ? TT.wiki.summary(place.title, place.lang || lang)
      : TT.wiki.lookup(place, lang);

    p.then(function (res) {
      // Ignore a late response for a place the visitor has already navigated away from.
      if (!currentModel || currentModel.place !== place) return;
      currentModel.wiki = res;
      currentModel.wikiLoading = false;
      TT.ui.renderDetail(currentModel);
    });

    // Seeing the detail page counts as arriving, when you are actually there.
    if (!isWiki && here && TT.distance(here, place) < 120) {
      store.markVisited(id);
    }
  }

  function markVisited(id) {
    if (store.isVisited(id)) {
      // Toggle back off — people mis-tap.
      store.set({ visited: state().visited.filter(function (v) { return v !== id; }) }, 'visited');
      TT.ui.toast('Unmarked.');
    } else {
      store.markVisited(id);
      var s = state();
      if (s.trail) {
        var prog = TT.trailProgress(s.trail);
        if (!prog.next) {
          TT.ui.toast('“' + prog.trail.name + '” complete — all ' + prog.total + ' stops.');
        } else {
          var nxt = TT.placeById(prog.next);
          TT.ui.toast('Marked. Next on ' + prog.trail.name + ': ' + nxt.name + '.');
        }
      } else {
        TT.ui.toast('Marked as seen.');
      }
    }
    if (currentModel) {
      // Recompute both blocks together so the "no duplicates" rule still holds.
      var origin = here || currentModel.place;
      currentModel.next = TT.recommendNext(currentModel.place, {
        from: origin, state: state(), limit: 3
      });
      currentModel.switches = TT.recommendSwitch(currentModel.place, {
        from: origin, state: state(), limit: 2,
        exclude: currentModel.next.map(function (r) { return r.place.id; })
      });
      TT.ui.renderDetail(currentModel);
    }
  }

  /* ---------- trails ---------- */

  function toggleTrail(trailId, keepSelection) {
    var s = state();
    if (s.trail === trailId) {
      store.set({ trail: null }, 'trail');
      routeToken++;                 // abandon any route still in flight
      currentRoute = null;
      currentStops = [];
      TT.map.clearRoute();
      TT.map.clearSpots();
      TT.ui.renderItinerary(null);
      TT.ui.toast('Left the walk. Everything is open again.');
    } else {
      store.set({ trail: trailId, trailIndex: 0 }, 'trail');
      var trail = TT.trailById(trailId);
      previewTrail(trailId, !keepSelection);
      var prog = TT.trailProgress(trailId);
      var next = prog.next ? TT.placeById(prog.next) : null;
      TT.ui.toast('Following “' + trail.name + '”' + (next ? ' — start at ' + next.name : ''));
      if (!keepSelection && next) {
        TT.ui.setTab('discover');
      }
    }
    refreshAll();
  }

  function previewTrail(trailId, fitBounds) {
    var trail = TT.trailById(trailId);
    if (!trail) return;
    // If we know where the visitor is, walk the stops in nearest-first order.
    var ordered = here
      ? TT.routeFrom(here, trail.stops).map(function (r) { return r.place; })
      : trail.stops.map(TT.placeById).filter(Boolean);
    var era = trail.era ? TT.eraById(trail.era) : null;
    var color = era ? era.color : '#e0b25c';

    // Draw straight lines immediately so the map responds at once, then replace
    // them with the real walking route when it comes back.
    currentRoute = null;
    currentStops = ordered.map(function (p) { return { place: p, leg: null, spots: [] }; });
    TT.map.renderRoute(ordered, { color: color, estimated: true });
    TT.map.clearSpots();
    if (fitBounds !== false) TT.map.fit(ordered);
    TT.ui.renderItinerary(trail, currentStops, null);

    var token = ++routeToken;
    var fromHere = !!here;
    // Islands and anywhere else you cannot reach on foot are kept out of the
    // route request — routing through them invents a path that does not exist.
    var routable = ordered.filter(function (p) { return !p.reachBy; });
    var points = (fromHere ? [{ lat: here.lat, lng: here.lng }] : []).concat(routable);

    TT.route.walk(points).then(function (route) {
      // A newer route request (or leaving the walk) supersedes this one.
      if (token !== routeToken || !route) return;
      currentRoute = route;
      TT.map.renderRoute(route.shape, { color: color, estimated: route.estimated });

      // Walk the stops in order, consuming one routed leg per walkable stop.
      // With a starting position the first walkable stop already has a leg;
      // without one it does not, hence the cursor starting below zero.
      var legCursor = fromHere ? -1 : -2;
      var legToStop = {};
      currentStops = ordered.map(function (p, i) {
        if (p.reachBy) {
          return {
            place: p, leg: null, spots: [],
            transport: p.reachBy, transportFrom: p.reachFrom
          };
        }
        legCursor++;
        if (legCursor >= 0) legToStop[legCursor] = i;
        return {
          place: p,
          leg: legCursor >= 0 ? (route.legs[legCursor] || null) : null,
          fromHere: fromHere && legCursor === 0,
          spots: []
        };
      });

      // What you walk past without stopping.
      var exclude = ordered.map(function (p) { return p.id; });
      var spots = TT.route.spotsAlong(route, exclude, 70);
      spots.forEach(function (s) {
        var bestI = 0, bestD = Infinity;
        route.legs.forEach(function (leg, i) {
          var d = TT.route.distanceToPath(s.place, leg.shape);
          if (d < bestD) { bestD = d; bestI = i; }
        });
        var stopIndex = legToStop[bestI];
        if (stopIndex != null && currentStops[stopIndex]) currentStops[stopIndex].spots.push(s);
      });

      if (state().showSpots) TT.map.renderSpots(spots);
      TT.ui.renderItinerary(trail, currentStops, route);
      refreshTrailStrip();
    });
  }

  /* ---------- spoken guide ---------- */

  /* Assemble the script for a place and speak it. `mode` is 'play' to start
   * immediately, or 'queue' to fall in behind whatever is being read. */
  function narrate(place, mode) {
    var s = state();
    var lang = s.lang;
    var isWiki = !place.eras;
    var id = isWiki ? place.id : place.id;

    if (!TT.audio.supported()) {
      TT.ui.toast('This browser cannot read pages aloud.');
      return Promise.resolve(false);
    }
    if (!TT.audio.hasVoiceFor(lang)) {
      TT.ui.toast(lang === 'no'
        ? 'No Norwegian voice installed — reading in whatever voice is available.'
        : 'No speech voice found on this device.');
    }

    // Prefer the full lead section: the short summary makes for a thin listen.
    var title = isWiki ? place.title : (place.wiki && place.wiki[lang]);
    var fetchText = title
      ? TT.wiki.intro(title, lang).then(function (long) {
          if (long) return { extract: long };
          return isWiki ? TT.wiki.summary(place.title, lang) : TT.wiki.lookup(place, lang);
        })
      : (isWiki ? Promise.resolve(null) : TT.wiki.lookup(place, lang));

    return fetchText.then(function (wiki) {
      var script = TT.narrationFor(place, wiki, {
        trivia: state().trivia,
        allTrivia: state().trivia && mode === 'play'
      });
      narrated[id] = true;
      var item = { id: id, title: place.name || place.title, text: script, lang: lang };
      return mode === 'queue' ? TT.audio.enqueue(item) : TT.audio.play(item);
    });
  }

  /* A line to judge a voice by. Deliberately a real one from the tour: it puts
   * a Norwegian place name inside an English sentence, which is exactly where
   * voices differ most. */
  function previewVoice() {
    var lang = state().lang;
    TT.audio.play({
      id: 'voice-preview',
      title: 'Voice preview',
      lang: lang,
      text: lang === 'no'
        ? 'Akershus festning. Borgen Oslo vokste opp rundt, reist rundt tretten hundre.'
        : 'Akershus Fortress. The castle Oslo grew up around, raised about thirteen hundred.'
    });
  }

  /* Hands-free tour: read out whatever we have just come near. */
  function narrateSurroundings() {
    if (!state().autoNarrate || !here) return;

    var candidates = TT.nearbyPlaces(here, { radius: 90, limit: 4, respectFilters: false })
      .map(function (r) { return { item: r.place, dist: r.dist }; });

    // Uncurated Wikipedia finds count too — the point is everything around you.
    wikiCache.forEach(function (r) {
      var d = TT.distance(here, r);
      if (d <= 90) candidates.push({ item: r, dist: d });
    });

    candidates
      .filter(function (c) { return !narrated[c.item.id] && !TT.audio.hasSpoken(c.item.id); })
      .sort(function (a, b) { return a.dist - b.dist; })
      .slice(0, 2)
      .forEach(function (c) { narrate(c.item, 'queue'); });
  }

  /* ---------- live Wikipedia layer ---------- */

  var refreshWiki = TT.debounce(function () {
    if (!state().showWiki) return;
    var c = TT.map.getCenter();
    if (!c) return;
    var radius = Math.min(5000, Math.max(500, TT.map.getRadius()));
    TT.wiki.nearby(c.lat, c.lng, { lang: state().lang, radius: radius, limit: 50 })
      .then(function (records) {
        if (!state().showWiki) return;
        // Hide anything that duplicates a curated place, by proximity + name.
        var filtered = records.filter(function (r) {
          return !TT.PLACES.some(function (p) {
            return TT.distance(p, r) < 60 ||
                   p.name.toLowerCase() === r.title.toLowerCase() ||
                   (p.nameLocal || '').toLowerCase() === r.title.toLowerCase();
          });
        });
        wikiCache = filtered;
        TT.map.renderWiki(filtered);
      });
  }, 500);

  /* ---------- geolocation / walk mode ---------- */

  function toggleWalk() {
    if (watchId != null) return stopWalk();
    if (!navigator.geolocation) {
      TT.ui.toast('This browser will not share a location.');
      return;
    }
    TT.ui.setStatus('Finding you…');
    watchId = navigator.geolocation.watchPosition(onPosition, onPosError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000
    });
    store.set({ walkMode: true }, 'walk');
    TT.ui.setWalkState(true, 'Finding you…');
  }

  function stopWalk() {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    here = null;
    announced = {};
    narrated = {};
    TT.audio.stop();
    TT.audio.forget();
    store.set({ walkMode: false, autoNarrate: false }, 'walk');
    TT.ui.dom().narrateToggle.checked = false;
    TT.map.hideMe();
    TT.ui.setWalkState(false, '');
    refreshList();
    refreshTrailStrip();
  }

  function onPosition(pos) {
    var first = !here;
    here = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy
    };
    TT.map.showMe(here);
    if (first) {
      TT.map.focus(here, 16);
      refreshWiki();
    }

    var nearest = TT.nearbyPlaces(here, { radius: 3000, limit: 1, respectFilters: false })[0];
    TT.ui.setWalkState(true, nearest
      ? 'Nearest: ' + nearest.place.name + ' · ' + TT.fmtDist(nearest.dist)
      : 'No curated places within 3 km — the Wikipedia layer still works.');

    refreshList();
    refreshTrailStrip();

    // Read out what is around us, if the visitor asked for that.
    narrateSurroundings();

    // Arrival: within 60 m of somewhere we have not already announced.
    // With narration running the spoken cue is enough — a card demanding a tap
    // defeats the point of a hands-free tour.
    var arrivals = TT.nearbyPlaces(here, { radius: 60, limit: 3, respectFilters: false });
    var target = arrivals.find(function (a) { return !announced[a.place.id]; });
    if (target && state().selected !== target.place.id) {
      announced[target.place.id] = true;
      if (!state().autoNarrate) {
        TT.ui.arrival(target.place, function () { select(target.place.id, 'arrival'); });
      }
    }
  }

  function onPosError(err) {
    var msg = err.code === 1
      ? 'Location permission denied. Everything else still works.'
      : 'Could not get a location fix.';
    TT.ui.toast(msg);
    stopWalk();
  }

  /* ---------- search ---------- */

  function doSearch(term) {
    if (!term || term.length < 2) {
      TT.ui.renderSearch([]);
      return;
    }
    var lower = term.toLowerCase();
    var results = [];

    TT.PLACES.forEach(function (p) {
      if (results.length >= 6) return;
      if (p.name.toLowerCase().indexOf(lower) !== -1 ||
          (p.nameLocal || '').toLowerCase().indexOf(lower) !== -1) {
        results.push({
          name: p.name, kind: TT.primaryEra(p).name,
          onPick: function () { select(p.id, 'search'); }
        });
      }
    });

    TT.TRAILS.forEach(function (t) {
      if (t.name.toLowerCase().indexOf(lower) !== -1) {
        results.push({
          name: t.name, kind: 'walk',
          onPick: function () { TT.ui.setTab('trails'); previewTrail(t.id); }
        });
      }
    });

    TT.ui.renderSearch(results);

    // City jump: only when nothing local matched, so it never gets in the way.
    if (results.length === 0) {
      TT.geocode(term).then(function (places) {
        if (!places.length) return;
        TT.ui.renderSearch(places.slice(0, 4).map(function (c) {
          return {
            name: c.name, kind: 'go here',
            onPick: function () {
              TT.map.focus({ lat: c.lat, lng: c.lng }, 15);
              store.set({ showWiki: true, cityName: c.name }, 'city');
              TT.ui.dom().wikiToggle.checked = true;
              TT.map.toggleWikiLayer(true);
              refreshWiki();
              TT.ui.toast('Showing live Wikipedia places around ' + c.name +
                          '. Curated walks are Oslo-only for now.');
            }
          };
        }));
      });
    }
  }

  /* ---------- boot ---------- */

  function boot() {
    var s = state();

    TT.ui.init({
      onSelect: select,
      onVisit: markVisited,
      onTrailToggle: toggleTrail,
      onTrailPreview: function (id) { previewTrail(id); TT.ui.toast('Route shown on the map.'); },
      onWalkToggle: toggleWalk,
      onSearch: doSearch,
      onEraJump: function (eraId) {
        store.set({ eras: [eraId], themes: [] }, 'filters');
        TT.ui.renderEraChips(); TT.ui.renderThemeChips();
        TT.ui.setTab('discover');
        TT.ui.toast('Filtered to ' + TT.eraById(eraId).name + '.');
      },
      onThemeJump: function (themeId) {
        store.set({ themes: [themeId], eras: [] }, 'filters');
        TT.ui.renderEraChips(); TT.ui.renderThemeChips();
        TT.ui.setTab('discover');
        TT.ui.toast('Following ' + TT.themeById(themeId).name.toLowerCase() + ' across every period.');
      },
      onListen: function (place) { narrate(place, 'play'); },
      onVoicePick: function (uri) {
        var prefs = Object.assign({}, state().voicePrefs);
        if (uri) prefs[state().lang] = uri; else delete prefs[state().lang];
        store.set({ voicePrefs: prefs }, 'audio');
        TT.audio.setVoice(prefs);
        // Choosing a voice is a request to hear it.
        previewVoice();
      },
      onVoicePreview: previewVoice,
      onNarrateToggle: function (on) {
        store.set({ autoNarrate: on }, 'audio');
        if (!on) {
          TT.audio.stop();
          TT.ui.toast('Stopped reading aloud.');
          return;
        }
        if (!TT.audio.supported()) {
          TT.ui.toast('This browser cannot read pages aloud.');
          TT.ui.dom().narrateToggle.checked = false;
          store.set({ autoNarrate: false }, 'audio');
          return;
        }
        // Speech needs a user gesture to start on most browsers; this toggle is
        // that gesture, so prime it here rather than on the first GPS fix.
        if (here) {
          narrateSurroundings();
          TT.ui.toast('Reading aloud as you walk. Tap Walk mode too if it is off.');
        } else if (currentModel) {
          narrate(currentModel.place, 'play');
        } else {
          TT.ui.toast('Turn on Walk mode and it will start talking as you move.');
        }
      },
      onWikiToggle: function (on) {
        store.set({ showWiki: on }, 'wiki');
        TT.map.toggleWikiLayer(on);
        if (on) refreshWiki(); else TT.map.clearWiki();
      },
      onLangToggle: function () {
        var next = state().lang === 'en' ? 'no' : 'en';
        store.set({ lang: next }, 'lang');
        TT.ui.setLang(next);
        wikiCache = [];
        TT.ui.renderVoicePicker(next, state().voicePrefs[next]);
        refreshWiki();
        if (currentModel) select(state().selected, 'lang');
        TT.ui.toast(next === 'no' ? 'Reading Norwegian Wikipedia.' : 'Reading English Wikipedia.');
      },
      onThemeToggle: function () {
        var next = state().theme === 'dark' ? 'light' : 'dark';
        store.set({ theme: next }, 'theme');
        TT.ui.setTheme(next);
        TT.map.setTheme(next);
      }
    });

    TT.ui.setTheme(s.theme);
    TT.ui.setLang(s.lang);
    TT.ui.dom().wikiToggle.checked = s.showWiki;
    TT.ui.dom().unvisitedToggle.checked = s.onlyUnvisited;
    TT.ui.dom().triviaToggle.checked = s.trivia;
    // Narration never resumes by itself: it needs a fresh user gesture, and a
    // page that starts talking on load is hostile.
    TT.ui.dom().narrateToggle.checked = false;
    store.set({ autoNarrate: false }, 'audio');

    TT.audio.subscribe(function (st) {
      TT.ui.renderPlayer(st);
      // Voices arrive asynchronously in Chrome, so the picker fills in late.
      TT.ui.renderVoicePicker(state().lang, state().voicePrefs[state().lang]);
    });
    TT.audio.setVoice(s.voicePrefs || {});
    TT.audio.setRate(s.speechRate || 1);
    TT.ui.renderVoicePicker(s.lang, (s.voicePrefs || {})[s.lang]);

    TT.map.init({
      center: s.center || TT.CITY.center,
      zoom: s.zoom || TT.CITY.zoom,
      theme: s.theme,
      onSelect: select
    });
    TT.map.raw().on('moveend', refreshWiki);

    // The panel is draggable; the map has to be told its viewport changed.
    TT.panel.init({
      onChange: function (snap) {
        store.set({ panelSnap: snap }, 'panel');
        TT.map.invalidate();
      }
    });

    store.subscribe(function (st, changed, reason) {
      if (changed.indexOf('eras') !== -1 || changed.indexOf('themes') !== -1 ||
          changed.indexOf('years') !== -1 || changed.indexOf('onlyUnvisited') !== -1) {
        refreshMap(); refreshList();
      }
      if (changed.indexOf('visited') !== -1) {
        refreshMap(); refreshList(); refreshTrailStrip(); TT.ui.renderTrails(st.trail);
        if (st.trail) TT.ui.renderItinerary(TT.trailById(st.trail), currentStops, currentRoute);
      }
      if (changed.indexOf('trivia') !== -1 && currentModel) {
        TT.ui.renderDetail(currentModel);
      }
    });

    refreshAll();
    if (s.showWiki) refreshWiki();
    if (s.trail) previewTrail(s.trail, false);

    // Restore whatever they were looking at.
    if (s.selected && String(s.selected).indexOf('wiki:') !== 0) {
      var p = TT.placeById(s.selected);
      if (p) select(s.selected, 'restore');
    }

    if (!s.visited.length && !s.trail) {
      setTimeout(function () {
        TT.ui.toast('Pick a period, or open Walks and follow a thread. Tap any pin to start.', 6000);
      }, 900);
    }

    // Walk mode is never auto-resumed: it needs a fresh permission gesture.
    TT.ui.setWalkState(false, '');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
