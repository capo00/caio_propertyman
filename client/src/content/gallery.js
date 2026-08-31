// Seznam fotek. Tvar drží budoucí entitu galerie (design-v1.md § 8) -- ve v2 se import
// vymění za Call.cmdGet("gallery/list") a komponenta galerie zůstane.
//
// TODO FOTKY: zatím JSOU TO PLACEHOLDERY. `src: null` znamená "vykresli barevnou plochu
// místo fotky" (viz components/photo.jsx). Až budou skutečné fotky:
//   1. zmenšit na max ~2000 px na delší straně a uložit jako .webp
//   2. dát je do client/public/assets/gallery/
//   3. sem doplnit src: "/assets/gallery/<soubor>.webp"
// Nic jiného se měnit nemusí.

export default [
  { src: null, caption: { cs: "Roubenka od příjezdové cesty" }, tone: "forest", order: 10 },
  { src: null, caption: { cs: "Světnice s kamny" }, tone: "sand", order: 20 },
  { src: null, caption: { cs: "Podkrovní ložnice" }, tone: "muted", order: 30 },
  { src: null, caption: { cs: "Krytá terasa s ohništěm" }, tone: "forest", order: 40 },
  { src: null, caption: { cs: "Okno se muškáty" }, tone: "sand", order: 50 },
  { src: null, caption: { cs: "Skalní město nad údolím" }, tone: "muted", order: 60 },
  { src: null, caption: { cs: "Sauna a studená káď" }, tone: "sand", order: 70 },
  { src: null, caption: { cs: "Zahrada na podzim" }, tone: "forest", order: 80 },
];
