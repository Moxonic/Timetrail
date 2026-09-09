# TimeTrail

A walkable historical guide to a city, where **you choose which history you get**.

Pick a period — Viking Age, medieval, Christiania, the monarchy, the 1940–45 occupation,
the industrial city, or today — and the map shows you only what belongs to it. Follow a
curated walk end to end, or leave it the moment something more interesting turns up next
to you. Every place tells you where to go next *and* offers a deliberate jump into a
completely different story nearby.

Oslo is the curated city. Anywhere else in the world still works through live Wikipedia
geosearch.

## Run it

```sh
node server.js
```

Then open <http://localhost:5180>.

No build step, no dependencies, no install. Any static server works
(`python -m http.server 5180`, `npx serve`), but use a server rather than opening
`index.html` directly — browsers only grant geolocation on `localhost` or HTTPS.

## What it does

**Choose your period.** Eight eras as filters, plus a draggable timeline range if you
want something narrower than "medieval" — say 1850–1905. At its far left the range is
open-ended ("earliest"), so prehistoric sites stay reachable. Ten cross-cutting themes
(monarchy, war and resistance, industry and labour, shops and markets, statues,
exploration…) let you follow one *subject* through every century instead.

**Follow a thread.** Ten curated walks over 59 places, each an ordered narrative:

| Walk | About |
|---|---|
| Before the City | Viking Age and medieval Oslo, a kilometre downriver from the modern centre |
| The King's Grid | Christian IV's Christiania after the 1624 fire |
| Crown & Constitution | Building a capital, 1814–1905 |
| The Occupied City | 1940–45, mostly in ordinary buildings |
| Mills, Workers & Machines | The Akerselva industrial corridor |
| Turning to the Fjord | The waterfront rebuilt, 1950 → now |
| Market Day | Shops and arcades, from an open market square to an 80s mall |
| Bronze & Stone | Statues, parks, and the arguments behind them |
| Ships & Kings | The Bygdøy museum peninsula |
| First Day in Oslo | The unmissable ones, in a sensible order |

Progress is tracked per walk and survives a reload. Leaving a walk costs one tap and
loses nothing. A few places (Holmenkollen, Damstredet, the Botanical Garden, Engebret
Café) deliberately sit on no walk — they surface through filters, the map and the
"change the subject" recommendations.

**Switch paths at will.** Every place detail has two recommendation blocks. *Where to go
next* keeps you on the current thread, weighted by shared era, shared theme, shared walk,
chronological momentum and walking distance — and each suggestion tells you *why* it was
picked. *Or change the subject* deliberately does the opposite: nearby places chosen for
having as little in common with your current thread as possible, so switching is always
one tap away and feels like a find rather than a detour.

**Real walking routes, with real times.** Trail routes are not straight lines between
pins — they are actual pedestrian routes along streets and footpaths from
[Valhalla](https://valhalla1.openstreetmap.de), with per-leg distances and walking times
and a running total. Places that cannot be walked to are marked rather than faked: the
route to Hovedøya shows "ferry from Vippetangen — not walkable" instead of inventing a
path around the fjord. If the routing service is down it falls back to straight-line
estimates, drawn dashed and labelled "estimated".

**Interesting spots along the way.** Anything within 70 m of your route that is not
itself a stop gets a small marker and a "passing …" note on the leg — so walking from the
Opera to the Cathedral tells you what you are about to go past.

**Curiosity mode.** The small details, as a separate layer: what the Tiger statue is
actually replying to, why Egertorget is not a real square, that the Freia sign was the
first illuminated advertisement in Europe in 1909 and grew animated storks in 1922.
52 details across 40 places, most carrying a link to the Wikipedia article they came from
so you can check them.

**Listen to the whole article.** Every place has a Listen button, and it reads the entire
Wikipedia article rather than the first paragraph: the curated introduction, the article's
lead, then each section in turn, using the browser's own speech synthesis, in English or
Norwegian. The article's own headings become chapter buttons under the text — press
*History* and it starts there and keeps reading to the end. The player bar names the
chapter being read, its skip button steps to the next one, and a chapters menu on the
player itself lets you jump about one-handed while walking.

**A hands-free tour.** Switch on *Read places aloud as I walk* with walk mode and it
narrates whatever you come near: as you get within 90 m of anything, curated or merely on
Wikipedia, it queues up and reads its opening, once each. Passing somewhere is worth a
paragraph, so the tour stays short — staying is what the chapters are for.


**Walk mode.** Uses your position to re-sort everything by walking distance, routes the
trail from where you actually are, and pops a "You are here" card when you come within
60 m of somewhere (suppressed when narration is on, since the spoken cue is the point).
Turning it on requires an explicit tap; it is never auto-resumed, and neither is audio.

**Live Wikipedia.** Curated entries pull their long text from Wikipedia at runtime, in
English or Norwegian (`EN`/`NO` toggle), with a search fallback if a title has drifted.
Faint dashed pins are pure Wikipedia geosearch — things nobody curated. Search any city
name to jump there and browse it that way.

## Layout

```
index.html          markup and script order
css/app.css         all styling; dark and light themes
server.js           dependency-free static server
js/
  util.js           DOM helpers, distance, formatting
  eras.js           the eight periods and ten themes
  data-oslo.js      61 curated places + 10 walks   ← edit this to add a city
  trivia-oslo.js    the small details, keyed by place id
  wiki.js           Wikipedia summary/intro/article/search/geosearch + geocoding, cached

  store.js          state + localStorage persistence
  audio.js          speech synthesis: queue, chapters, voices, narration scripts

  route.js          real pedestrian routing, polyline decode, spots-along-route
  recommend.js      filtering, scoring, "next" and "switch" logic, stop ordering
  map.js            Leaflet: pins, routes, spots, position
  ui.js             all rendering
  app.js            wiring, geolocation, narration, boot
```

## Adding places or another city

`js/data-oslo.js` is the only file you need. Each entry:

```js
{
  id: 'akershus',
  name: 'Akershus Fortress',
  nameLocal: 'Akershus festning',
  lat: 59.90750, lng: 10.73650,
  from: 1290, to: null,               // null = still going
  eras: ['medieval', 'christiania', 'ww2'],   // first one sets the pin colour
  themes: ['war', 'royal', 'power'],
  kind: 'fortress',                   // picks the pin glyph
  blurb: 'One or two sentences of orientation.',
  tips: 'What to actually do when you are standing there.',
  wiki: { en: 'Akershus Fortress', no: 'Akershus festning' }
}
```

Add its `id` to any walk's `stops` array and everything else — filtering, scoring,
routing, progress — picks it up automatically.

## Notes and caveats

- **Coordinates** are hand-placed and good to roughly a building, not a doorway.
- **Curated blurbs** are orientation written for this app; the authoritative detail is
  the Wikipedia extract shown beneath each one, linked to its source. A few entries point
  at articles that may have been renamed — those fall back to a Wikipedia search, and the
  app says so when it does.
- **No API keys, accounts or tokens.** Nothing here needs one: map tiles come from
  CARTO's free basemaps, pedestrian routing from the public FOSSGIS Valhalla instance,
  geocoding from OSM Nominatim, and article text from Wikipedia's open API. Clone it and
  it runs. All four are shared public services with fair-use policies, so if you ever
  deploy this at scale, host your own — but nothing is gated behind a signup, and if a
  service does refuse a request the app degrades instead of breaking: routing falls back
  to straight-line estimates marked "estimated", and Wikipedia failures leave the curated
  text in place.
- **Voices** come from the operating system, not the app. Windows and macOS both ship an
  English voice; a Norwegian one may need to be added in system settings. Without it, the
  Norwegian text is read by whatever voice is available, which sounds wrong. Speech is
  also the one feature that needs a real browser gesture to start, so the toggle is
  deliberately manual.
- **Trivia** is written for this app and sourced where possible; each detail that came
  from Wikipedia links to the article. Anything I could not verify was left out rather
  than guessed at.
- Wikipedia responses are cached in `localStorage` for a day, so a walk around town does
  not re-fetch the same articles.

## Credit

Map data © OpenStreetMap contributors, tiles © CARTO, pedestrian routing by
[Valhalla](https://valhalla.readthedocs.io) via FOSSGIS. Article text from Wikipedia,
[CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/). Built with
[Leaflet](https://leafletjs.com).
