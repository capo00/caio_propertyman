// Vybavení -- mřížka karet v sekci "O roubence".
// Tvar drží budoucí `property.amenities` (design.md § 6).
//
// Texty jsou v client/src/lsi/<lang>.json pod "amenities.<code>"; tady zůstává jen to, co
// není jazykové -- kód položky, pořadí a ikona.
//
// `icon` je stencil z uu_gds_svgg01 (lokální, ne CDN). Základní sada `uugds-*` je UI
// ikonografie a nic z vybavení v ní není; použitelné jsou jen stencily. Katalog stencilů
// je v public/libs/uu_gds_svgg01/<verze>/stencils/<kategorie>.json (klíče `iconMap`) --
// vždycky tam nejdřív koukni, ať se nevymýšlí název, který skončí 404.
//
// Obsah odpovídá skutečné roubence (Libošovice 6) podle inzerátu na e-chalupy.cz
// a doplnění od vlastníka (stodola = pingpong + fotbálek, špejchar = kryté posezení
// místo pergoly). Sauna, oplocená zahrada ani "zvířata vítána" z předlohy zmizely --
// nic z toho chalupa nemá a psi jsou výslovně zakázaní.

export default [
  { code: "beds", order: 10, icon: "uugdsstencil-home-home" },
  { code: "kitchen", order: 20, icon: "uugdsstencil-home-coffee" },
  { code: "bathrooms", order: 30, icon: "uugdsstencil-weather-waterdrop" },
  { code: "babies", order: 40, icon: "uugdsstencil-user-kid" },
  { code: "wifi", order: 50, icon: "uugdsstencil-it-wifi" },
  { code: "checkInOut", order: 60, icon: "uugdsstencil-time-clock" },
  { code: "barn", order: 70, icon: "uugdsstencil-education-game" },
  { code: "granary", order: 80, icon: "uugdsstencil-home-tea" },
  { code: "fire", order: 90, icon: "uugdsstencil-weather-fire" },
  { code: "village", order: 100, icon: "uugdsstencil-home-buildings" },
];
