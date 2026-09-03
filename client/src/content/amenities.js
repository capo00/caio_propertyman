// Vybavení -- mřížka karet v sekci "O roubence".
// Tvar drží budoucí `property.amenities` (design.md § 6).
//
// Texty jsou v client/src/lsi/<lang>.json pod "amenities.<code>"; tady zůstává jen to, co
// není jazykové -- kód položky, pořadí a ikona.
//
// `icon` je stencil z uu_gds_svgg01 (lokální, ne CDN). Základní sada `uugds-*` je UI
// ikonografie a nic z vybavení v ní není; stencily mají alespoň něco blízkého. Pro `pets`
// neexistuje v celé lokální sadě žádné zvíře, takže tam ikona schválně chybí -- dlaždice se
// vykreslí bez ní.
//
// TODO OBSAH: placeholder z předlohy (ux/02-o-roubence-galerie.jpg).

export default [
  { code: "beds", order: 10, icon: "uugdsstencil-home-home" },
  { code: "sauna", order: 20, icon: "uugdsstencil-weather-fire" },
  { code: "kitchen", order: 30, icon: "uugdsstencil-home-coffee" },
  { code: "terrace", order: 40, icon: "uugdsstencil-home-flower" },
  { code: "pets", order: 50, icon: null },
  { code: "wifi", order: 60, icon: "uugdsstencil-it-wifi" },
];
