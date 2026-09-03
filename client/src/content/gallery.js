// Seznam fotek. Tvar drží budoucí entitu galerie (design-v1.md § 8) -- ve v2 se import
// vymění za Call.cmdGet("gallery/list") a komponenta galerie zůstane.
//
// Popisky jsou v client/src/lsi/<lang>.json pod "gallery.<code>".
//
// Skutečné fotky (2026-09-02), zmenšené na max 1280 px na delší straně, v public/assets/gallery/.
// `tone` u nich už nehraje roli (Photo ho čte jen pro `src: null` placeholder), zůstává
// jako fallback pro případ, že by `src` někdy zase spadl na `null`.

export default [
  { code: "exterior", src: "/assets/gallery/01-prijezd.jpeg", tone: "forest", order: 10 },
  { code: "annex", src: "/assets/gallery/02-vejmenek.jpeg", tone: "sand", order: 20 },
  { code: "facade", src: "/assets/gallery/03-chalupa.jpeg", tone: "forest", order: 30 },
  { code: "kitchen", src: "/assets/gallery/04-spolecenska-mistnost-1.jpeg", tone: "sand", order: 40 },
  { code: "diningArea", src: "/assets/gallery/04-spolecenska-mistnost-2.jpeg", tone: "muted", order: 50 },
  { code: "livingRoom", src: "/assets/gallery/05-jidelna.jpeg", tone: "sand", order: 60 },
  { code: "atticBedroom", src: "/assets/gallery/06-pokoj-1.jpeg", tone: "muted", order: 70 },
  { code: "secondBedroom", src: "/assets/gallery/07-loznice-1.jpeg", tone: "forest", order: 80 },
];
