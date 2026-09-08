/* Real pedestrian routing.
 *
 * Straight lines between stops are a lie: they cut through blocks, cross water,
 * and give walking times that are always wrong. This asks Valhalla (the FOSSGIS
 * public instance) for an actual foot route along real streets and paths, with
 * per-leg distances, times and turn-by-turn instructions.
 *
 * If the service is unreachable we fall back to straight legs, clearly flagged
 * as estimates so the UI can say so rather than pretending.
 */
window.TT = window.TT || {};

TT.route = (function () {
  var ENDPOINT = 'https://valhalla1.openstreetmap.de/route';
  var mem = {};

  /* Valhalla returns an encoded polyline at 1e6 precision (Google's is 1e5). */
  function decodeShape(str, precision) {
    var factor = Math.pow(10, precision == null ? 6 : precision);
    var index = 0, lat = 0, lng = 0, coords = [];
    while (index < str.length) {
      var b, shift = 0, result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
      shift = 0; result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
      coords.push({ lat: lat / factor, lng: lng / factor });
    }
    return coords;
  }

  function key(points, costing) {
    return costing + ':' + points.map(function (p) {
      return p.lat.toFixed(5) + ',' + p.lng.toFixed(5);
    }).join('|');
  }

  /* Straight-line stand-in, used when routing is unavailable. */
  function fallback(points) {
    var legs = [];
    for (var i = 0; i < points.length - 1; i++) {
      var d = TT.distance(points[i], points[i + 1]);
      legs.push({
        distance: d,
        // 1.35 m/s is a relaxed city walking pace; the detour factor accounts
        // for the fact that you cannot walk through buildings.
        time: (d * 1.25) / 1.35,
        shape: [points[i], points[i + 1]],
        maneuvers: [],
        estimated: true
      });
    }
    return {
      legs: legs,
      shape: points.slice(),
      distance: legs.reduce(function (s, l) { return s + l.distance; }, 0),
      time: legs.reduce(function (s, l) { return s + l.time; }, 0),
      estimated: true
    };
  }

  /* points: [{lat,lng}, …] in walking order. Resolves to a route object. */
  function walk(points, opts) {
    opts = opts || {};
    var costing = opts.costing || 'pedestrian';
    if (!points || points.length < 2) return Promise.resolve(null);

    var k = key(points, costing);
    if (mem[k]) return mem[k];

    var body = {
      locations: points.map(function (p) {
        return { lat: +p.lat.toFixed(6), lon: +p.lng.toFixed(6), type: 'break' };
      }),
      costing: costing,
      costing_options: { pedestrian: { walking_speed: opts.speed || 4.8 } },
      directions_options: { units: 'kilometers' }
    };

    var p = fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('routing ' + r.status);
        return r.json();
      })
      .then(function (json) {
        var trip = json && json.trip;
        if (!trip || !trip.legs || !trip.legs.length) throw new Error('no route');

        var whole = [];
        var legs = trip.legs.map(function (leg) {
          var shape = decodeShape(leg.shape, 6);
          whole = whole.concat(shape);
          return {
            distance: leg.summary.length * 1000,
            time: leg.summary.time,
            shape: shape,
            maneuvers: (leg.maneuvers || []).map(function (m) {
              return {
                text: m.instruction,
                distance: (m.length || 0) * 1000,
                time: m.time || 0,
                // Index into this leg's shape, so a step can be located on the map.
                at: shape[m.begin_shape_index] || null
              };
            }),
            estimated: false
          };
        });

        return {
          legs: legs,
          shape: whole,
          distance: trip.summary.length * 1000,
          time: trip.summary.time,
          estimated: false
        };
      })
      .catch(function () {
        // Never let a routing outage break the walk.
        return fallback(points);
      });

    mem[k] = p;
    return p;
  }

  /* Shortest distance from a point to a polyline, in metres.
   * Used to find what you pass on the way rather than only where you stop. */
  function distanceToPath(point, shape) {
    if (!shape || shape.length < 2) return Infinity;
    var best = Infinity;
    // Local flat-earth projection: fine over a few kilometres, and much cheaper
    // than a haversine per segment.
    var latRad = point.lat * Math.PI / 180;
    var mPerLat = 111320;
    var mPerLng = 111320 * Math.cos(latRad);
    var px = point.lng * mPerLng, py = point.lat * mPerLat;

    for (var i = 0; i < shape.length - 1; i++) {
      var ax = shape[i].lng * mPerLng, ay = shape[i].lat * mPerLat;
      var bx = shape[i + 1].lng * mPerLng, by = shape[i + 1].lat * mPerLat;
      var dx = bx - ax, dy = by - ay;
      var len2 = dx * dx + dy * dy;
      var t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      var cx = ax + t * dx, cy = ay + t * dy;
      var d = Math.hypot(px - cx, py - cy);
      if (d < best) best = d;
    }
    return best;
  }

  /* Everything worth a glance within `radius` of the route that is not a stop. */
  function spotsAlong(route, excludeIds, radius) {
    if (!route) return [];
    radius = radius || 70;
    return TT.PLACES
      .filter(function (p) { return (excludeIds || []).indexOf(p.id) === -1; })
      .map(function (p) { return { place: p, off: distanceToPath(p, route.shape) }; })
      .filter(function (r) { return r.off <= radius; })
      .sort(function (a, b) { return a.off - b.off; });
  }

  function fmtTime(seconds) {
    var m = Math.round(seconds / 60);
    if (m < 1) return 'under a minute';
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60);
    return h + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');
  }

  return {
    walk: walk,
    decodeShape: decodeShape,
    distanceToPath: distanceToPath,
    spotsAlong: spotsAlong,
    fmtTime: fmtTime
  };
})();
