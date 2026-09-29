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
//
// `url` (majitel, 2026-09-29) -- oficiální stránka místa, celá dlaždice na ni proklikává
// do NOVÉHO okna (AttractionCard). `kingdomCome` je tip, ne místo na mapě, a URL nedostal --
// zůstává bez prokliku.

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
