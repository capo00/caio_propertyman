// Prostory roubenky -- rozcestník /ubytovani a detailní routy /ubytovani/<code>.
// Tvar drží budoucí entitu `space` (design.md § 6), takže ve v3 se import vymění
// za Call.cmdGet("space/list") a stránky se nepřepisují.
//
// Texty (název, perex, popis, názvy a popisy jednotek) jsou v client/src/lsi/<lang>.json
// pod "spaces.<code>". Tady zůstává jen to, co není jazykové.
//
// Vazby ven, ne kopie dat:
//   `galleryCodes`  -- kódy z components/gallery/content.js (fotky prostoru; prázdné pole =
//                      zatím žádné, detail vykreslí Photo placeholder se `placeholderTone`).
//                      Prostor s `units` je nemá: fotky jsou u jednotek (`unit.galleryCodes`)
//   `amenityCodes`  -- kódy z ./amenities.js (vybavení prostoru)
//   `units`         -- místnosti prostoru (ložnice, koupelny), každá je v detailu vlastní sekce s fotkami;
//                      `hasDescription` říká, že má pod nadpisem text (lůžka) v lsi `units.<code>.description`
//   `slug`          -- adresa detailu v každém jazyce webu (/ubytovani/predsin, /en/accommodation/hall),
//                      bez diakritiky; kód zůstává interní (jsou na něm klíče LSI). Slugy
//                      schválil majitel 2026-10-16 (docs/proposal-seo-lang-urls.md § 6.3).
//
// POZOR: kódy v obou polích musí existovat ve svých souborech, jinak se dlaždice ani fotka
// prostě nevykreslí a nikdo si toho nevšimne. Obráceně to hlídané je: amenita bez `space`
// je schválně "obecná" a patří na rozcestník (viz components/about.jsx).
//
// Obsah odpovídá skutečné roubence (Libošovice 6) -- stejný zdroj jako amenities.js:
// inzerát na e-chalupy.cz a doplnění od vlastníka. Sauna ani oplocená zahrada tu nejsou,
// zato fotbálek v předsíni a špejchar jako kryté posezení. Stodola (pingpong) je od 2026-11-18
// z webu pryč, než k ní budou fotky.

export default [
  {
    code: "predsin",
    slug: { cs: "predsin", en: "hall", de: "diele", pl: "sien", sk: "predsien" },
    order: 10,
    icon: "uugdsstencil-education-game",
    galleryCodes: ["hall", "stairs"],
    amenityCodes: ["foosball"],
    placeholderTone: "sand",
    units: [],
  },
  {
    code: "kuchyne",
    slug: { cs: "kuchyne", en: "kitchen", de: "kueche", pl: "kuchnia", sk: "kuchyna" },
    order: 20,
    icon: "uugdsstencil-home-coffee",
    galleryCodes: ["diningArea", "livingRoom", "dresser", "stove", "kitchenWindow", "kitchen"],
    amenityCodes: ["kitchen"],
    placeholderTone: "sand",
    units: [],
  },
  {
    code: "loznice",
    slug: { cs: "loznice", en: "bedrooms", de: "schlafzimmer", pl: "sypialnie", sk: "spalne" },
    order: 30,
    icon: "uugdsstencil-home-home",
    amenityCodes: ["beds"],
    placeholderTone: "muted",
    // Detail se skládá ze sekcí po místnostech (`units`), každá má vlastní fotky; fotky prostoru
    // (náhled na kartě, filtr v galerii) se skládají z fotek jednotek, viz tools/space-photos.js.
    // Devět pevných lůžek (3 × manželská + 3 jednolůžka); přistýlka 140 × 200 cm se počítá zvlášť
    // (caio.config.js `app.property.capacity.extraBeds`), protože je jen na vyžádání.
    // 1. ložnice zatím nemá fotku (2026-11-18) -- vykreslí se placeholder.
    units: [
      { code: "manzelska1", order: 10, hasDescription: true, galleryCodes: [] },
      { code: "manzelska2", order: 20, hasDescription: true, galleryCodes: ["atticBedroom"] },
      {
        code: "petiluzkova",
        order: 30,
        hasDescription: true,
        galleryCodes: ["largeBedroomDouble", "largeBedroom", "largeBedroomSingles", "largeBedroomCorner"],
      },
    ],
  },
  {
    code: "koupelny",
    slug: { cs: "koupelny", en: "bathrooms", de: "baeder", pl: "lazienki", sk: "kupelne" },
    order: 40,
    icon: "uugdsstencil-weather-waterdrop",
    amenityCodes: ["bathrooms"],
    placeholderTone: "muted",
    units: [
      { code: "spodni", order: 10, galleryCodes: ["lowerBathroom", "lowerBathroomWc"] },
      { code: "vrchni", order: 20, galleryCodes: ["upperBathroom", "upperBathroomShower"] },
    ],
  },
  {
    code: "deti",
    slug: { cs: "deti", en: "kids", de: "kinder", pl: "dzieci", sk: "deti" },
    order: 50,
    icon: "uugdsstencil-user-kid",
    galleryCodes: [],
    amenityCodes: ["babies"],
    placeholderTone: "sand",
    units: [],
  },
  {
    code: "dvorek",
    slug: { cs: "dvorek", en: "yard", de: "hof", pl: "podworko", sk: "dvor" },
    order: 60,
    icon: "uugdsstencil-weather-fire",
    galleryCodes: ["exterior", "facade", "entrance", "frontDoor", "granary", "firePit"],
    amenityCodes: ["granary", "fire"],
    placeholderTone: "forest",
    units: [],
  },
];
