// Základní údaje o nemovitosti. Tvar drží budoucí entitu `property` (design.md § 6),
// takže ve v3 se import vymění za Call.cmdGet("property/get") a stránky se nepřepisují.
//
// TODO OBSAH: všechno níž je placeholder z Lovable předlohy (ux/), ne skutečné údaje.
// Adresa, GPS i kapacita se musí před ostrým provozem přepsat.

export default {
  name: { cs: "Roubenka Libošovice" },
  region: { cs: "Český ráj" },

  tagline: { cs: "Libošovice · srdce Českého ráje" },
  headline: { cs: "Roubenka, kde se čas měří praskáním dřeva" },
  perex: {
    cs: "Stoletá roubená chalupa pro 8 osob se saunou, terasou s ohništěm a skalními městy za humny.",
  },

  about: {
    cs:
      "Roubenka stojí na kraji vesnice, zády k lesu a čelem do údolí. Uvnitř je světnice " +
      "s kamny, velký stůl pro celou partu a čtyři ložnice v podkroví i přízemí. Za domem " +
      "je oplocená zahrada s ohništěm, saunou a studenou kádí.",
  },

  address: {
    street: "Libošovice 74",
    zip: "507 44",
    city: "Libošovice",
    region: { cs: "Český ráj" },
    gps: { lat: 50.4747, lng: 15.1725 },
  },

  capacity: { beds: 8, bedrooms: 4 },
  checkIn: "15:00",
  checkOut: "10:00",

  // Pruh se statistikami pod hero. `value` je schválně string -- jsou tam jednotky i mezery
  // v číslech ("1 200 m²"), takže formátovat se to bude stejně ručně.
  stats: [
    { value: "8", label: { cs: "Lůžek" } },
    { value: "4", label: { cs: "Ložnice" } },
    { value: "1 200 m²", label: { cs: "Zahrada" } },
    { value: "4 km", label: { cs: "Na hrad Kost" } },
  ],

  // Podmínky vypsané u rezervačního formuláře.
  reservationTerms: [
    { cs: "Příjezd od 15:00 · odjezd do 10:00" },
    { cs: "Záloha 50 % po potvrzení termínu" },
    { cs: "Storno zdarma do 30 dnů před příjezdem" },
  ],
};
