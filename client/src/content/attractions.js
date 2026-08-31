// Zajímavosti v okolí. Tvar drží budoucí entitu `attraction` (design.md § 6).
//
// `distanceKm` je ČÍSLO, ne text "4 km" -- jednotku doplní až komponenta. Jinak by se
// s tím nedalo řadit ani filtrovat, až to půjde z DB.
//
// Názvy a popisy jsou v client/src/lsi/<lang>.json pod "attractions.<code>".
//
// TODO OBSAH: placeholder z předlohy (ux/06-okoli-mista.jpg).

export default [
  { code: "plakanek", category: "nature", distanceKm: 1, order: 10 },
  { code: "kost", category: "culture", distanceKm: 4, order: 20 },
  { code: "humprecht", category: "culture", distanceKm: 5, order: 30 },
  { code: "prachovskeSkaly", category: "nature", distanceKm: 12, order: 40 },
  { code: "trosky", category: "nature", distanceKm: 14, order: 50 },
  { code: "jicin", category: "other", distanceKm: 16, order: 60 },
];
