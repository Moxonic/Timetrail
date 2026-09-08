/* The small stuff.
 *
 * This is the layer that answers "what is that, and why is it like that" —
 * the meaning of a nickname, the reason a square is the wrong shape, what a
 * sign was advertising in 1909. Kept separate from data-oslo.js because it
 * grows differently: places are a map, trivia is a scrapbook.
 *
 * Keyed by place id. `source` names the Wikipedia article the detail comes
 * from, so anything here can be checked rather than taken on trust.
 */
window.TT = window.TT || {};

TT.TRIVIA = {
  'freia-uret': [
    {
      text: 'On the evening of 23 December 1909 this became the first illuminated advertisement in Europe: the Freia logo and the single word "Chokolade", glowing over Karl Johans gate from the roof of Thunegården.',
      source: { no: 'Freia' }
    },
    {
      text: 'In 1922 it learned to move. Two marabou storks were added, with a strip of bulbs switching on and off so that a packet of cocoa appeared to be thrown from one bird to the other.',
      source: { no: 'Freia' }
    },
    {
      text: 'The clock only arrived in 1925, replacing the storks\' game. The storks themselves hung on until 1956, when the first neon tubes went up. In 2012 the neon was replaced by ten thousand LEDs.',
      source: { no: 'Freia' }
    },
    {
      text: 'Freia was founded in 1889 and was Norway\'s largest chocolate maker until it was absorbed into what is now Mondelēz in 1993. The sign is protected as a heritage monument.',
      source: { no: 'Freia' }
    }
  ],

  'egertorget': [
    {
      text: 'Egertorget is not really a square at all. It is the gap left over when the 1846 street plan connected the road to the palace with the old Østre Gade, and a building called Stabellgården was demolished to join them up.',
      source: { no: 'Egertorget (Oslo)' }
    },
    {
      text: 'The name comes from the family that owned the property to the west — the merchant Ole Eger, and later his nephews Herman and Thorvald Eger, who were brewers.',
      source: { no: 'Egertorget (Oslo)' }
    }
  ],

  'tigeren': [
    {
      text: 'The tiger is not decoration, it is a reply. "Tigerstaden", the Tiger City, was a nickname coined in the second half of the 1800s for a place seen as cold and hostile to strangers, full of temptations and dangers.',
      source: { no: 'Tigerstaden' }
    },
    {
      text: 'By the time the sculpture went up for the city\'s thousandth anniversary in 2000, Oslo had decided to take the insult as a compliment and cast it in bronze.',
      source: { no: 'Tigerstaden' }
    }
  ],

  'deichman': [
    {
      text: 'One room here holds books nobody alive is allowed to read. The Future Library collects one unpublished manuscript a year from 2014 to 2114; they are sealed here until the whole set is printed.',
      source: { no: 'Framtidsbiblioteket' }
    },
    {
      text: 'The paper already exists as a forest. A thousand trees were planted in Nordmarka, north of the city, to be felled in 2114 and pulped for the hundred-book edition.',
      source: { no: 'Framtidsbiblioteket' }
    }
  ],

  'operahuset': [
    { text: 'The roof is not a viewing platform that happens to be walkable — it was designed as a public square that the building sits under. There is no ticket and no closing time.' },
    { text: 'The marble was chosen to change colour as it weathers and as the light moves, so the building is a slightly different white in January than in June.' }
  ],

  'radhuset': [
    { text: 'It took nineteen years to finish. Ground was broken in 1931, the war stopped everything, and it finally opened in 1950 — timed for the city\'s 900th birthday.' },
    { text: 'The Nobel Peace Prize has been handed over in the main hall every December since 1990. Before that the ceremony was held in the university\'s assembly hall up the road.' }
  ],

  'vigelandsparken': [
    { text: 'Vigeland made a deal with the city: it gave him a studio and a home, and in exchange it got everything he produced for the rest of his life. The studio is now the museum across the road.' },
    { text: 'The Monolith is one piece of granite with 121 human figures carved into it. Three stonecutters worked on it for roughly fourteen years.' }
  ],

  'akershus': [
    { text: 'No foreign army ever took it. Its record was broken from the inside, in 1940, when it was surrendered without a fight.' },
    { text: 'Vidkun Quisling was executed inside these walls in October 1945, on the same ground the occupiers had used for executing members of the resistance.' }
  ],

  'stortorvet': [
    { text: 'Christian IV\'s statue has one arm outstretched, supposedly indicating where the rebuilt city should stand. Oslo has spent a century inventing ruder explanations for the gesture.' }
  ],

  'aker-brygge': [
    { text: 'Akers mekaniske verksted built ships on this water for well over a century and employed thousands. It closed in 1982; the first shops opened in 1986. Four years turned a shipyard into a promenade.' }
  ],

  'ostbanehallen': [
    { text: 'Norway\'s first railway left from here in 1854, running north to Eidsvoll. It was built largely with British capital and British engineering.' }
  ],

  'grand-hotel': [
    { text: 'Ibsen walked here from his flat at the same hour every day, sat at the same table, and read the papers. People genuinely did use him to check the time.' },
    { text: 'Every December the new Nobel Peace Prize laureate appears on the balcony above the street to watch the torchlight procession.' }
  ],

  'astrup-fearnley': [
    { text: 'Tjuvholmen means "thief islet". The name is not decorative — this was where the city dealt with people it had convicted.' }
  ],

  'gamle-aker': [
    { text: 'It is roughly nine hundred years old and still an ordinary parish church with ordinary Sunday services. Nothing about it is presented as a monument.' }
  ],

  'hovedoya': [
    { text: 'The monks were English, sent from Kirkstead in Lincolnshire in 1147. The abbey was dissolved and burned during the Reformation, and the island later became a military store — which is why it was never built over.' }
  ],

  'middelalderparken': [
    { text: 'The strip of water beside the ruins is not a pond, it is a marker. It traces where the shoreline ran in the Middle Ages; everything between it and the fjord today is landfill.' }
  ],

  'domkirke': [
    { text: 'After the attacks of 22 July 2011 the railings and the square outside disappeared under a sea of roses left by people who simply turned up. The images went around the world.' }
  ],

  'holmenkollen': [
    { text: 'The jump has been demolished and rebuilt close to twenty times since 1892. What is protected here is not a structure but a place — the hill keeps its identity while the thing on it is replaced.' }
  ],

  'bislett': [
    { text: 'For decades this was where middle-distance world records went to be broken; the track had a reputation among runners the way a concert hall has one among musicians.' }
  ],

  'steen-strom': [
    { text: 'It has been trading on this spot since 1797 — eighteen years before Norway had its own constitution, and while the city was still called Christiania.' }
  ],

  'paleet': [
    { text: 'The mall is named after a building that no longer exists. Paléet was a grand mansion that served as the royal residence in Christiania before there was a palace; it was pulled down in the 1920s.' }
  ],

  'glasmagasinet': [
    { text: 'It began as the retail outlet of a royal glassworks in the 1700s, which is why a department store is named "the glass warehouse".' }
  ],

  'oslo-city': [
    { text: 'When it opened in 1988 an enclosed American-style mall in the centre of a Nordic capital was genuinely controversial. The argument about what it did to the streets around it has never really stopped.' }
  ],

  'var-frelsers': [
    { text: 'The cemetery was opened in a hurry during a cholera epidemic. The Grove of Honour came later, and put Ibsen, Bjørnson and Munch within a short walk of one another.' }
  ],

  'universitetsplassen': [
    { text: 'Munch\'s murals in the assembly hall were controversial enough when new that the university argued about them for years before hanging them.' },
    { text: 'The Nobel Peace Prize was awarded in that hall from 1947 until 1989, which is why the room appears in so many black-and-white photographs of laureates.' }
  ],

  'kon-tiki': [
    { text: 'Heyerdahl could not swim well and had a lifelong fear of water. He crossed roughly eight thousand kilometres of the Pacific on a raft anyway.' }
  ],

  'fram-museum': [
    { text: 'The hull is rounded rather than keeled, so that pack ice squeezing against it lifts the ship instead of crushing it. The idea was considered close to lunacy before it worked.' }
  ],

  'mollergata-19': [
    { text: 'Prisoners scratched names, dates and messages into the cell walls. Some of that writing has been preserved exactly where it was made.' }
  ],

  'akershuskaia': [
    { text: 'The ship was the DS Donau and the date was 26 November 1942. Of the more than five hundred Jews taken from this quay, a very small number survived.' }
  ],

  'barcode': [
    { text: 'The name is a nickname that stuck. The point of the design was the gaps — narrow slots between the towers so that the districts behind still get a view of the fjord.' }
  ],

  'damstredet': [
    { text: 'These wooden houses survived because the area was poor and unfashionable for long enough that nobody bothered to redevelop it. Preservation by neglect.' }
  ],

  'botanisk-hage': [
    { text: 'The estate was handed to the new university in 1814 — the same year Norway wrote its constitution. Founding a botanical garden was treated as part of founding a country.' }
  ],

  'hjula-veveri': [
    { text: 'The Akerselva was the city\'s class border as well as its power source. "The other side of the river" is still shorthand in Oslo for something more than geography.' }
  ],

  'youngstorget': [
    { text: 'Nearly every institution of the Norwegian labour movement — the unions, the party, the newspaper, the meeting hall — put its headquarters on or around this one small square.' }
  ],

  'munch': [
    { text: 'Munch left the city everything still in his possession when he died in 1944: thousands of paintings, prints, drawings and letters. This building exists because that bequest had nowhere to fit.' }
  ],

  '22-juli': [
    { text: 'The centre is deliberately plain and deliberately small. It documents what happened rather than interpreting it, and it stands where the bomb went off.' }
  ],

  'ekeberg-carvings': [
    { text: 'These are hunters\' carvings from the older Stone Age, on a slope below Kongsveien. They are thousands of years older than the city, the fortress, and the language now spoken around them.',
      source: { no: 'Helleristningene på Ekeberg' } }
  ],

  'ekebergparken': [
    { text: 'Munch placed the moment behind The Scream on this hillside — walking with two friends as the sky turned red over the fjord. The view is still there.' }
  ],

  'christiania-torv': [
    { text: 'The bronze hand pointing at the cobbles is a monument to a sentence. The king is said to have declared "the new town shall lie here" — and the glove marks the spot he indicated.' }
  ],

  'nationaltheatret': [
    { text: 'Ibsen and Bjørnson were both still alive when their statues were put up outside. Being memorialised in bronze while you can walk over and look at it is an unusual honour.' }
  ]
};

/* Fold the trivia into the place records once, at load. */
TT.applyTrivia = function () {
  var attached = 0, orphans = [];
  Object.keys(TT.TRIVIA).forEach(function (id) {
    var place = TT.placeById(id);
    if (!place) { orphans.push(id); return; }
    place.trivia = TT.TRIVIA[id];
    attached += place.trivia.length;
  });
  return { attached: attached, orphans: orphans };
};

TT.applyTrivia();
