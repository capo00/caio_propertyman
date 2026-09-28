// Zajímavosti v okolí. Tvar drží budoucí entitu `attraction` (design.md § 6).
//
// `distanceKm` je ČÍSLO, ne text "4 km" -- jednotku doplní až komponenta. Jinak by se
// s tím nedalo řadit ani filtrovat, až to půjde z DB.
//
// Názvy a popisy jsou v client/src/lsi/<lang>.json pod "attractions.<code>".
//
// POZOR NA ČÍSLA: "3 km na Kost" je z inzerátu na e-chalupy.cz, zbytek jsou ODHADY
// vzdálenosti po silnici z Libošovic (u Plakánku pěšky). Jsou to údaje, které host čte
// jako slib -- před ostrým provozem je projet v mapě a případně srovnat.

export default [
  { code: "vesec", category: "culture", distanceKm: 2, order: 10 },
  { code: "plakanek", category: "nature", distanceKm: 2.3, order: 20 },
  { code: "kost", category: "culture", distanceKm: 2.5, order: 30 },
  { code: "humprecht", category: "culture", distanceKm: 3, order: 40 },
  { code: "trosky", category: "nature", distanceKm: 9, order: 50 },
  { code: "hrubaSkala", category: "nature", distanceKm: 10, order: 60 },
  { code: "prachovskeSkaly", category: "nature", distanceKm: 12, order: 70 },
  { code: "kingdomCome", category: "games", order: 80 },
];
