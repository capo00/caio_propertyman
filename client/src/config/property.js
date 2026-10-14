// Základní údaje o nemovitosti. Tvar drží budoucí entitu `property` (design.md § 6),
// takže ve v3 se import vymění za Call.cmdGet("property/get") a stránky se nepřepisují.
//
// Texty (název, tagline, headline, perex, popis, popisky statistik a podmínek) jsou
// v client/src/lsi/<lang>.json pod "property", "stats" a "reservationTerms". Tady zůstávají
// jen údaje, které se nepřekládají -- adresa, souřadnice, kapacita, časy a čísla.
//
// Kapacita a adresa odpovídají skutečné roubence (Libošovice 6) podle inzerátu
// na e-chalupy.cz: 9 lůžek + 1 přistýlka ve 3 podkrovních ložnicích.
//
// `gps` je bod u domu: 2026-10-14 ověřený proti poloze od vlastníka (rozdíl asi 5 m),
// vlastník ho nechal, jak je. Jediný zdroj souřadnic -- čte ho mapa (contact/map.jsx)
// i strukturovaná data (config/seo-files.js).

export default {
  address: {
    street: "Libošovice 6",
    zip: "507 44",
    city: "Libošovice",
    gps: { lat: 50.49033097159986, lng: 15.163830025845405 },
  },

  // `beds` je počet pevných lůžek; přistýlka se počítá zvlášť, protože ji host dostane
  // jen na vyžádání. Strop formuláře (beds + extraBeds) drží server/config.js `capacity.max`.
  capacity: { beds: 9, extraBeds: 1, bedrooms: 3 },
  checkIn: "15:00",
  checkOut: "10:00",

  // Pruh se statistikami pod hero. `value` je schválně string -- jsou tam jednotky i mezery
  // v číslech ("9 + 1"), takže formátovat se to bude stejně ručně. Popisek je pod
  // "stats.<code>" v LSI.
  stats: [
    { code: "beds", value: "9 + 1" },
    { code: "bedrooms", value: "3" },
    { code: "checkIn", value: "self", label: "check-in" },
    { code: "kost", value: "3 km" },
  ],

  // Podmínky vypsané u rezervačního formuláře; texty jsou pod "reservationTerms.<code>".
  reservationTerms: ["checkInOut", "deposit", "cancellation"],
};
