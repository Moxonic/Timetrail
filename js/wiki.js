/* Wikipedia access.
 *
 * Three things are needed from Wikipedia:
 *   1. summary(title)     – extract + image for a curated place
 *   2. search(term)       – fallback when a curated title has drifted or is wrong
 *   3. nearby(lat,lng)    – live geosearch, so the app finds things we never curated
 *
 * Everything is cached in memory for the session and in localStorage for a day,
 * because walking around a city means asking for the same page repeatedly.
 */
window.TT = window.TT || {};

TT.wiki = (function () {
  var mem = {};
  var CACHE_KEY = 'timetrail.wikicache.v1';
  var TTL = 24 * 60 * 60 * 1000;
  var disk = {};

  try {
    disk = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch (e) { disk = {}; }

  var flush = TT.debounce(function () {
    try {
      // Keep the cache from growing without bound.
      var keys = Object.keys(disk);
      if (keys.length > 400) {
        keys.sort(function (a, b) { return disk[a].t - disk[b].t; });
        keys.slice(0, keys.length - 400).forEach(function (k) { delete disk[k]; });
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(disk));
    } catch (e) { /* quota or private mode — cache is optional */ }
  }, 1500);

  function cached(key) {
    if (mem[key]) return mem[key];
    var d = disk[key];
    if (d && Date.now() - d.t < TTL) {
      mem[key] = Promise.resolve(d.v);
      return mem[key];
    }
    return null;
  }

  function store(key, value) {
    disk[key] = { t: Date.now(), v: value };
    flush();
    return value;
  }

  function api(lang, params) {
    var q = Object.assign({ format: 'json', origin: '*' }, params);
    var qs = Object.keys(q).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(q[k]);
    }).join('&');
    return fetch('https://' + lang + '.wikipedia.org/w/api.php?' + qs)
      .then(function (r) {
        if (!r.ok) throw new Error('wiki api ' + r.status);
        return r.json();
      })
      .then(function (json) {
        // The API answers 200 with an {error} body for bad parameters. Throw so
        // callers fall through to their catch instead of caching an empty result.
        if (json && json.error) {
          throw new Error('wiki api: ' + json.error.code + ' — ' + json.error.info);
        }
        return json;
      });
  }

  function normalise(json, lang) {
    if (!json || json.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') return null;
    return {
      title: json.title,
      description: json.description || '',
      extract: json.extract || '',
      thumb: json.thumbnail ? json.thumbnail.source : null,
      image: json.originalimage ? json.originalimage.source : null,
      url: json.content_urls && json.content_urls.desktop
        ? json.content_urls.desktop.page
        : 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(json.title || ''),
      lat: json.coordinates ? json.coordinates.lat : null,
      lng: json.coordinates ? json.coordinates.lon : null,
      lang: lang
    };
  }

  /* REST summary for an exact page title. Resolves to null if there is no such page. */
  function summary(title, lang) {
    lang = lang || 'en';
    if (!title) return Promise.resolve(null);
    var key = 'sum:' + lang + ':' + title;
    var hit = cached(key);
    if (hit) return hit;

    var p = fetch('https://' + lang + '.wikipedia.org/api/rest_v1/page/summary/' +
                  encodeURIComponent(title.replace(/ /g, '_')) + '?redirect=true')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return store(key, normalise(j, lang)); })
      .catch(function () { return null; });

    mem[key] = p;
    return p;
  }

  /* Full-text search, used to recover when a curated title does not resolve. */
  function search(term, lang, limit) {
    lang = lang || 'en';
    var key = 'search:' + lang + ':' + term + ':' + (limit || 5);
    var hit = cached(key);
    if (hit) return hit;

    var p = api(lang, {
      action: 'query', list: 'search', srsearch: term,
      srlimit: limit || 5, srnamespace: 0
    }).then(function (j) {
      var results = ((j.query && j.query.search) || []).map(function (s) {
        return { title: s.title, snippet: (s.snippet || '').replace(/<[^>]+>/g, '') };
      });
      return store(key, results);
    }).catch(function () { return []; });

    mem[key] = p;
    return p;
  }

  /* The full lead section as plain text. The REST summary is one or two
   * sentences — fine to read on screen, too thin to listen to while walking. */
  function intro(title, lang) {
    lang = lang || 'en';
    if (!title) return Promise.resolve(null);
    var key = 'intro:' + lang + ':' + title;
    var hit = cached(key);
    if (hit) return hit;

    var p = api(lang, {
      action: 'query', prop: 'extracts', exintro: 1, explaintext: 1,
      redirects: 1, titles: title
    }).then(function (j) {
      var pages = (j.query && j.query.pages) || {};
      var page = Object.keys(pages).map(function (k) { return pages[k]; })[0];
      var text = page && page.extract ? page.extract.trim() : '';
      return store(key, text || null);
    }).catch(function () { return null; });

    mem[key] = p;
    return p;
  }

  /* Best effort: try the curated title, then fall back to searching for the name. */
  function lookup(place, lang) {
    lang = lang || 'en';
    var title = place.wiki && place.wiki[lang];
    var fallbackName = lang === 'no' && place.nameLocal ? place.nameLocal : place.name;

    return summary(title, lang).then(function (res) {
      if (res && res.extract) return res;
      return search(fallbackName + ' ' + TT.CITY.name, lang, 1).then(function (hits) {
        if (!hits.length) return res;
        return summary(hits[0].title, lang).then(function (alt) {
          return (alt && alt.extract) ? Object.assign(alt, { viaSearch: true }) : res;
        });
      });
    });
  }

  /* Live geosearch — the "something interesting just popped up" feature.
   * Returns lightweight records; full text is fetched only when one is opened. */
  function nearby(lat, lng, opts) {
    opts = opts || {};
    var lang = opts.lang || 'en';
    // Both must be whole numbers: the API rejects a fractional radius outright,
    // and callers derive theirs from map bounds, which is never round.
    var radius = Math.round(TT.clamp(opts.radius || 1200, 10, 10000));
    var limit = Math.round(TT.clamp(opts.limit || 40, 1, 500));
    // Round the key so tiny GPS jitter does not defeat the cache.
    var key = 'geo:' + lang + ':' + lat.toFixed(3) + ',' + lng.toFixed(3) + ':' + radius + ':' + limit;
    var hit = cached(key);
    if (hit) return hit;

    var p = api(lang, {
      action: 'query',
      generator: 'geosearch',
      ggscoord: lat + '|' + lng,
      ggsradius: radius,
      ggslimit: limit,
      prop: 'coordinates|pageimages|description',
      piprop: 'thumbnail',
      pithumbsize: 320
    }).then(function (j) {
      var pages = (j.query && j.query.pages) || {};
      var out = Object.keys(pages).map(function (pid) {
        var pg = pages[pid];
        var co = (pg.coordinates && pg.coordinates[0]) || {};
        return {
          id: 'wiki:' + lang + ':' + pg.pageid,
          pageid: pg.pageid,
          title: pg.title,
          name: pg.title,
          description: pg.description || '',
          thumb: pg.thumbnail ? pg.thumbnail.source : null,
          lat: co.lat, lng: co.lon,
          lang: lang,
          source: 'wikipedia'
        };
      }).filter(function (r) { return r.lat != null && r.lng != null; });

      out.forEach(function (r) {
        r.dist = TT.distance({ lat: lat, lng: lng }, { lat: r.lat, lng: r.lng });
      });
      out.sort(function (a, b) { return a.dist - b.dist; });
      return store(key, out);
    }).catch(function () { return []; });

    mem[key] = p;
    return p;
  }

  return {
    summary: summary,
    intro: intro,
    search: search,
    lookup: lookup,
    nearby: nearby,
    clearCache: function () {
      mem = {}; disk = {};
      try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
    }
  };
})();

/* Geocoding for the city switcher, via OpenStreetMap Nominatim.
 * Used on demand only (one request per explicit search), per their usage policy. */
TT.geocode = function (query) {
  var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=' +
            encodeURIComponent(query);
  return fetch(url, { headers: { 'Accept': 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      return list.map(function (r) {
        return {
          name: r.display_name.split(',')[0],
          full: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon)
        };
      });
    })
    .catch(function () { return []; });
};
