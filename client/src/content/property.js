// Základní údaje o nemovitosti. Tvar drží budoucí entitu `property` (design.md § 6),
// takže ve v3 se import vymění za Call.cmdGet("property/get") a stránky se nepřepisují.
//
// Texty (název, tagline, headline, perex, popis, popisky statistik a podmínek) jsou
// v client/src/lsi/<lang>.json pod "property", "stats" a "reservationTerms". Tady zůstávají
// jen údaje, které se nepřekládají -- adresa, souřadnice, kapacita, časy a čísla.
//
// TODO OBSAH: všechno níž je placeholder z Lovable předlohy (ux/), ne skutečné údaje.
// Adresa, GPS i kapacita se musí před ostrým provozem přepsat.

export default {
  address: {
    street: "Libošovice 74",
    zip: "507 44",
    city: "Libošovice",
    gps: { lat: 50.4747, lng: 15.1725 },
  },

  capacity: { beds: 8, bedrooms: 4 },
  checkIn: "15:00",
  checkOut: "10:00",

  // Pruh se statistikami pod hero. `value` je schválně string -- jsou tam jednotky i mezery
  // v číslech ("1 200 m²"), takže formátovat se to bude stejně ručně. Popisek je pod
  // "stats.<code>" v LSI.
  stats: [
    { code: "beds", value: "8" },
    { code: "bedrooms", value: "4" },
    { code: "garden", value: "1 200 m²" },
    { code: "castle", value: "4 km" },
  ],

  // Podmínky vypsané u rezervačního formuláře; texty jsou pod "reservationTerms.<code>".
  reservationTerms: ["checkInOut", "deposit", "cancellation"],
};
