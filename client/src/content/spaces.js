// Prostory roubenky -- rozcestník /ubytovani a detailní routy /ubytovani/<code>.
// Tvar drží budoucí entitu `space` (design.md § 6), takže ve v3 se import vymění
// za Call.cmdGet("space/list") a stránky se nepřepisují.
//
// Texty (název, perex, popis, názvy a popisy jednotek) jsou v client/src/lsi/<lang>.json
// pod "spaces.<code>". Tady zůstává jen to, co není jazykové.
//
// Vazby ven, ne kopie dat:
//   `galleryCodes`  -- kódy z content/gallery.js (fotky prostoru; prázdné pole = zatím žádné,
//                      detail vykreslí Photo placeholder se `placeholderTone`)
//   `amenityCodes`  -- kódy z content/amenities.js (vybavení prostoru)
//   `units`         -- pojmenované části prostoru (ložnice), když je co rozepsat
//
// POZOR: kódy v obou polích musí existovat ve svých souborech, jinak se dlaždice ani fotka
// prostě nevykreslí a nikdo si toho nevšimne. Obráceně to hlídané je: amenita bez `space`
// je schválně "obecná" a patří na rozcestník (viz components/sections/about.jsx).
//
// Obsah odpovídá skutečné roubence (Libošovice 6) -- stejný zdroj jako amenities.js:
// inzerát na e-chalupy.cz a doplnění od vlastníka. Sauna ani oplocená zahrada tu nejsou,
// zato stodola (pingpong + fotbálek) a špejchar jako kryté posezení.

export default [
  {
    code: "loznice",
    order: 10,
    icon: "uugdsstencil-home-home",
    galleryCodes: ["atticBedroom", "secondBedroom"],
    amenityCodes: ["beds"],
    placeholderTone: "muted",
    // Devět pevných lůžek ve třech podkrovních ložnicích; přistýlka se počítá zvlášť
    // (content/property.js -> capacity.extraBeds), protože je jen na vyžádání.
    units: [
      { code: "manzelska1", order: 10, beds: 2 },
      { code: "manzelska2", order: 20, beds: 2 },
      { code: "petiluzkova", order: 30, beds: 5 },
    ],
  },
  {
    code: "kuchyne",
    order: 20,
    icon: "uugdsstencil-home-coffee",
    galleryCodes: ["kitchen", "diningArea", "livingRoom"],
    amenityCodes: ["kitchen"],
    placeholderTone: "sand",
    units: [],
  },
  {
    code: "koupelny",
    order: 30,
    icon: "uugdsstencil-weather-waterdrop",
    galleryCodes: [],
    amenityCodes: ["bathrooms"],
    placeholderTone: "muted",
    units: [],
  },
  {
    code: "deti",
    order: 40,
    icon: "uugdsstencil-user-kid",
    galleryCodes: [],
    amenityCodes: ["babies"],
    placeholderTone: "sand",
    units: [],
  },
  {
    code: "stodola",
    order: 50,
    icon: "uugdsstencil-education-game",
    galleryCodes: [],
    amenityCodes: ["barn"],
    placeholderTone: "muted",
    units: [],
  },
  {
    code: "dvorek",
    order: 60,
    icon: "uugdsstencil-weather-fire",
    galleryCodes: ["exterior", "annex", "facade"],
    amenityCodes: ["granary", "fire"],
    placeholderTone: "forest",
    units: [],
  },
];
