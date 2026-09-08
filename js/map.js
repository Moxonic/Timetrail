/* Leaflet map: markers for curated places, a lighter layer for live Wikipedia
 * finds, the route line for the active trail, and the visitor's own position. */
window.TT = window.TT || {};

TT.map = (function () {
  var map = null;
  var layers = {};
  var markers = {};        // place id -> marker (curated)
  var wikiMarkers = {};    // wiki id  -> marker
  var meMarker = null, meCircle = null;
  var routeLine = null;
  var onSelect = function () {};

  var TILES = {
    dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    light: {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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

  function iconFor(place, opts) {
    opts = opts || {};
    var era = TT.primaryEra(place);
    var visited = TT.store.isVisited(place.id);
    var cls = 'tt-pin' +
      (visited ? ' is-visited' : '') +
      (opts.active ? ' is-active' : '') +
      (opts.onTrail ? ' is-ontrail' : '');
    return L.divIcon({
      className: 'tt-pin-wrap',
      html: '<span class="' + cls + '" style="--pin:' + era.color + '">' +
            '<i>' + glyphFor(place) + '</i></span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14]
    });
  }

  function wikiIcon() {
    return L.divIcon({
      className: 'tt-pin-wrap',
      html: '<span class="tt-pin tt-pin-wiki"><i>w</i></span>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
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

    return map;
  }

  function setTheme(theme) {
    var conf = TILES[theme] || TILES.dark;
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(conf.url, {
      attribution: conf.attribution,
      subdomains: 'abcd',
      maxZoom: 20
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
        icon: iconFor(p, {
          active: p.id === activeId,
          onTrail: trail && trail.stops.indexOf(p.id) !== -1
        }),
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

  function renderWiki(records) {
    layers.wiki.clearLayers();
    wikiMarkers = {};
    records.forEach(function (r) {
      var m = L.marker([r.lat, r.lng], {
        icon: wikiIcon(),
        title: r.title,
        alt: r.title,
        zIndexOffset: -200
      });
      m.on('click', function () { onSelect(r.id, 'wiki', r); });
      m.bindTooltip(r.title, { direction: 'top', offset: [0, -10], opacity: 0.9 });
      m.addTo(layers.wiki);
      wikiMarkers[r.id] = m;
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
      m.on('click', function () { onSelect(p.id, 'spot'); });
      m.addTo(layers.spots);
    });
  }

  function clearSpots() { layers.spots.clearLayers(); }

  function setActive(id) {
    Object.keys(markers).forEach(function (pid) {
      var p = TT.placeById(pid);
      if (!p) return;
      var state = TT.store.get();
      var trail = state.trail ? TT.trailById(state.trail) : null;
      markers[pid].setIcon(iconFor(p, {
        active: pid === id,
        onTrail: trail && trail.stops.indexOf(pid) !== -1
      }));
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
    setActive: setActive, focus: focus, fit: fit,
    showMe: showMe, hideMe: hideMe, toggleWikiLayer: toggleWikiLayer,
    invalidate: invalidate, getCenter: getCenter, getRadius: getRadius,
    raw: function () { return map; }
  };
})();
