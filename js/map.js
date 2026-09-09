/* Leaflet map: markers for curated places, a lighter layer for live Wikipedia
 * finds, the route line for the active trail, and the visitor's own position. */
window.TT = window.TT || {};

TT.map = (function () {
  var map = null;
  var layers = {};
  var markers = {};        // place id -> marker (curated)
  var placeThumbs = {};    // place id -> lead image url, once Wikipedia answers
  var wikiMarkers = {};    // wiki id  -> marker
  var meMarker = null, meCircle = null;
  var routeLine = null;
  var onSelect = function () {};

  // CARTO's old anonymous basemap.cartocdn.com tiles now return a 200 with a
  // "API KEY REQUIRED" watermark baked into the image instead of a map — they
  // started gating the free tier behind a signup. Esri's Canvas basemaps are
  // still genuinely free and keyless: no account, no rate-limit wall, and a
  // light/dark pair that matches CARTO's old look closely enough that nothing
  // else about the map needs to change. Real detail tops out around zoom 17;
  // past that Esri serves a placeholder tile, which is well past anything this
  // app's own pin-scaling ramp (zoom 14–18) asks for in practice.
  var TILES = {
    dark: {
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community'
    },
    light: {
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, and the GIS user community'
    }
  };
  var tileLayer = null;

  function glyphFor(place) {
    var byKind = {
      fortress: '⛫', church: '✝', ruin: '⌂', museum: '▣', palace: '♛',
      statue: '☗', square: '◇', market: '⌗', shop: '⌂', park: '❦',
      memorial: '✦', district: '▦', building: '▪', cemetery: '✝', site: '◈',
      sign: '◉'
    };
    return byKind[place.kind] || '◈';
  }

  /* A curated pin wears its Wikipedia lead image once we have one, and its era
   * glyph until then — or for good, if the article has no picture. The era
   * colour stays as the border either way, because that is what ties a pin to
   * the period filter; a photo alone would lose it. Built as DOM rather than a
   * markup string so a thumbnail that 404s can quietly become the glyph again. */
  function iconFor(place, opts) {
    opts = opts || {};
    var era = TT.primaryEra(place);
    var pin = TT.el('span.tt-pin');
    // Custom properties need setProperty — assigning to style does nothing.
    pin.style.setProperty('--pin', era.color);
    if (TT.store.isVisited(place.id)) pin.classList.add('is-visited');
    if (opts.active) pin.classList.add('is-active');
    if (opts.onTrail) pin.classList.add('is-ontrail');

    function asGlyph() {
      TT.clear(pin);
      pin.classList.remove('has-photo');
      pin.appendChild(TT.el('i', { text: glyphFor(place) }));
    }

    if (opts.thumb) {
      pin.classList.add('has-photo');
      pin.appendChild(TT.el('img', {
        src: opts.thumb, alt: '', loading: 'lazy', decoding: 'async', onerror: asGlyph
      }));
    } else {
      asGlyph();
    }

    return L.divIcon({
      className: 'tt-pin-wrap tt-pin-wrap-place',
      html: pin,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14]
    });
  }

  /* Everything needed to draw one curated pin in its current state, in one
   * place so renderPlaces, setActive and setPlaceThumbs cannot drift apart. */
  function pinOpts(place, activeId, trail) {
    return {
      active: place.id === activeId,
      onTrail: !!(trail && trail.stops.indexOf(place.id) !== -1),
      thumb: placeThumbs[place.id]
    };
  }

  function activeTrail() {
    var st = TT.store.get();
    return st.trail ? TT.trailById(st.trail) : null;
  }

  /* Wikipedia markers wear the article's lead image, so a screenful of them
   * reads as pictures of the place rather than identical dots. Articles with no
   * image — and thumbnails that fail to load — fall back to the small "w" dot.
   * The wrapper is a fixed 26px either way, so that fallback stays centred. */
  function wikiIcon(r) {
    var pin = TT.el('span.tt-pin.tt-pin-wiki');
    function asDot() {
      TT.clear(pin);
      pin.classList.remove('has-img');
      pin.appendChild(TT.el('i', { text: 'w' }));
    }
    if (r && r.thumb) {
      pin.classList.add('has-img');
      pin.appendChild(TT.el('img', {
        src: r.thumb, alt: '', loading: 'lazy', decoding: 'async', onerror: asDot
      }));
    } else {
      asDot();
    }
    return L.divIcon({
      className: 'tt-pin-wrap tt-pin-wrap-wiki',
      html: pin,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
  }

  /* Picture pins grow as you zoom in: at street level the photograph is the
   * point of the pin, while at city level the same size would just be clutter.
   * Driven by a custom property on the map container rather than by rebuilding
   * the icons, because a rebuild re-requests every thumbnail and throws away
   * the has-img/fallback-to-dot state each one has already settled into. */
  var PIN_ZOOM = { from: 14, to: 18 };
  var WIKI_PIN = { minPx: 24, maxPx: 48 };    // live Wikipedia finds
  var PLACE_PIN = { minPx: 26, maxPx: 52 };   // curated sights, a shade larger

  function applyPinScale() {
    if (!map) return;
    var t = (map.getZoom() - PIN_ZOOM.from) / (PIN_ZOOM.to - PIN_ZOOM.from);
    t = Math.max(0, Math.min(1, t));
    var css = map.getContainer().style;
    var at = function (c) { return (c.minPx + (c.maxPx - c.minPx) * t).toFixed(1) + 'px'; };
    css.setProperty('--wiki-pin', at(WIKI_PIN));
    css.setProperty('--place-pin', at(PLACE_PIN));
  }

  function init(opts) {
    onSelect = opts.onSelect || onSelect;

    map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: false
    }).setView([opts.center.lat, opts.center.lng], opts.zoom || 14);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.attributionControl.setPrefix('');

    layers.places = L.layerGroup().addTo(map);
    layers.wiki = L.layerGroup().addTo(map);
    layers.route = L.layerGroup().addTo(map);
    layers.spots = L.layerGroup().addTo(map);
    layers.me = L.layerGroup().addTo(map);

    setTheme(opts.theme || 'dark');

    map.on('moveend', function () {
      var c = map.getCenter();
      TT.store.set({ center: { lat: c.lat, lng: c.lng }, zoom: map.getZoom() }, 'map');
    });

    map.on('zoomend', applyPinScale);
    applyPinScale();

    return map;
  }

  function setTheme(theme) {
    var conf = TILES[theme] || TILES.dark;
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(conf.url, {
      attribution: conf.attribution,
      // Leaflet still lets the app zoom to 20 (maxZoom) — it just reuses the
      // sharpest real tile (maxNativeZoom) and scales it up, rather than
      // requesting from Esri past the point where they do the same thing
      // server-side and hand back a "Map data not yet available" tile.
      maxZoom: 20,
      maxNativeZoom: 17
    });
    tileLayer.addTo(map);
    tileLayer.bringToBack();
  }

  /* Render the curated set. Called whenever filters change. */
  function renderPlaces(places, activeId) {
    layers.places.clearLayers();
    markers = {};
    var state = TT.store.get();
    var trail = state.trail ? TT.trailById(state.trail) : null;

    places.forEach(function (p) {
      var m = L.marker([p.lat, p.lng], {
        icon: iconFor(p, pinOpts(p, activeId, trail)),
        title: p.name,
        riseOnHover: true,
        keyboard: true,
        alt: p.name
      });
      m.on('click', function () { onSelect(p.id, 'map'); });
      m.bindTooltip(p.name, { direction: 'top', offset: [0, -14], opacity: 0.95 });
      m.addTo(layers.places);
      markers[p.id] = m;
    });
  }

  /* Every pan or zoom re-fetches "what's nearby" and calls this again with a
   * fresh list. Wiping the layer and rebuilding it from scratch each time — as
   * this used to — meant every pin blinked out and back in on every step, even
   * the ones that were in both the old and new list the whole time. Diffing
   * against the existing markers instead means a pin only ever disappears when
   * it has genuinely fallen out of range, and one already on screen keeps its
   * loaded thumbnail rather than re-requesting it. */
  function renderWiki(records) {
    var keep = {};
    (records || []).forEach(function (r) {
      keep[r.id] = true;
      if (wikiMarkers[r.id]) return;   // already on the map — leave it alone

      var m = L.marker([r.lat, r.lng], {
        icon: wikiIcon(r),
        title: r.title,
        alt: r.title,
        zIndexOffset: -200
      });
      // The second argument is the click's *origin*, not the record's kind — that
      // travels separately as the third argument. Passing anything but 'map'
      // here made select() think this came from off-map UI and fly the map to
      // it, which re-centres, fires 'moveend', and refetches + rebuilds the
      // whole wiki layer — discarding the very pin just clicked. Anything that
      // fails to make the freshly fetched top 50 (or now falls inside another
      // pin's "duplicates a curated place" radius) never comes back.
      m.on('click', function () { onSelect(r.id, 'map', r); });
      m.bindTooltip(r.title, { direction: 'top', offset: [0, -14], opacity: 0.9 });
      m.addTo(layers.wiki);
      wikiMarkers[r.id] = m;
    });

    Object.keys(wikiMarkers).forEach(function (id) {
      if (!keep[id]) {
        layers.wiki.removeLayer(wikiMarkers[id]);
        delete wikiMarkers[id];
      }
    });
  }

  function clearWiki() { layers.wiki.clearLayers(); wikiMarkers = {}; }

  /* Draw a walking route. `shape` is the full street geometry when we have a
   * real route, or just the stops when we are falling back to straight lines —
   * which is drawn dashed so it never passes itself off as a real path. */
  function renderRoute(shape, opts) {
    opts = opts || {};
    layers.route.clearLayers();
    if (!shape || shape.length < 2) return;
    var latlngs = shape.map(function (p) { return [p.lat, p.lng]; });

    // A wider, dimmer line under the main one keeps the route readable
    // against busy map detail.
    L.polyline(latlngs, {
      color: opts.color || '#e0b25c',
      weight: 9, opacity: 0.18, lineCap: 'round', lineJoin: 'round',
      interactive: false
    }).addTo(layers.route);

    routeLine = L.polyline(latlngs, {
      color: opts.color || '#e0b25c',
      weight: 4,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: opts.estimated ? '3 9' : null,
      interactive: false
    }).addTo(layers.route);
  }

  function clearRoute() { layers.route.clearLayers(); }

  /* Small markers for things you pass but do not stop at. */
  function renderSpots(spots) {
    layers.spots.clearLayers();
    (spots || []).forEach(function (s) {
      var p = s.place;
      var era = TT.primaryEra(p);
      var m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: 'tt-pin-wrap',
          html: '<span class="tt-spot" style="--pin:' + era.color + '"></span>',
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        }),
        zIndexOffset: -100,
        title: p.name
      });
      m.bindTooltip(p.name + ' · ' + TT.fmtDist(s.off) + ' off the route', {
        direction: 'top', offset: [0, -8], opacity: 0.95
      });
      // Same reasoning as the wiki marker above: this click already happened on
      // the map, so it must report 'map' or select() re-centres on it anyway.
      m.on('click', function () { onSelect(p.id, 'map'); });
      m.addTo(layers.spots);
    });
  }

  function clearSpots() { layers.spots.clearLayers(); }

  function setActive(id) {
    var trail = activeTrail();
    Object.keys(markers).forEach(function (pid) {
      var p = TT.placeById(pid);
      if (!p) return;
      markers[pid].setIcon(iconFor(p, pinOpts(p, id, trail)));
    });
  }

  /* Thumbnails arrive after the pins are already on the map, so redraw the ones
   * that just gained a picture — and only those, since re-iconing a marker
   * throws away its DOM and would restart every image on the map. */
  function setPlaceThumbs(byId) {
    var changed = [];
    Object.keys(byId || {}).forEach(function (id) {
      if (byId[id] && placeThumbs[id] !== byId[id]) {
        placeThumbs[id] = byId[id];
        if (markers[id]) changed.push(id);
      }
    });
    if (!changed.length) return;

    var selected = TT.store.get().selected;
    var trail = activeTrail();
    changed.forEach(function (id) {
      var p = TT.placeById(id);
      if (p) markers[id].setIcon(iconFor(p, pinOpts(p, selected, trail)));
    });
  }

  function focus(latlng, zoom) {
    if (!map) return;
    map.flyTo([latlng.lat, latlng.lng], zoom || Math.max(map.getZoom(), 16), {
      duration: 0.7
    });
  }

  function fit(points, padding) {
    if (!map || !points.length) return;
    var b = L.latLngBounds(points.map(function (p) { return [p.lat, p.lng]; }));
    map.fitBounds(b, { padding: padding || [60, 60], maxZoom: 16 });
  }

  function showMe(pos) {
    layers.me.clearLayers();
    meMarker = L.marker([pos.lat, pos.lng], {
      icon: L.divIcon({
        className: 'tt-pin-wrap',
        html: '<span class="tt-me"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      }),
      zIndexOffset: 1000,
      interactive: false
    }).addTo(layers.me);
    if (pos.accuracy) {
      meCircle = L.circle([pos.lat, pos.lng], {
        radius: Math.min(pos.accuracy, 200),
        color: '#6fd3c7', weight: 1, fillColor: '#6fd3c7', fillOpacity: 0.08,
        interactive: false
      }).addTo(layers.me);
    }
  }

  function hideMe() { layers.me.clearLayers(); }

  function toggleWikiLayer(on) {
    if (!map) return;
    if (on) { if (!map.hasLayer(layers.wiki)) map.addLayer(layers.wiki); }
    else if (map.hasLayer(layers.wiki)) map.removeLayer(layers.wiki);
  }

  function invalidate() { if (map) setTimeout(function () { map.invalidateSize(); }, 60); }

  function getCenter() {
    if (!map) return null;
    var c = map.getCenter();
    return { lat: c.lat, lng: c.lng };
  }

  function getRadius() {
    if (!map) return 1200;
    var b = map.getBounds();
    return Math.min(9000, TT.distance(
      { lat: b.getNorth(), lng: b.getWest() },
      { lat: b.getSouth(), lng: b.getEast() }
    ) / 2);
  }

  return {
    init: init, setTheme: setTheme,
    renderPlaces: renderPlaces, renderWiki: renderWiki, clearWiki: clearWiki,
    renderRoute: renderRoute, clearRoute: clearRoute,
    renderSpots: renderSpots, clearSpots: clearSpots,
    setActive: setActive, setPlaceThumbs: setPlaceThumbs, focus: focus, fit: fit,
    showMe: showMe, hideMe: hideMe, toggleWikiLayer: toggleWikiLayer,
    invalidate: invalidate, getCenter: getCenter, getRadius: getRadius,
    raw: function () { return map; }
  };
})();
