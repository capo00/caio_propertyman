// Places in the surroundings. The shape follows the future `attraction` entity (design.md § 6).
//
// `distanceKm` is a NUMBER, not the text "4 km" -- the component adds the unit. Otherwise it
// could not be sorted or filtered once it comes from the DB.
//
// Names and descriptions are in client/src/lsi/<lang>.json under "attractions.<code>".
//
// MIND THE NUMBERS: Kost 2.5 km is confirmed by the owner from a hiking map (2026-10-22) and the
// stats strip under the hero takes it from here (config/property.js). The rest are ESTIMATES of
// the road distance from Libošovice (on foot for Plakánek). A guest reads them as a promise --
// check them on a map before going live.
//
// `url` (owner, 2026-09-29) -- the official page of the place; the whole tile links to it in
// a NEW window (AttractionCard). `kingdomCome` is a tip, not a place on the map, and has no URL --
// it stays without a link.

export default [
  { code: "vesec", category: "culture", distanceKm: 2, order: 10, url: "https://www.geoparkceskyraj.cz/dr-cs/4246-vesnicka-pamatkova-rezervace-vesec-u-sobotky.html" },
  { code: "plakanek", category: "nature", distanceKm: 2.3, order: 20, url: "https://www.geoparkceskyraj.cz/dr-cs/23665-naucna-stezka-plakanek.html" },
  { code: "kost", category: "culture", distanceKm: 2.5, order: 30, url: "https://www.kost-hrad.cz/" },
  { code: "humprecht", category: "culture", distanceKm: 3, order: 40, url: "https://www.humprecht.cz/" },
  { code: "trosky", category: "nature", distanceKm: 9, order: 50, url: "https://hrad-trosky.cz/" },
  { code: "hrubaSkala", category: "nature", distanceKm: 10, order: 60, url: "https://hrubaskala.info/" },
  { code: "prachovskeSkaly", category: "nature", distanceKm: 12, order: 70, url: "https://www.prachovskeskaly.cz/" },
  { code: "kingdomCome", category: "games", order: 80 },
];
