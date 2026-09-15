// Vybavení -- dlaždice na rozcestníku /ubytovani a v detailu prostoru.
// Tvar drží budoucí `property.amenities` (design.md § 6).
//
// Texty jsou v client/src/lsi/<lang>.json pod "amenities.<code>"; tady zůstává jen to, co
// není jazykové -- kód položky, pořadí, ikona a prostor, ke kterému patří.
//
// `space` je kód z content/spaces.js. `null` znamená "nepatří k jednomu prostoru, platí pro
// celý pobyt" (Wi-Fi, check-in, obchod v obci) -- takové položky se vykreslí na rozcestníku
// v bloku praktických informací, ne v žádném detailu.
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
  { code: "beds", order: 10, icon: "uugdsstencil-home-home", space: "loznice" },
  { code: "kitchen", order: 20, icon: "uugdsstencil-home-coffee", space: "kuchyne" },
  { code: "bathrooms", order: 30, icon: "uugdsstencil-weather-waterdrop", space: "koupelny" },
  { code: "babies", order: 40, icon: "uugdsstencil-user-kid", space: "deti" },
  { code: "wifi", order: 50, icon: "uugdsstencil-it-wifi", space: null },
  { code: "checkInOut", order: 60, icon: "uugdsstencil-time-clock", space: null },
  { code: "barn", order: 70, icon: "uugdsstencil-education-game", space: "stodola" },
  { code: "granary", order: 80, icon: "uugdsstencil-home-tea", space: "dvorek" },
  { code: "fire", order: 90, icon: "uugdsstencil-weather-fire", space: "dvorek" },
  { code: "village", order: 100, icon: "uugdsstencil-home-buildings", space: null },
];
