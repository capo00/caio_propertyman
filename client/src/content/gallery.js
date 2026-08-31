// Seznam fotek. Tvar drží budoucí entitu galerie (design-v1.md § 8) -- ve v2 se import
// vymění za Call.cmdGet("gallery/list") a komponenta galerie zůstane.
//
// Popisky jsou v client/src/lsi/<lang>.json pod "gallery.<code>".
//
// TODO FOTKY: zatím JSOU TO PLACEHOLDERY. `src: null` znamená "vykresli barevnou plochu
// místo fotky" (viz components/photo.jsx). Až budou skutečné fotky:
//   1. zmenšit na max ~2000 px na delší straně a uložit jako .webp
//   2. dát je do client/public/assets/gallery/
//   3. sem doplnit src: "/assets/gallery/<soubor>.webp"
// Nic jiného se měnit nemusí.

export default [
  { code: "exterior", src: null, tone: "forest", order: 10 },
  { code: "livingRoom", src: null, tone: "sand", order: 20 },
  { code: "atticBedroom", src: null, tone: "muted", order: 30 },
  { code: "terrace", src: null, tone: "forest", order: 40 },
  { code: "window", src: null, tone: "sand", order: 50 },
  { code: "rocks", src: null, tone: "muted", order: 60 },
  { code: "sauna", src: null, tone: "sand", order: 70 },
  { code: "garden", src: null, tone: "forest", order: 80 },
];
