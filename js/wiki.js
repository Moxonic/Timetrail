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

  /* Section headings that are lists of links and citations rather than prose.
   * Nothing in them is worth listening to — "External links" read aloud is a
   * minute of URLs. Norwegian titles too, since the app reads either wiki. */
  var SKIP_SECTION = new RegExp('^(' + [
    'references?', 'notes?', 'citations?', 'sources?', 'bibliography',
    'further reading', 'external links?', 'see also', 'gallery', 'footnotes?',
    'works cited', 'other sources', 'notes and references',
    'referanser', 'noter', 'kilder', 'litteratur', 'eksterne lenker',
    'se også', 'galleri', 'fotnoter'
  ].join('|') + ')$', 'i');

  /* Plain-text extracts mark headings as "== History ==", one "=" deeper per
   * level, so an article can be cut into chapters without parsing any HTML. */
  function parseArticle(text) {
    var lead = [];
    var sections = [];
    var cur = null;
    var skipLevel = 0;            // >0 while inside a section we are dropping

    String(text || '').split('\n').forEach(function (line) {
      var m = /^(={2,6})\s*(.+?)\s*\1$/.exec(line.trim());
      if (m) {
        var level = m[1].length;
        // A dropped heading takes its subsections with it.
        if (skipLevel && level > skipLevel) return;
        skipLevel = 0;
        if (SKIP_SECTION.test(m[2])) { skipLevel = level; cur = null; return; }
        cur = { level: level, title: m[2], lines: [] };
        sections.push(cur);
        return;
      }
      if (skipLevel) return;
      (cur ? cur.lines : lead).push(line);
    });

    function body(lines) { return lines.join('\n').replace(/\n{2,}/g, '\n').trim(); }

    return {
      lead: body(lead),
      // A heading with no prose of its own is kept rather than dropped: it is a
      // real chapter in the article's shape, and jumping to it then starts at
      // its first subsection, which is what a reader expects it to do.
      sections: sections.map(function (sec) {
        return { level: sec.level, title: sec.title, text: body(sec.lines) };
      })
    };
  }

  /* The whole article as chapters: the lead, then one entry per heading. This is
   * what makes an article listenable end to end rather than a blurb, and it is
   * a single request — the same payload serves the chapter list and the reading. */
  function article(title, lang) {
    lang = lang || 'en';
    if (!title) return Promise.resolve(null);
    var key = 'art:' + lang + ':' + title;
    var hit = cached(key);
    if (hit) return hit;

    var p = api(lang, {
      action: 'query', prop: 'extracts', explaintext: 1,
      redirects: 1, titles: title
    }).then(function (j) {
      var pages = (j.query && j.query.pages) || {};
      var page = Object.keys(pages).map(function (k) { return pages[k]; })[0];
      if (!page || !page.extract) return store(key, null);
      var parsed = parseArticle(page.extract);
      if (!parsed.lead && !parsed.sections.length) return store(key, null);
      parsed.title = page.title || title;
      parsed.lang = lang;
      return store(key, parsed);
    }).catch(function () { return null; });

    mem[key] = p;
    return p;
  }

  /* The city's other language, for when a place is written up in only one. */
  function otherLang(lang) {
    var langs = (TT.CITY && TT.CITY.langs) || ['en', 'no'];
    for (var i = 0; i < langs.length; i++) {
      if (langs[i] !== lang) return langs[i];
    }
    return null;
  }

  /* Best effort: the curated title, then a search for the name, then the other
   * language. Several Oslo places — Damstredet, Vulkan, Glasmagasinet — are
   * written up on no.wikipedia and nowhere else, and a place with a picture and
   * an article to listen to in the "wrong" language beats a blank one. The
   * result carries its own `lang`, so callers narrate it in the voice it was
   * actually written in rather than assuming the interface language. */
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
    }).then(function (res) {
      if (res && res.extract) return res;
      var alt = otherLang(lang);
      var altTitle = alt && place.wiki && place.wiki[alt];
      if (!altTitle) return res;
      return summary(altTitle, alt).then(function (x) {
        return (x && x.extract) ? Object.assign(x, { viaLang: lang }) : res;
      });
    });
  }

  /* Lead images for a whole screenful of places at once.
   *
   * Every curated pin wants a picture, and one request per pin would be sixty.
   * The API takes fifty titles a call, so a full map is one or two. Resolves to
   * a { requested title -> url or null } map; null is cached like any answer,
   * because "this place has no picture" stays true and should not be re-asked
   * on every pan. */
  function thumbs(titles, lang) {
    lang = lang || 'en';
    var uniq = [];
    (titles || []).forEach(function (t) {
      if (t && uniq.indexOf(t) === -1) uniq.push(t);
    });

    var out = {};
    var misses = [];
    var waits = [];

    uniq.forEach(function (t) {
      var hit = cached('thumb:' + lang + ':' + t);
      if (hit) waits.push(hit.then(function (v) { out[t] = v || null; }));
      else misses.push(t);
    });

    for (var i = 0; i < misses.length; i += 50) {
      waits.push(thumbBatch(misses.slice(i, i + 50), lang, out));
    }
    return Promise.all(waits).then(function () { return out; });
  }

  function thumbBatch(batch, lang, out) {
    return api(lang, {
      action: 'query', prop: 'pageimages', piprop: 'thumbnail',
      // Big enough for the largest a pin ever draws on a 3x screen.
      pithumbsize: 240, redirects: 1, titles: batch.join('|')
    }).then(function (j) {
      var q = j.query || {};
      var pages = q.pages || {};
      // A redirect or a normalised title means the page comes back filed under
      // a name we did not ask for, so follow the hops before matching it up.
      var hop = {};
      (q.normalized || []).concat(q.redirects || []).forEach(function (h) { hop[h.from] = h.to; });
      var byTitle = {};
      Object.keys(pages).forEach(function (k) { byTitle[pages[k].title] = pages[k]; });

      var noLead = [];
      batch.forEach(function (t) {
        var seen = {}, cur = t;
        while (hop[cur] && !seen[cur]) { seen[cur] = 1; cur = hop[cur]; }
        var pg = byTitle[cur];
        var url = (pg && pg.thumbnail && pg.thumbnail.source) || null;
        if (url) {
          out[t] = url;
          store('thumb:' + lang + ':' + t, url);
        } else if (pg && pg.missing === undefined) {
          // A real page that simply has no lead image — worth a second look.
          noLead.push(t);
        } else {
          out[t] = null;
          store('thumb:' + lang + ':' + t, null);
        }
      });
      return firstPhoto(noLead, lang, out);
    }).catch(function () {
      // A failed request is not an answer — leave it uncached so a later pan retries.
      batch.forEach(function (t) { out[t] = null; });
    });
  }

  /* Page furniture: things an article carries that are not pictures of it.
   * Most are SVG and caught by the mime test below, but logos are often PNG. */
  var FURNITURE = /logo|icon|symbol|flag|coat[ _]of[ _]arms|locator|location[ _]map|commons|wiktionary|disambig|ambox|stub|edit-|increase|decrease|padlock|question|wikidata/i;

  /* Wikipedia only designates a lead image when an infobox or a picture at the
   * top of the page makes the choice obvious, so an article can be full of
   * photographs and still answer "no image". Steen & Strøm is the case in
   * point: a fine photograph of the 1900s shopfront, and an empty pageimage.
   *
   * For those pages, take the largest real photograph instead. One request per
   * page, but only ever for a page that came back empty, and the answer is
   * cached like any other — so a pin costs this once and never again. */
  function firstPhoto(titles, lang, out) {
    if (!titles.length) return null;
    return Promise.all(titles.map(function (t) {
      return api(lang, {
        action: 'query', generator: 'images', gimlimit: 50, redirects: 1, titles: t,
        prop: 'imageinfo', iiprop: 'url|mime|size', iiurlwidth: 240
      }).then(function (j) {
        var pages = (j.query && j.query.pages) || {};
        var best = null;
        Object.keys(pages).forEach(function (k) {
          var pg = pages[k];
          var info = pg.imageinfo && pg.imageinfo[0];
          if (!info || !info.thumburl) return;
          if (!/^image\/(jpeg|png|webp)$/.test(info.mime || '')) return;
          if (FURNITURE.test(pg.title || '')) return;
          // Biggest wins: the photograph of the place beats a stray badge.
          var area = (info.width || 0) * (info.height || 0);
          if (!best || area > best.area) best = { url: info.thumburl, area: area, w: info.width };
        });
        // A tiny image is a badge we failed to name, not a photograph.
        var url = (best && best.w >= 200) ? best.url : null;
        out[t] = url;
        store('thumb:' + lang + ':' + t, url);
      }).catch(function () {
        // Leave it uncached, as thumbBatch does, so a later pan can retry.
        out[t] = null;
      });
    }));
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
      // Sized for the map pin and the list row, not for a hero image: fifty of
      // these load at once every time the map moves.
      pithumbsize: 160
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
    article: article,

    search: search,
    lookup: lookup,
    thumbs: thumbs,
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
