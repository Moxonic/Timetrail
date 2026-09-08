/* Curated Oslo dataset.
 *
 * Each entry is deliberately thin: a name, a location, when it matters, what it
 * belongs to, one or two sentences of orientation, and a Wikipedia handle.
 * The long-form detail is fetched live from Wikipedia at runtime (see wiki.js)
 * so the app stays small and the facts stay maintained by someone else.
 *
 * `from` / `to` are the years the *story* is about, not strictly the building's
 * life — Akershus is still standing, but its siege years are what you come for.
 * `to: null` means "still going".
 *
 * Coordinates are hand-placed from the map and are good to roughly a building,
 * not to a doorway.
 */
window.TT = window.TT || {};

TT.CITY = {
  id: 'oslo',
  name: 'Oslo',
  country: 'Norway',
  center: { lat: 59.9127, lng: 10.7461 },
  zoom: 14,
  langs: ['en', 'no'],
  tagline: 'A thousand years, walkable in an afternoon.'
};

TT.PLACES = [
  /* ---------- Viking Age & prehistory ---------- */
  {
    id: 'ekeberg-carvings',
    name: 'Ekeberg Rock Carvings',
    nameLocal: 'Helleristningene på Ekeberg',
    lat: 59.89571, lng: 10.76435,
    from: -5000, to: -1000,
    eras: ['viking'], themes: ['everyday', 'monument'],
    kind: 'site',
    blurb: 'Hunters\' figures cut into the rock on the ridge above the fjord, thousands of years before anyone thought to call this place Oslo. They are faint — the trick is to come with low sun.',
    tips: 'On the slope near Karlsborgveien, below Kongsveien, inside Ekebergparken. The panels are easy to walk straight past.',
    // English Wikipedia has no article on the carvings themselves, so it points at
    // the park that contains them; Norwegian has the exact one.
    wiki: { en: 'Ekebergparken Sculpture Park', no: 'Helleristningene på Ekeberg' }
  },
  {
    id: 'viking-ship-museum',
    name: 'Museum of the Viking Age',
    nameLocal: 'Vikingskipshuset',
    lat: 59.90464, lng: 10.68450,
    from: 800, to: null,
    eras: ['viking'], themes: ['explore', 'art'],
    kind: 'museum',
    blurb: 'Home of the Oseberg, Gokstad and Tune ships — burial vessels dug out of Norwegian clay and reassembled here. The building is closed while it is rebuilt into a much larger museum.',
    tips: 'Check opening status before crossing to Bygdøy: the rebuild has kept it shut for years.',
    wiki: { en: 'Viking Ship Museum (Oslo)', no: 'Vikingskipshuset' }
  },
  {
    id: 'folkemuseum',
    name: 'Norwegian Museum of Cultural History',
    nameLocal: 'Norsk Folkemuseum',
    lat: 59.90742, lng: 10.68470,
    from: 1200, to: null,
    eras: ['viking', 'medieval', 'christiania'], themes: ['everyday', 'faith'],
    kind: 'museum',
    blurb: 'An open-air town of relocated buildings, including the Gol stave church — a medieval timber church taken apart in Hallingdal and re-raised here in the 1880s.',
    tips: 'The stave church is at the top of the hill and worth the walk even if you skip the rest.',
    wiki: { en: 'Norsk Folkemuseum', no: 'Norsk Folkemuseum' }
  },

  /* ---------- Medieval Oslo ---------- */
  {
    id: 'middelalderparken',
    name: 'Medieval Park & St. Mary\'s Church ruins',
    nameLocal: 'Middelalderparken',
    lat: 59.90360, lng: 10.76720,
    from: 1050, to: 1536,
    eras: ['medieval'], themes: ['faith', 'power', 'royal'],
    kind: 'ruin',
    blurb: 'The floor plan of a royal church, laid out in low stone. This was the waterfront of the first Oslo — the pond beside it marks where the shoreline used to run.',
    tips: 'Stand at the west end and look towards the fjord: everything between you and the water today is landfill.',
    wiki: { en: 'St. Mary\'s Church, Oslo', no: 'Middelalderparken' }
  },
  {
    id: 'hallvard-cathedral',
    name: 'St. Hallvard\'s Cathedral ruins',
    nameLocal: 'Hallvardskatedralen',
    lat: 59.90520, lng: 10.76660,
    from: 1130, to: 1624,
    eras: ['medieval'], themes: ['faith', 'power'],
    kind: 'ruin',
    blurb: 'For four centuries this was the cathedral of Oslo and the shrine of the city\'s patron saint. Kings were buried here. Now it is knee-high walls in a quiet park.',
    tips: 'The ruins sit in Minneparken, wedged between roads — the contrast is the point.',
    wiki: { en: 'St. Hallvard\'s Cathedral', no: 'Hallvardskatedralen' }
  },
  {
    id: 'oslo-ladegard',
    name: 'Oslo Ladegård & the Bishop\'s Palace',
    nameLocal: 'Oslo ladegård',
    lat: 59.90430, lng: 10.76580,
    from: 1200, to: null,
    eras: ['medieval', 'christiania'], themes: ['faith', 'power'],
    kind: 'building',
    blurb: 'A baroque manor sitting directly on the vaulted cellars of the medieval bishop\'s residence — one building standing on the bones of another.',
    tips: 'The medieval cellars are only open on guided tours, but you can see the level change from outside.',
    wiki: { en: 'Oslo Ladegård', no: 'Oslo ladegård' }
  },
  {
    id: 'gamle-aker',
    name: 'Old Aker Church',
    nameLocal: 'Gamle Aker kirke',
    lat: 59.92430, lng: 10.74690,
    from: 1080, to: null,
    eras: ['medieval'], themes: ['faith'],
    kind: 'church',
    blurb: 'A Romanesque stone church from around 1100, and the oldest building still standing in Oslo. It has outlasted the entire city that was built around it.',
    tips: 'Walk up through Telthusbakken from Akerselva — the approach through the wooden houses is half the experience.',
    wiki: { en: 'Old Aker Church', no: 'Gamle Aker kirke' }
  },
  {
    id: 'hovedoya',
    name: 'Hovedøya Abbey ruins',
    nameLocal: 'Hovedøya kloster',
    lat: 59.89350, lng: 10.73050,
    from: 1147, to: 1532,
    eras: ['medieval'], themes: ['faith'],
    kind: 'ruin',
    // An island: no walking route reaches it, so the router must not pretend.
    reachBy: 'ferry',
    reachFrom: 'Vippetangen',
    blurb: 'Cistercian monks from England founded an abbey on this island in 1147. It was burned and dissolved at the Reformation; the shell sits in a meadow above the ferry quay.',
    tips: 'Ten minutes by public ferry from Vippetangen. Bring lunch — the island is a park.',
    wiki: { en: 'Hovedøya Abbey', no: 'Hovedøya kloster' }
  },

  /* ---------- Christiania & Danish rule ---------- */
  {
    id: 'akershus',
    name: 'Akershus Fortress',
    nameLocal: 'Akershus festning',
    lat: 59.90750, lng: 10.73650,
    from: 1290, to: null,
    eras: ['medieval', 'christiania', 'ww2'], themes: ['war', 'royal', 'power'],
    kind: 'fortress',
    blurb: 'Begun around 1300 to guard the fjord approach, never taken by a foreign siege, remodelled by Christian IV into a renaissance castle. It has been a royal seat, a prison, a Nazi headquarters and a place of execution.',
    tips: 'The grounds are open and free to walk. Go up to the ramparts for the view the cannons had.',
    wiki: { en: 'Akershus Fortress', no: 'Akershus festning' }
  },
  {
    id: 'christiania-torv',
    name: 'Christiania Torv & "the Glove"',
    nameLocal: 'Christiania torv',
    lat: 59.90860, lng: 10.74140,
    from: 1624, to: null,
    eras: ['christiania'], themes: ['power', 'monument'],
    kind: 'square',
    blurb: 'After the fire of 1624 the king moved the whole town here, under the fortress guns. A bronze glove points at the ground: legend has the king saying "the new town shall lie here".',
    tips: 'The square is the natural start of any walk through Kvadraturen.',
    wiki: { en: 'Christiania Torv', no: 'Christiania torv' }
  },
  {
    id: 'kvadraturen',
    name: 'Kvadraturen',
    nameLocal: 'Kvadraturen',
    lat: 59.90950, lng: 10.74200,
    from: 1624, to: null,
    eras: ['christiania'], themes: ['power', 'everyday'],
    kind: 'district',
    blurb: 'The rectangular street grid Christian IV imposed on the rebuilt city — the oldest surviving town plan in Oslo, and still legible in the block sizes.',
    tips: 'Look for the height of the older stone houses: the king ordered brick and stone to stop the next fire.',
    wiki: { en: 'Kvadraturen, Oslo', no: 'Kvadraturen' }
  },
  {
    id: 'gamle-radhus',
    name: 'Oslo Old City Hall',
    nameLocal: 'Oslo gamle rådhus',
    lat: 59.90890, lng: 10.74050,
    from: 1641, to: null,
    eras: ['christiania'], themes: ['power', 'everyday'],
    kind: 'building',
    blurb: 'The city\'s first purpose-built town hall, from 1641, later a theatre and now a restaurant. Small enough to remind you how small Christiania was.',
    tips: 'Nedre Slottsgate 1. The plaque is easy to miss above the door.',
    wiki: { en: 'Oslo Old City Hall', no: 'Oslo gamle rådhus' }
  },
  {
    id: 'domkirke',
    name: 'Oslo Cathedral',
    nameLocal: 'Oslo domkirke',
    lat: 59.91272, lng: 10.74600,
    from: 1697, to: null,
    eras: ['christiania'], themes: ['faith', 'royal'],
    kind: 'church',
    blurb: 'The city\'s third cathedral, consecrated in 1697 after the first two were lost with medieval Oslo. Royal weddings happen here — and in 2011 its railings disappeared under a field of roses.',
    tips: 'The painted ceiling is 20th-century work; the baroque pulpit and altarpiece are original.',
    wiki: { en: 'Oslo Cathedral', no: 'Oslo domkirke' }
  },
  {
    id: 'basarhallene',
    name: 'Basarhallene',
    nameLocal: 'Basarhallene',
    lat: 59.91310, lng: 10.74660,
    from: 1849, to: null,
    eras: ['christiania', 'industrial'], themes: ['commerce', 'everyday'],
    kind: 'market',
    blurb: 'Brick arcades curling around the cathedral, built in the mid-1800s to get the town\'s meat and fish trade off the open square and under cover. Oslo\'s first shopping centre, in effect.',
    tips: 'The arcade is a shortcut as well as a sight — walk through rather than around.',
    wiki: { en: 'Basarhallene', no: 'Basarhallene' }
  },
  {
    id: 'stortorvet',
    name: 'Stortorvet & the Christian IV statue',
    nameLocal: 'Stortorvet',
    lat: 59.91290, lng: 10.74580,
    from: 1736, to: null,
    eras: ['christiania', 'nation'], themes: ['commerce', 'monument', 'royal'],
    kind: 'square',
    blurb: 'The old market square, still selling flowers. The 19th-century statue of Christian IV stands with one arm out, and Oslo has cheerfully reinterpreted the gesture ever since.',
    tips: 'Market stalls in the morning; the square is at its best before the shops open.',
    wiki: { en: 'Stortorvet', no: 'Stortorvet' }
  },
  {
    id: 'engebret',
    name: 'Engebret Café',
    nameLocal: 'Engebret Café',
    lat: 59.90920, lng: 10.74010,
    from: 1857, to: null,
    eras: ['nation'], themes: ['everyday', 'art'],
    kind: 'building',
    blurb: 'Oslo\'s oldest restaurant, running since 1857, and for decades the canteen of the city\'s writers and painters. Ibsen and Munch both ate here.',
    tips: 'On Bankplassen, opposite the old national bank. You can look in without booking.',
    wiki: { en: 'Engebret Café', no: 'Engebret Café' }
  },

  /* ---------- Crown & Constitution, 1814–1905 ---------- */
  {
    id: 'slottet',
    name: 'The Royal Palace',
    nameLocal: 'Det kongelige slott',
    lat: 59.91690, lng: 10.72750,
    from: 1824, to: null,
    eras: ['nation'], themes: ['royal', 'power'],
    kind: 'palace',
    blurb: 'Built 1824–1849 for a king who was born a French commoner and ended up ruling Norway and Sweden. The park around it was never fenced — anyone can walk right up to the front steps.',
    tips: 'Changing of the guard at 13:30 daily. Summer guided tours are the only way inside.',
    wiki: { en: 'Royal Palace, Oslo', no: 'Det kongelige slott i Oslo' }
  },
  {
    id: 'karl-johan-statue',
    name: 'Karl Johan equestrian statue',
    nameLocal: 'Karl Johan-statuen',
    lat: 59.91650, lng: 10.72850,
    from: 1875, to: null,
    eras: ['nation'], themes: ['royal', 'monument'],
    kind: 'statue',
    blurb: 'The king who gave the main street its name, cast in bronze on the palace forecourt and looking straight down it. The whole avenue is essentially a sightline built for him.',
    tips: 'Stand at the statue and look east — the Parliament is deliberately at the far end.',
    wiki: { en: 'Charles XIV John', no: 'Karl Johan (statue)' }
  },
  {
    id: 'stortinget',
    name: 'The Storting (Parliament)',
    nameLocal: 'Stortinget',
    lat: 59.91270, lng: 10.74010,
    from: 1866, to: null,
    eras: ['nation', 'ww2'], themes: ['power'],
    kind: 'building',
    blurb: 'Opened in 1866, yellow brick and a round debating chamber. It faces the palace down Karl Johans gate — an argument between two kinds of authority, conducted in urban planning.',
    tips: 'Free guided tours on Saturdays outside session; queue at the visitor entrance.',
    wiki: { en: 'Storting building', no: 'Stortingsbygningen' }
  },
  {
    id: 'eidsvolls-plass',
    name: 'Eidsvolls plass & the Wergeland statue',
    nameLocal: 'Eidsvolls plass',
    lat: 59.91310, lng: 10.73760,
    from: 1814, to: null,
    eras: ['nation'], themes: ['power', 'monument', 'art'],
    kind: 'square',
    blurb: 'The lawn in front of Parliament, named for the manor where Norway\'s constitution was written in 1814. The poet Wergeland, who more or less invented the national day, stands at one end.',
    tips: 'On 17 May this space is the centre of the country. Any other day it is a park with a fountain.',
    wiki: { en: 'Eidsvolls plass', no: 'Eidsvolls plass' }
  },
  {
    id: 'nationaltheatret',
    name: 'National Theatre',
    nameLocal: 'Nationaltheatret',
    lat: 59.91390, lng: 10.73370,
    from: 1899, to: null,
    eras: ['nation'], themes: ['art'],
    kind: 'building',
    blurb: 'Opened in 1899 with Ibsen and Bjørnson both alive to see it, and both installed in bronze outside — flanking the doors like guarantors.',
    tips: 'The two statues are the fastest introduction to Norwegian literature you will get.',
    wiki: { en: 'National Theatre (Norway)', no: 'Nationaltheatret' }
  },
  {
    id: 'universitetsplassen',
    name: 'University Square & the Aula',
    nameLocal: 'Universitetsplassen',
    lat: 59.91530, lng: 10.73470,
    from: 1852, to: null,
    eras: ['nation', 'ww2', 'postwar'], themes: ['art', 'power', 'war'],
    kind: 'building',
    blurb: 'The old university buildings on Karl Johan. The hall behind them holds Munch\'s great murals, hosted the Nobel Peace Prize for four decades, and in 1943 saw its students arrested and deported.',
    tips: 'The Aula opens to the public only occasionally — check before you plan around it.',
    wiki: { en: 'University of Oslo', no: 'Universitetets aula' }
  },
  {
    id: 'grand-hotel',
    name: 'Grand Hotel & Grand Café',
    nameLocal: 'Grand Hotel',
    lat: 59.91370, lng: 10.73820,
    from: 1874, to: null,
    eras: ['nation', 'postwar'], themes: ['art', 'everyday'],
    kind: 'building',
    blurb: 'Ibsen walked here from his flat every day, at a time you could set a watch by, and sat at the same table. Nobel Peace Prize laureates still wave from the balcony above the street.',
    tips: 'The café mural along the wall is a group portrait of the city\'s 1890s regulars — find Ibsen in it.',
    wiki: { en: 'Grand Hotel (Oslo)', no: 'Grand Hotel (Oslo)' }
  },
  {
    id: 'ibsen-museum',
    name: 'Ibsen Museum & Home',
    nameLocal: 'Ibsenmuseet',
    lat: 59.91470, lng: 10.72640,
    from: 1895, to: 1906,
    eras: ['nation'], themes: ['art'],
    kind: 'museum',
    blurb: 'The apartment where Ibsen spent his last eleven years and died in 1906, restored to its colours. His study still has the desk facing away from the window.',
    tips: 'Arbins gate 1, a two-minute walk from the palace park. Entry by timed tour.',
    wiki: { en: 'Ibsen Museum (Oslo)', no: 'Ibsenmuseet i Oslo' }
  },
  {
    id: 'var-frelsers',
    name: 'Cemetery of Our Saviour',
    nameLocal: 'Vår Frelsers gravlund',
    lat: 59.92360, lng: 10.74770,
    from: 1808, to: null,
    eras: ['nation'], themes: ['art', 'everyday'],
    kind: 'cemetery',
    blurb: 'Opened during a cholera epidemic, later given a "Grove of Honour" where Ibsen, Bjørnson and Munch are buried within a few steps of each other.',
    tips: 'Æreslunden is the section nearest the chapel. Maps are posted at the gates.',
    wiki: { en: 'Cemetery of Our Saviour', no: 'Vår Frelsers gravlund' }
  },
  {
    id: 'frogner-hovedgard',
    name: 'Frogner Manor & Oslo City Museum',
    nameLocal: 'Frogner hovedgård',
    lat: 59.92650, lng: 10.70470,
    from: 1750, to: null,
    eras: ['christiania', 'nation'], themes: ['everyday', 'power'],
    kind: 'museum',
    blurb: 'The 18th-century farm whose land became Frogner Park. The city museum inside tells Oslo\'s own story, which is a good place to start or finish a week of walking.',
    tips: 'Inside Frogner Park, a minute from the Vigeland sculptures but almost always quiet.',
    wiki: { en: 'Frogner Manor', no: 'Frogner hovedgård' }
  },
  {
    id: 'oscarshall',
    name: 'Oscarshall',
    nameLocal: 'Oscarshall',
    lat: 59.91140, lng: 10.67970,
    from: 1852, to: null,
    eras: ['nation'], themes: ['royal', 'art'],
    kind: 'palace',
    blurb: 'A small neo-Gothic pleasure palace on the Bygdøy shore, built for Oscar I as a summer folly and stuffed with commissioned Norwegian art.',
    tips: 'Summer opening only, and the walk down from Bygdøy is part of it.',
    wiki: { en: 'Oscarshall', no: 'Oscarshall' }
  },

  /* ---------- Ships & exploration ---------- */
  {
    id: 'fram-museum',
    name: 'Fram Museum',
    nameLocal: 'Frammuseet',
    lat: 59.90340, lng: 10.69250,
    from: 1893, to: 1912,
    eras: ['nation'], themes: ['explore'],
    kind: 'museum',
    blurb: 'The polar ship Fram, indoors and whole, with a hull shaped to be squeezed upward by pack ice instead of crushed. It went further north and further south than any wooden ship.',
    tips: 'You can walk the decks. Go below to see how little space the crew actually had.',
    wiki: { en: 'Fram Museum', no: 'Frammuseet' }
  },
  {
    id: 'kon-tiki',
    name: 'Kon-Tiki Museum',
    nameLocal: 'Kon-Tiki Museet',
    lat: 59.90270, lng: 10.69190,
    from: 1947, to: null,
    eras: ['postwar'], themes: ['explore'],
    kind: 'museum',
    blurb: 'The balsa raft Thor Heyerdahl sailed from Peru to Polynesia in 1947 to prove a theory most of his colleagues rejected. The raft is here; the argument is still going.',
    tips: 'Next door to the Fram — do both in one crossing.',
    wiki: { en: 'Kon-Tiki Museum', no: 'Kon-Tiki Museet' }
  },

  /* ---------- Mills, workers, machines ---------- */
  {
    id: 'hjula-veveri',
    name: 'Hjula Weaving Mill & the Akerselva mills',
    nameLocal: 'Hjula Veveri',
    lat: 59.92700, lng: 10.75480,
    from: 1849, to: 1957,
    eras: ['industrial'], themes: ['labour'],
    kind: 'building',
    blurb: 'Brick mills stacked along a river that dropped fast enough to turn machinery. This stretch of the Akerselva was Norway\'s industrial revolution, and the river was the class border of the city.',
    tips: 'Walk the riverside path from Beyerbrua north — the mills come one after another.',
    wiki: { en: 'Akerselva', no: 'Hjula Veveri' }
  },
  {
    id: 'vulkan',
    name: 'Vulkan & Mathallen',
    nameLocal: 'Vulkan',
    lat: 59.92260, lng: 10.75130,
    from: 1873, to: null,
    eras: ['industrial', 'today'], themes: ['labour', 'commerce', 'everyday'],
    kind: 'district',
    blurb: 'An old ironworks yard that sat derelict for decades and reopened in the 2010s as a food hall and culture block — the standard second life of European industrial land, done well.',
    tips: 'Mathallen is the covered market; the climbing wall on the cliff behind is the giveaway that this was quarried ground.',
    wiki: { en: 'Vulkan, Oslo', no: 'Vulkan (Oslo)' }
  },
  {
    id: 'grunerlokka',
    name: 'Grünerløkka',
    nameLocal: 'Grünerløkka',
    lat: 59.92300, lng: 10.75900,
    from: 1860, to: null,
    eras: ['industrial', 'today'], themes: ['labour', 'everyday'],
    kind: 'district',
    blurb: 'Built fast in the 1800s as workers\' housing for the mills, condemned as slums in the 1960s, saved from demolition, and now the district everyone photographs.',
    tips: 'Olaf Ryes plass and Birkelunden are the two squares to aim for.',
    wiki: { en: 'Grünerløkka', no: 'Grünerløkka' }
  },
  {
    id: 'youngstorget',
    name: 'Youngstorget',
    nameLocal: 'Youngstorget',
    lat: 59.91470, lng: 10.74920,
    from: 1850, to: null,
    eras: ['industrial', 'postwar'], themes: ['labour', 'power'],
    kind: 'square',
    blurb: 'The square of the Norwegian labour movement: union headquarters on one side, the party on another, and the traditional destination of every May Day march.',
    tips: 'Look up at the building names around the square — they are the movement\'s own institutions.',
    wiki: { en: 'Youngstorget', no: 'Youngstorget' }
  },
  {
    id: 'ostbanehallen',
    name: 'Oslo Central Station & Østbanehallen',
    nameLocal: 'Østbanehallen',
    lat: 59.91110, lng: 10.75050,
    from: 1854, to: null,
    eras: ['industrial', 'today'], themes: ['labour', 'commerce', 'everyday'],
    kind: 'building',
    blurb: 'Norway\'s first railway ran from here to Eidsvoll in 1854. The ornate old East Station hall survives, swallowed by the modern terminal and refitted as bars and shops.',
    tips: 'Walk into the old hall from the west end — the roof is the reason to look up.',
    wiki: { en: 'Oslo Central Station', no: 'Oslo sentralstasjon' }
  },
  {
    id: 'bislett',
    name: 'Bislett Stadium',
    nameLocal: 'Bislett stadion',
    lat: 59.92700, lng: 10.73320,
    from: 1922, to: null,
    eras: ['industrial', 'postwar'], themes: ['everyday'],
    kind: 'building',
    blurb: 'A stadium in the middle of a residential block, host of the 1952 Winter Olympic skating and, for decades, the track where distance world records went to be broken.',
    tips: 'Rebuilt in 2005, so the bowl is new — the location wedged into the street grid is the historic part.',
    wiki: { en: 'Bislett Stadion', no: 'Bislett stadion' }
  },

  /* ---------- Shops, malls, markets ---------- */
  {
    id: 'steen-strom',
    name: 'Steen & Strøm',
    nameLocal: 'Steen & Strøm Magasin',
    lat: 59.91070, lng: 10.74150,
    from: 1797, to: null,
    eras: ['christiania', 'industrial', 'today'], themes: ['commerce'],
    kind: 'shop',
    blurb: 'Trading on this spot since 1797, which makes it Norway\'s oldest department store — a shop that predates the country\'s independence by more than a century.',
    tips: 'Kvadraturen\'s grid means it occupies a whole historic block; walk around the outside first.',
    wiki: { en: 'Steen & Strøm', no: 'Steen & Strøm' }
  },
  {
    id: 'glasmagasinet',
    name: 'Glasmagasinet',
    nameLocal: 'Glasmagasinet',
    lat: 59.91280, lng: 10.74490,
    from: 1739, to: null,
    eras: ['christiania', 'nation', 'today'], themes: ['commerce'],
    kind: 'shop',
    blurb: 'Descended from an 18th-century royal glassworks outlet, rebuilt as a grand store on Stortorvet around 1900. Generations of Oslo children have been taken to see its Christmas windows.',
    tips: 'On the corner of the old market square — the older shop-front detail is above eye level.',
    wiki: { en: 'Glasmagasinet', no: 'Glasmagasinet' }
  },
  {
    id: 'paleet',
    name: 'Paleet',
    nameLocal: 'Paleet',
    lat: 59.91340, lng: 10.73950,
    from: 1989, to: null,
    eras: ['today'], themes: ['commerce', 'royal'],
    kind: 'shop',
    blurb: 'A shopping arcade off Karl Johans gate that borrowed its name from Paléet — the mansion that served as the royal residence in Christiania before the palace existed, and was demolished in the 1920s.',
    tips: 'A mall with a king\'s address: the name is the only surviving part of the original building.',
    wiki: { en: 'Paléet', no: 'Paleet' }
  },
  {
    id: 'oslo-city',
    name: 'Oslo City',
    nameLocal: 'Oslo City',
    lat: 59.91180, lng: 10.75130,
    from: 1988, to: null,
    eras: ['postwar', 'today'], themes: ['commerce', 'everyday'],
    kind: 'shop',
    blurb: 'One of the first American-style indoor malls dropped into a Nordic city centre, in 1988, on the edge of a district then considered rough. It changed what the area around the station was for.',
    tips: 'Worth two minutes as a period piece even if you buy nothing — late-80s retail architecture, largely intact.',
    wiki: { en: 'Oslo City (shopping mall)', no: 'Oslo City' }
  },
  {
    id: 'aker-brygge',
    name: 'Aker Brygge',
    nameLocal: 'Aker Brygge',
    lat: 59.91050, lng: 10.72880,
    from: 1854, to: null,
    eras: ['industrial', 'postwar', 'today'], themes: ['labour', 'commerce'],
    kind: 'district',
    blurb: 'A shipyard for well over a century, employing thousands, closed in 1982. Within four years it was a shopping and dining quarter — the moment Oslo decided the waterfront was for people, not cranes.',
    tips: 'The preserved yard buildings are the brick ones; everything glass is from the redevelopment.',
    wiki: { en: 'Aker Brygge', no: 'Aker Brygge' }
  },

  /* ---------- Occupation, 1940–45 ---------- */
  {
    id: 'victoria-terrasse',
    name: 'Victoria Terrasse',
    nameLocal: 'Victoria terrasse',
    lat: 59.91260, lng: 10.72900,
    from: 1940, to: 1945,
    eras: ['ww2'], themes: ['war', 'power'],
    kind: 'building',
    blurb: 'The Gestapo headquarters in Norway, and a name that meant interrogation. Allied bombers struck it twice; both raids killed civilians in the streets around it. Today it houses the Foreign Ministry.',
    tips: 'An ordinary government block on a busy road — the absence of any drama at street level is the striking part.',
    wiki: { en: 'Victoria Terrasse', no: 'Victoria terrasse' }
  },
  {
    id: 'mollergata-19',
    name: 'Møllergata 19',
    nameLocal: 'Møllergata 19',
    lat: 59.91460, lng: 10.74770,
    from: 1940, to: 1945,
    eras: ['ww2'], themes: ['war'],
    kind: 'building',
    blurb: 'The city\'s police jail, taken over as a German prison. Thousands of Norwegians passed through it; prisoners scratched messages into the cell walls, some of which survive.',
    tips: 'A minute from Youngstorget. The building is unmarked from most angles.',
    wiki: { en: 'Møllergata 19', no: 'Møllergata 19' }
  },
  {
    id: 'akershuskaia',
    name: 'The deportation quay, Akershusstranda',
    nameLocal: 'Akershuskaia',
    lat: 59.90400, lng: 10.73950,
    from: 1942, to: 1942,
    eras: ['ww2'], themes: ['war'],
    kind: 'memorial',
    blurb: 'On 26 November 1942 more than five hundred Norwegian Jews were marched onto the ship Donau from this quay and sent to Auschwitz. Very few came back. A memorial marks the spot.',
    tips: 'Below the fortress on the harbour side. Quiet, exposed, and usually empty.',
    wiki: { en: 'DS Donau', no: 'Donau (skip)' }
  },
  {
    id: 'retterstedet',
    name: 'The execution ground, Akershus',
    nameLocal: 'Retterstedet på Akershus',
    lat: 59.90680, lng: 10.73520,
    from: 1941, to: 1945,
    eras: ['ww2'], themes: ['war'],
    kind: 'memorial',
    blurb: 'Members of the resistance were shot here inside the fortress walls. After the war the same ground was used for the execution of Vidkun Quisling, in October 1945.',
    tips: 'A small memorial stone on the harbour side of the fortress grounds.',
    wiki: { en: 'Akershus Fortress', no: 'Akershus festning' }
  },
  {
    id: 'hjemmefrontmuseet',
    name: 'Norway\'s Resistance Museum',
    nameLocal: 'Norges Hjemmefrontmuseum',
    lat: 59.90810, lng: 10.73600,
    from: 1940, to: 1945,
    eras: ['ww2'], themes: ['war'],
    kind: 'museum',
    blurb: 'Built into the fortress buildings a few steps from the execution ground, and made largely by the people who were in it. Dense, low-lit, and unusually personal for a war museum.',
    tips: 'Do this last on the occupation walk — it gathers up everything the other stops only hint at.',
    wiki: { en: 'Norway\'s Resistance Museum', no: 'Norges Hjemmefrontmuseum' }
  },
  {
    id: 'holmenkollen',
    name: 'Holmenkollen Ski Jump',
    nameLocal: 'Holmenkollbakken',
    lat: 59.96390, lng: 10.66840,
    from: 1892, to: null,
    eras: ['nation', 'ww2', 'today'], themes: ['everyday', 'monument'],
    kind: 'building',
    blurb: 'Competitions have been held on this hillside since 1892, and the jump has been rebuilt about twenty times. Under occupation it stayed a symbol precisely because it was not political.',
    tips: 'Metro line 1 to Holmenkollen, then a steep ten-minute walk up. The view is the payoff.',
    wiki: { en: 'Holmenkollbakken', no: 'Holmenkollbakken' }
  },

  /* ---------- Rebuilding & the present ---------- */
  {
    id: 'radhuset',
    name: 'Oslo City Hall',
    nameLocal: 'Oslo rådhus',
    lat: 59.91170, lng: 10.73330,
    from: 1931, to: null,
    eras: ['postwar'], themes: ['power', 'art'],
    kind: 'building',
    blurb: 'Started in 1931, interrupted by the war, opened in 1950 for the city\'s 900th birthday. Every surface inside is a commissioned mural about Norway. The Nobel Peace Prize has been awarded here since 1990.',
    tips: 'The main hall is free to enter and almost nobody does. Go in.',
    wiki: { en: 'Oslo City Hall', no: 'Oslo rådhus' }
  },
  {
    id: 'nobel-center',
    name: 'Nobel Peace Center',
    nameLocal: 'Nobels Fredssenter',
    lat: 59.91140, lng: 10.73070,
    from: 2005, to: null,
    eras: ['today'], themes: ['power', 'art'],
    kind: 'museum',
    blurb: 'The prize\'s own museum, installed in the old West Station — a railway terminus from 1872 whose tracks were lifted long ago.',
    tips: 'Between the City Hall and the harbour; combine with the Nobel ceremony hall itself.',
    wiki: { en: 'Nobel Peace Center', no: 'Nobels Fredssenter' }
  },
  {
    id: 'operahuset',
    name: 'Oslo Opera House',
    nameLocal: 'Operahuset',
    lat: 59.90750, lng: 10.75290,
    from: 2008, to: null,
    eras: ['today'], themes: ['art'],
    kind: 'building',
    blurb: 'A marble roof that slopes into the fjord and invites you to climb it. Opened in 2008 on what had been container quay, and it started the whole rebuilding of Bjørvika.',
    tips: 'Walk the roof at dusk. The view back at the city is the best free thing in Oslo.',
    wiki: { en: 'Oslo Opera House', no: 'Operahuset i Oslo' }
  },
  {
    id: 'munch',
    name: 'MUNCH',
    nameLocal: 'Munchmuseet',
    lat: 59.90580, lng: 10.75540,
    from: 2021, to: null,
    eras: ['today'], themes: ['art'],
    kind: 'museum',
    blurb: 'The artist left his entire remaining output to the city when he died; this leaning tower from 2021 is where it finally fits. Thirteen floors of one man.',
    tips: 'Start at the top and work down. The versions of The Scream rotate for conservation.',
    wiki: { en: 'Munch Museum', no: 'Munchmuseet' }
  },
  {
    id: 'deichman',
    name: 'Deichman Bjørvika',
    nameLocal: 'Deichman Bjørvika',
    lat: 59.91100, lng: 10.75150,
    from: 2020, to: null,
    eras: ['today'], themes: ['everyday', 'art'],
    kind: 'building',
    blurb: 'The main public library, rebuilt in 2020 as a building you are meant to hang around in rather than borrow from. The Future Library room holds manuscripts nobody may read until 2114.',
    tips: 'Free, warm, open late, with the best interior view of the station and the fjord.',
    wiki: { en: 'Deichman Library', no: 'Deichmanske bibliotek' }
  },
  {
    id: 'astrup-fearnley',
    name: 'Astrup Fearnley Museet',
    nameLocal: 'Astrup Fearnley Museet',
    lat: 59.90710, lng: 10.72050,
    from: 2012, to: null,
    eras: ['today'], themes: ['art'],
    kind: 'museum',
    blurb: 'Renzo Piano put a glass sail over a contemporary art collection at the tip of Tjuvholmen — an islet whose name means "thief islet", after what used to happen there.',
    tips: 'The sculpture park and the city beach outside are free.',
    wiki: { en: 'Astrup Fearnley Museet', no: 'Astrup Fearnley Museet' }
  },
  {
    id: 'barcode',
    name: 'The Barcode Project',
    nameLocal: 'Barcode',
    lat: 59.90810, lng: 10.75800,
    from: 2005, to: 2016,
    eras: ['today'], themes: ['power', 'everyday'],
    kind: 'district',
    blurb: 'A row of narrow towers of deliberately different heights, built on old railway land and argued about furiously for a decade. It is now simply what Oslo looks like from the fjord.',
    tips: 'Best seen end-on from the Opera roof, where the "barcode" effect actually works.',
    wiki: { en: 'Barcode Project', no: 'Barcode-rekka' }
  },
  {
    id: '22-juli',
    name: '22 July Centre & government quarter',
    nameLocal: '22. juli-senteret',
    lat: 59.91560, lng: 10.74190,
    from: 2011, to: null,
    eras: ['today'], themes: ['power', 'war'],
    kind: 'memorial',
    blurb: 'On 22 July 2011 a bomb went off in the government quarter and 77 people were killed that day, most of them teenagers on an island outside the city. The memorial centre documents it plainly.',
    tips: 'Small, sober, and free. Allow more time than the size suggests.',
    wiki: { en: '22 July Centre', no: '22. juli-senteret' }
  },
  {
    id: 'vigelandsparken',
    name: 'The Vigeland Park',
    nameLocal: 'Vigelandsanlegget',
    lat: 59.92690, lng: 10.70030,
    from: 1924, to: 1949,
    eras: ['nation', 'postwar'], themes: ['art', 'monument'],
    kind: 'park',
    blurb: 'More than two hundred sculptures of human bodies at every age, by one artist, in one park, made under a contract that gave the city everything he produced. The Monolith is 121 figures cut from a single block.',
    tips: 'Open always, free always. Early morning is the only time it is empty.',
    wiki: { en: 'Vigeland Park', no: 'Vigelandsanlegget' }
  },
  {
    id: 'ekebergparken',
    name: 'Ekebergparken',
    nameLocal: 'Ekebergparken',
    lat: 59.89770, lng: 10.76800,
    from: 2013, to: null,
    eras: ['today', 'ww2', 'viking'], themes: ['art', 'war', 'monument'],
    kind: 'park',
    blurb: 'A sculpture park on the ridge that also holds prehistoric carvings and the concrete remains of wartime anti-aircraft positions. Munch is said to have had the vision behind The Scream on this hillside.',
    tips: 'Tram 13 or 19 to Ekebergparken. Walk down into the city afterwards rather than back up.',
    wiki: { en: 'Ekebergparken Sculpture Park', no: 'Ekebergparken' }
  },
  {
    id: 'tigeren',
    name: '"Tigeren" — the Tiger',
    nameLocal: 'Tigeren',
    lat: 59.91120, lng: 10.75030,
    from: 2000, to: null,
    eras: ['today'], themes: ['monument', 'art'],
    kind: 'statue',
    blurb: 'A bronze tiger outside the central station, placed for the city\'s thousandth anniversary in 2000. The nickname "Tiger City" comes from a poem that meant it as an insult — a cold place that eats country people alive.',
    tips: 'The single most-photographed object in Oslo, and the default meeting point.',
    wiki: { en: 'Tigeren', no: 'Tigeren (skulptur)' }
  },
  {
    id: 'freia-uret',
    name: 'The Freia Clock',
    nameLocal: 'Freia-uret',
    lat: 59.91320, lng: 10.74200,
    from: 1909, to: null,
    eras: ['industrial', 'today'], themes: ['commerce', 'everyday', 'monument'],
    kind: 'sign',
    blurb: 'A rooftop sign that has been advertising chocolate over Karl Johans gate since 1909, and is now a protected heritage landmark in its own right. Oslo tells the time by it.',
    tips: 'Look up from Egertorget. At 120 m² it is the largest rooftop sign in Northern Europe.',
    wiki: { en: 'Freia (chocolate)', no: 'Freia' }
  },
  {
    id: 'egertorget',
    name: 'Egertorget',
    nameLocal: 'Egertorget',
    lat: 59.91315, lng: 10.74185,
    from: 1846, to: null,
    eras: ['nation', 'today'], themes: ['everyday', 'commerce'],
    kind: 'square',
    blurb: 'The busiest crossing on Karl Johans gate, and not actually a square: it is the leftover space created when the street was pushed through in 1846. Street musicians have claimed it ever since.',
    tips: 'Stand still for two minutes here and the whole city walks past you.',
    wiki: { en: 'Egertorget', no: 'Egertorget (Oslo)' }
  },
  {
    id: 'damstredet',
    name: 'Damstredet & Telthusbakken',
    nameLocal: 'Damstredet',
    lat: 59.92030, lng: 10.74810,
    from: 1800, to: null,
    eras: ['nation'], themes: ['everyday'],
    kind: 'district',
    blurb: 'Two crooked lanes of small wooden houses from the early 1800s that survived every fire regulation and every developer. This is what most of the city looked like before brick.',
    tips: 'People live here. Walk quietly, and go on up to Old Aker Church at the top.',
    wiki: { en: 'Damstredet', no: 'Damstredet' }
  },
  {
    id: 'botanisk-hage',
    name: 'Botanical Garden & Tøyen Manor',
    nameLocal: 'Botanisk hage',
    lat: 59.91840, lng: 10.77100,
    from: 1814, to: null,
    eras: ['nation'], themes: ['everyday', 'art'],
    kind: 'park',
    blurb: 'Norway\'s oldest botanical garden, laid out on a manor estate given to the new university in 1814 — the same year the country got its constitution.',
    tips: 'Free entry, and the shortcut between Grønland and Tøyen that locals actually use.',
    wiki: { en: 'Botanical Garden (Oslo)', no: 'Botanisk hage i Oslo' }
  }
];

/* ---------- Curated trails ----------
 * A trail is an ordered narrative. The recommender treats it as a strong hint,
 * not a rail: you can leave at any stop and it will pick you up wherever you go.
 */
TT.TRAILS = [
  {
    id: 'viking-medieval',
    name: 'Before the City',
    subtitle: 'Viking Age & medieval Oslo',
    era: 'medieval',
    blurb: 'Oslo began a kilometre downriver from where it is now, and burned down in 1624. This walk visits the parts that were left behind.',
    stops: ['ekeberg-carvings', 'middelalderparken', 'hallvard-cathedral', 'oslo-ladegard', 'gamle-aker', 'hovedoya', 'viking-ship-museum', 'folkemuseum']
  },
  {
    id: 'christiania',
    name: 'The King\'s Grid',
    subtitle: 'Christian IV\'s Christiania, 1624–1814',
    era: 'christiania',
    blurb: 'After the great fire a Danish king moved an entire town and drew it as a rectangle. You are still walking on his drawing.',
    stops: ['akershus', 'christiania-torv', 'kvadraturen', 'gamle-radhus', 'steen-strom', 'domkirke', 'basarhallene', 'stortorvet']
  },
  {
    id: 'crown',
    name: 'Crown & Constitution',
    subtitle: 'Building a capital, 1814–1905',
    era: 'nation',
    blurb: 'A palace at one end, a parliament at the other, and a national culture deliberately constructed in between.',
    stops: ['eidsvolls-plass', 'stortinget', 'grand-hotel', 'universitetsplassen', 'nationaltheatret', 'karl-johan-statue', 'slottet', 'ibsen-museum', 'var-frelsers']
  },
  {
    id: 'occupation',
    name: 'The Occupied City',
    subtitle: '1940–1945',
    era: 'ww2',
    blurb: 'Five years that are almost invisible at street level. This walk is mostly ordinary buildings, which is exactly the point.',
    stops: ['mollergata-19', 'victoria-terrasse', 'universitetsplassen', 'akershuskaia', 'retterstedet', 'hjemmefrontmuseet', 'ekebergparken']
  },
  {
    id: 'mills',
    name: 'Mills, Workers & Machines',
    subtitle: 'The industrial city, 1840–1940',
    era: 'industrial',
    blurb: 'Follow the river that powered Norway\'s industry and split the city into an east and a west it has never quite undone.',
    stops: ['ostbanehallen', 'youngstorget', 'vulkan', 'hjula-veveri', 'grunerlokka', 'bislett', 'aker-brygge']
  },
  {
    id: 'modern',
    name: 'Turning to the Fjord',
    subtitle: 'Oslo rebuilt, 1950 → now',
    era: 'today',
    blurb: 'For a century the waterfront was cranes and containers. In twenty years the city turned around to face the water.',
    stops: ['radhuset', 'nobel-center', 'astrup-fearnley', 'aker-brygge', 'operahuset', 'munch', 'deichman', 'barcode', '22-juli']
  },
  {
    id: 'shops',
    name: 'Market Day',
    subtitle: 'Shops, arcades and malls, 1739 → now',
    era: 'commerce',
    blurb: 'Where a city buys things, and what its shopping buildings say about it — from an open market square to an 80s mall.',
    stops: ['stortorvet', 'basarhallene', 'glasmagasinet', 'steen-strom', 'paleet', 'oslo-city', 'ostbanehallen', 'aker-brygge', 'vulkan']
  },
  {
    id: 'statues',
    name: 'Bronze & Stone',
    subtitle: 'Statues, parks and the stories behind them',
    era: 'monument',
    blurb: 'Every statue is an argument someone won. This walk reads the arguments.',
    stops: ['tigeren', 'stortorvet', 'eidsvolls-plass', 'karl-johan-statue', 'vigelandsparken', 'frogner-hovedgard', 'var-frelsers', 'ekebergparken']
  },
  {
    id: 'bygdoy',
    name: 'Ships & Kings',
    subtitle: 'The Bygdøy museum peninsula',
    era: 'explore',
    blurb: 'One ferry, one afternoon, and three ships that each changed what people thought was possible — plus a stave church and a king\'s summer folly.',
    stops: ['viking-ship-museum', 'folkemuseum', 'oscarshall', 'fram-museum', 'kon-tiki']
  },
  {
    id: 'greatest-hits',
    name: 'First Day in Oslo',
    subtitle: 'The unmissable ones, in a sensible order',
    era: null,
    blurb: 'If you only have one day: the main sights, arranged so you are never doubling back.',
    stops: ['operahuset', 'deichman', 'domkirke', 'stortinget', 'slottet', 'nationaltheatret', 'radhuset', 'nobel-center', 'akershus', 'vigelandsparken']
  }
];

TT.placeById = function (id) {
  return TT.PLACES.find(function (p) { return p.id === id; }) || null;
};

TT.trailById = function (id) {
  return TT.TRAILS.find(function (t) { return t.id === id; }) || null;
};

/* Which curated trails contain this place. */
TT.trailsFor = function (placeId) {
  return TT.TRAILS.filter(function (t) { return t.stops.indexOf(placeId) !== -1; });
};
