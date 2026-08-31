// Zajímavosti v okolí. Tvar drží budoucí entitu `attraction` (design.md § 6).
//
// `distanceKm` je ČÍSLO, ne text "4 km" -- jednotku doplní až komponenta. Jinak by se
// s tím nedalo řadit ani filtrovat, až to půjde z DB.
//
// TODO OBSAH: placeholder z předlohy (ux/06-okoli-mista.jpg).

export default [
  {
    title: { cs: "Plakánek" },
    description: { cs: "Pohádkové romantické údolí s potokem a mlýny — start od chalupy." },
    category: "nature",
    distanceKm: 1,
    order: 10,
  },
  {
    title: { cs: "Hrad Kost" },
    description: { cs: "Jeden z nejzachovalejších gotických hradů v Čechách." },
    category: "culture",
    distanceKm: 4,
    order: 20,
  },
  {
    title: { cs: "Zámek Humprecht" },
    description: { cs: "Barokní letohrádek nad Sobotkou s unikátní akustikou." },
    category: "culture",
    distanceKm: 5,
    order: 30,
  },
  {
    title: { cs: "Prachovské skály" },
    description: { cs: "Nejznámější skalní město Českého ráje s vyhlídkami." },
    category: "nature",
    distanceKm: 12,
    order: 40,
  },
  {
    title: { cs: "Trosky" },
    description: { cs: "Symbol Českého ráje — dvě věže na čedičových sopouších." },
    category: "nature",
    distanceKm: 14,
    order: 50,
  },
  {
    title: { cs: "Jičín" },
    description: { cs: "Město Rumcajse, náměstí, koupaliště a rodinné výlety za deště." },
    category: "other",
    distanceKm: 16,
    order: 60,
  },
];
