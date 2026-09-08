/* Historical periods and themes.
 * Eras are the coarse "what time are you interested in" filter.
 * Themes cut across eras ("monarchy", "resistance", "shops") so a visitor can
 * follow a subject through centuries instead of a single period.
 */
window.TT = window.TT || {};

/* The timeline slider's travel. At `min` the lower handle means "as early as
 * anything goes" rather than literally 800 — otherwise prehistoric sites
 * (rock carvings, burial ground) would be unreachable without a 5000-year
 * slider that is almost entirely empty. */
TT.TIMELINE = { min: 800, max: 2030 };

TT.ERAS = [
  {
    id: 'viking',
    name: 'Viking Age',
    nameNo: 'Vikingtiden',
    from: 793, to: 1066,
    color: '#c2703d',
    glyph: '⚔',
    blurb: 'Ships, burial mounds and rock-cut marks left long before there was a city here.'
  },
  {
    id: 'medieval',
    name: 'Medieval Oslo',
    nameNo: 'Middelalderen',
    from: 1000, to: 1536,
    color: '#8f6bb0',
    glyph: '✝',
    blurb: 'The first Oslo, downriver in what is now Gamlebyen: cathedral, cloisters, a king\'s hall.'
  },
  {
    id: 'christiania',
    name: 'Christiania & Danish rule',
    nameNo: 'Christiania',
    from: 1536, to: 1814,
    color: '#4d8fa8',
    glyph: '⚓',
    blurb: 'After the fire of 1624 the town moved under the fortress walls and took a king\'s name.'
  },
  {
    id: 'nation',
    name: 'Crown & Constitution',
    nameNo: 'Union og selvstendighet',
    from: 1814, to: 1905,
    color: '#c9a227',
    glyph: '♛',
    blurb: 'A palace, a parliament, a national theatre — a capital building itself an identity.'
  },
  {
    id: 'industrial',
    name: 'Mills & Workers',
    nameNo: 'Industribyen',
    from: 1840, to: 1940,
    color: '#7a8b52',
    glyph: '⚙',
    blurb: 'Waterfalls turned into factories, and the districts that grew up around them.'
  },
  {
    id: 'ww2',
    name: 'Occupation 1940–45',
    nameNo: 'Okkupasjonen',
    from: 1940, to: 1945,
    color: '#a04747',
    glyph: '✦',
    blurb: 'Five years written into ordinary addresses: an office block, a prison yard, a quay.'
  },
  {
    id: 'postwar',
    name: 'Rebuilding',
    nameNo: 'Etterkrigstiden',
    from: 1945, to: 2000,
    color: '#5c8a72',
    glyph: '☗',
    blurb: 'A city hall finished at last, a peace prize, and a welfare state in concrete.'
  },
  {
    id: 'today',
    name: 'Oslo Now',
    nameNo: 'Samtiden',
    from: 2000, to: 2030,
    color: '#6f7fbf',
    glyph: '◈',
    blurb: 'The waterfront turned around to face the fjord, and the city grew a new skyline.'
  }
];

TT.THEMES = [
  { id: 'royal',      name: 'Monarchy & royalty',   glyph: '♛' },
  { id: 'war',        name: 'War & resistance',     glyph: '✦' },
  { id: 'faith',      name: 'Churches & belief',    glyph: '✝' },
  { id: 'power',      name: 'Power & politics',     glyph: '⚖' },
  { id: 'labour',     name: 'Industry & labour',    glyph: '⚙' },
  { id: 'art',        name: 'Art & literature',     glyph: '✎' },
  { id: 'commerce',   name: 'Shops & markets',      glyph: '⌂' },
  { id: 'explore',    name: 'Ships & exploration',  glyph: '⛵' },
  { id: 'everyday',   name: 'Everyday life',        glyph: '☕' },
  { id: 'monument',   name: 'Statues & monuments',  glyph: '⛫' }
];

TT.eraById = function (id) {
  return TT.ERAS.find(function (e) { return e.id === id; }) || null;
};

TT.themeById = function (id) {
  return TT.THEMES.find(function (t) { return t.id === id; }) || null;
};

/* The era a place is "mainly" from — used for marker colour. First listed wins. */
TT.primaryEra = function (poi) {
  return TT.eraById(poi.eras[0]) || TT.ERAS[0];
};
