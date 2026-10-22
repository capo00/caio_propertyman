// Basic property data. The shape follows the future `property` entity (design.md § 6),
// so in v3 the import is swapped for Call.cmdGet("property/get") and the pages are not rewritten.
//
// Texts (name, tagline, headline, perex, description, stat and terms labels) are
// in client/src/lsi/<lang>.json under "property", "stats" and "reservationTerms". Only data
// that is not translated stays here -- address, coordinates, capacity, times and numbers.
//
// Capacity and address match the real cottage (Libošovice 6) according to the listing
// on e-chalupy.cz: 9 beds + 1 extra bed in 3 attic bedrooms.
//
// `gps` is a point by the house: 2026-10-14 verified against the location from the owner (about 5 m apart),
// the owner left it as is. The single source of coordinates -- read by the map (contact/map.jsx)
// and the structured data (config/seo-files.js).

export default {
  address: {
    street: "Libošovice 6",
    zip: "507 44",
    city: "Libošovice",
    gps: { lat: 50.49033097159986, lng: 15.163830025845405 },
  },

  // `beds` is the number of fixed beds; the extra bed is counted separately because the guest gets it
  // only on request. The form cap (beds + extraBeds) is held by server/config.js `capacity.max`.
  capacity: { beds: 9, extraBeds: 1, bedrooms: 3 },
  checkIn: "15:00",
  checkOut: "10:00",

  // Stats strip below the hero. `value` is a string on purpose -- it contains units and spaces
  // in numbers ("9 + 1"), so it would be formatted by hand anyway. The label is under
  // "stats.<code>" in LSI.
  stats: [
    { code: "beds", value: "9 + 1" },
    { code: "bedrooms", value: "3" },
    { code: "checkIn", value: "self", label: "check-in" },
    // Distance from the Kost card on the surroundings page (one source; it used to say 3 km here).
    { code: "kost", attraction: "kost" },
  ],

  // Terms listed by the reservation form; the texts are under "reservationTerms.<code>".
  reservationTerms: ["checkInOut", "deposit", "cancellation"],
};
