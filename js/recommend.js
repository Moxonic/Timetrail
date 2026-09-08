/* Filtering and recommendation.
 *
 * The design goal: from wherever you are standing, always offer both
 *   (a) a way to keep pulling on the thread you are already pulling, and
 *   (b) a genuinely different thread that happens to be nearby,
 * so a visitor is never locked into the walk they picked twenty minutes ago.
 */
window.TT = window.TT || {};

TT.filterPlaces = function (places, state) {
  return places.filter(function (p) {
    if (state.eras.length && !p.eras.some(function (e) { return state.eras.indexOf(e) !== -1; })) return false;
    if (state.themes.length && !p.themes.some(function (t) { return state.themes.indexOf(t) !== -1; })) return false;
    if (state.onlyUnvisited && TT.store.isVisited(p.id)) return false;

    // A place matches the timeline if its story overlaps the selected window.
    // At the slider's floor the window is open-ended, so prehistory is included.
    var from = p.from == null ? -99999 : p.from;
    var to = p.to == null ? TT.TIMELINE.max : p.to;
    var lo = state.years[0] <= TT.TIMELINE.min ? -99999 : state.years[0];
    var hi = state.years[1] >= TT.TIMELINE.max ? 99999 : state.years[1];
    if (to < lo || from > hi) return false;
    return true;
  });
};

/* Score a candidate as a follow-on from `origin`.
 * Returns { place, score, reasons[] } — the reasons are shown in the UI, because
 * a recommendation you can't interrogate is just a list. */
TT.scoreNext = function (candidate, origin, ctx) {
  ctx = ctx || {};
  var state = ctx.state || TT.store.get();
  var reasons = [];
  var score = 0;

  if (origin) {
    var sharedEras = (candidate.eras || []).filter(function (e) {
      return (origin.eras || []).indexOf(e) !== -1;
    });
    if (sharedEras.length) {
      score += 3 * sharedEras.length;
      var era = TT.eraById(sharedEras[0]);
      if (era) reasons.push('same period — ' + era.name);
    }

    var sharedThemes = (candidate.themes || []).filter(function (t) {
      return (origin.themes || []).indexOf(t) !== -1;
    });
    if (sharedThemes.length) {
      score += 2 * sharedThemes.length;
      var th = TT.themeById(sharedThemes[0]);
      if (th) reasons.push('also about ' + th.name.toLowerCase());
    }

    // Shared trail membership is a strong signal: an editor already linked them.
    var sharedTrails = TT.trailsFor(candidate.id).filter(function (t) {
      return TT.trailsFor(origin.id).some(function (u) { return u.id === t.id; });
    });
    if (sharedTrails.length) {
      score += 4;
      reasons.push('on the same walk: ' + sharedTrails[0].name);
    }

    // Chronological momentum — the next thing to happen, rather than the next thing over.
    if (candidate.from != null && origin.from != null) {
      var gap = candidate.from - origin.from;
      if (gap > 0 && gap < 200) {
        score += 2;
        reasons.push('picks up the story ' + gap + ' years later');
      }
    }
  }

  // Distance: everything is walkable or it is not a recommendation.
  var d = ctx.from ? TT.distance(ctx.from, candidate) : null;
  if (d != null) {
    score += 12 * Math.exp(-d / 700);          // ~12 pts next door, ~3 pts at 1 km
    if (d < 300) reasons.unshift('a ' + TT.fmtWalk(d).replace(' walk', '') + ' away');
    else reasons.push(TT.fmtDist(d) + ' away');
  }

  if (!TT.store.isVisited(candidate.id)) score += 2;
  else score -= 8;                              // strongly prefer somewhere new

  // Respect the active filters even in recommendations.
  if (state.eras.length && !(candidate.eras || []).some(function (e) { return state.eras.indexOf(e) !== -1; })) {
    score -= 6;
  }

  return { place: candidate, score: score, reasons: reasons, dist: d };
};

/* The "keep going" list. */
TT.recommendNext = function (origin, opts) {
  opts = opts || {};
  var state = opts.state || TT.store.get();
  var from = opts.from || (origin ? { lat: origin.lat, lng: origin.lng } : null);
  var limit = opts.limit || 3;
  var exclude = (opts.exclude || []).concat(origin ? [origin.id] : []);

  var pool = TT.filterPlaces(TT.PLACES, state).filter(function (p) {
    return exclude.indexOf(p.id) === -1;
  });

  // If the visitor is on a trail, the next unvisited stop gets a decisive boost.
  var trail = state.trail ? TT.trailById(state.trail) : null;
  var nextOnTrail = null;
  if (trail) {
    nextOnTrail = trail.stops.find(function (id) {
      return !TT.store.isVisited(id) && exclude.indexOf(id) === -1;
    });
  }

  var scored = pool.map(function (p) {
    var s = TT.scoreNext(p, origin, { from: from, state: state });
    if (nextOnTrail && p.id === nextOnTrail) {
      s.score += 10;
      s.reasons.unshift('next on ' + trail.name);
      s.onTrail = true;
    }
    return s;
  });

  scored.sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, limit);
};

/* The "or try something completely different" list.
 *
 * Deliberately picks nearby places that share as *little* as possible with the
 * current thread — a different era or a different theme — so that switching path
 * is always one tap away and always feels like a discovery rather than a detour.
 */
TT.recommendSwitch = function (origin, opts) {
  opts = opts || {};
  var state = opts.state || TT.store.get();
  var from = opts.from || (origin ? { lat: origin.lat, lng: origin.lng } : null);
  var limit = opts.limit || 2;
  var exclude = (opts.exclude || []).concat(origin ? [origin.id] : []);
  var radius = opts.radius || 1400;

  // Ignore era/theme filters here on purpose: this is the escape hatch from them.
  var pool = TT.PLACES.filter(function (p) {
    if (exclude.indexOf(p.id) !== -1) return false;
    if (TT.store.isVisited(p.id)) return false;
    if (from && TT.distance(from, p) > radius) return false;
    return true;
  });

  var currentEras = origin ? origin.eras : (state.eras.length ? state.eras : []);
  var currentThemes = origin ? origin.themes : (state.themes.length ? state.themes : []);

  var scored = pool.map(function (p) {
    var d = from ? TT.distance(from, p) : 0;
    var eraOverlap = TT.overlap(p.eras, currentEras);
    var themeOverlap = TT.overlap(p.themes, currentThemes);

    var score = 10 * Math.exp(-d / 600);        // must actually be close by
    score += eraOverlap === 0 ? 6 : -3 * eraOverlap;
    score += themeOverlap === 0 ? 3 : -1.5 * themeOverlap;

    var reasons = [];
    var otherEra = TT.eraById(p.eras[0]);
    if (otherEra && eraOverlap === 0) {
      reasons.push('a jump to ' + otherEra.name);
    } else {
      var otherTheme = (p.themes || []).find(function (t) { return currentThemes.indexOf(t) === -1; });
      var th = otherTheme && TT.themeById(otherTheme);
      if (th) reasons.push('a different angle: ' + th.name.toLowerCase());
    }
    if (d) reasons.push(TT.fmtWalk(d));

    // If it opens a whole other curated walk, say so — that is the real offer.
    var otherTrails = TT.trailsFor(p.id).filter(function (t) { return t.id !== state.trail; });
    if (otherTrails.length) {
      score += 3;
      reasons.push('starts you on “' + otherTrails[0].name + '”');
    }

    return { place: p, score: score, reasons: reasons, dist: d, switchTo: otherTrails[0] || null };
  });

  scored.sort(function (a, b) { return b.score - a.score; });

  // Don't offer two switches into the same era — that isn't a choice.
  var out = [], usedEras = [];
  scored.forEach(function (s) {
    if (out.length >= limit) return;
    var e = s.place.eras[0];
    if (usedEras.indexOf(e) !== -1) return;
    usedEras.push(e);
    out.push(s);
  });
  return out;
};

/* Everything within `radius` of a point, nearest first — powers walk mode. */
TT.nearbyPlaces = function (point, opts) {
  opts = opts || {};
  var state = opts.state || TT.store.get();
  var pool = opts.respectFilters === false ? TT.PLACES : TT.filterPlaces(TT.PLACES, state);
  return pool.map(function (p) {
    return { place: p, dist: TT.distance(point, p) };
  }).filter(function (r) {
    return r.dist <= (opts.radius || 1500);
  }).sort(function (a, b) {
    return a.dist - b.dist;
  }).slice(0, opts.limit || 20);
};

/* Order a trail's stops into a sensible walking sequence from where you are:
 * greedy nearest-neighbour, which is good enough for eight stops and is what a
 * person does anyway. */
TT.routeFrom = function (point, placeIds) {
  var remaining = placeIds.map(TT.placeById).filter(Boolean);
  var cursor = point;
  var order = [];
  while (remaining.length) {
    var bestI = 0, bestD = Infinity;
    remaining.forEach(function (p, i) {
      var d = TT.distance(cursor, p);
      if (d < bestD) { bestD = d; bestI = i; }
    });
    var picked = remaining.splice(bestI, 1)[0];
    order.push({ place: picked, dist: bestD });
    cursor = picked;
  }
  return order;
};

TT.trailProgress = function (trailId) {
  var trail = TT.trailById(trailId);
  if (!trail) return null;
  var done = trail.stops.filter(function (id) { return TT.store.isVisited(id); });
  return {
    trail: trail,
    done: done.length,
    total: trail.stops.length,
    pct: Math.round(100 * done.length / trail.stops.length),
    next: trail.stops.find(function (id) { return !TT.store.isVisited(id); }) || null
  };
};
