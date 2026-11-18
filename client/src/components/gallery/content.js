// Seznam fotek. Tvar drží budoucí entitu galerie (design-v1.md § 8) -- ve v2 se import
// vymění za Call.cmdGet("gallery/list") a komponenta galerie zůstane.
//
// Popisky jsou v client/src/lsi/<lang>.json pod "gallery.<code>".
//
// Skutečné fotky (2026-09-02, ložnice, koupelny, předsíň a dvorek obměněné 2026-11-18), max 1280 px na delší straně, od 2026-10-15 jako WebP
// v client/src/assets/gallery/ (do buildu se kopírují do public/assets/gallery/). Ke každé
// jsou menší varianty -480 a -800 z tools/gallery-variants.js:
//
//   `src`           plná fotka -- lightbox, pozadí hero na desktopu, JSON-LD
//   `thumbnailSrc`  -800 -- dlaždice galerie (Uu5Imaging.Image ji kreslí, plnou stáhne až lightbox)
//   `srcSet`        všechny tři pro <img srcset>; velikost si podle `sizes` vybere prohlížeč
//
// `tone` u nich už nehraje roli (Photo ho čte jen pro `src: null` placeholder), zůstává
// jako fallback pro případ, že by `src` někdy zase spadl na `null`.
//
// `space` je kód prostoru z ../accommodation/content.js. Podle něj si detail prostoru bere svoje fotky
// a galerie umí filtr; `null` znamená "fotka nepatří k žádnému prostoru" (je jen v galerii).
// Prostor drží fotky i opačným směrem (`galleryCodes`) kvůli POŘADÍ uvnitř detailu --
// tenhle klíč je pro filtr a pro ověření, že vazba nikde nechybí.

const DIR = "/assets/gallery/";

/** `name` je soubor bez přípony, `width` šířka plné fotky v px (deskriptor do `srcSet`). */
function photo(name, width) {
  const src = `${DIR}${name}.webp`;
  return {
    src,
    thumbnailSrc: `${DIR}${name}-800.webp`,
    srcSet: `${DIR}${name}-480.webp 480w, ${DIR}${name}-800.webp 800w, ${src} ${width}w`,
  };
}

const gallery = [
  { code: "exterior", ...photo("01-prijezd", 1018), tone: "forest", space: "dvorek", order: 10 },
  { code: "granary", ...photo("02-spejchar", 1018), tone: "sand", space: "dvorek", order: 50 },
  { code: "firePit", ...photo("02-ohniste", 960), tone: "forest", space: "dvorek", order: 60 },
  { code: "facade", ...photo("03-chalupa", 1280), tone: "forest", space: "dvorek", order: 20 },
  { code: "entrance", ...photo("03-chalupa-2", 1280), tone: "forest", space: "dvorek", order: 30 },
  { code: "frontDoor", ...photo("03-chalupa-3", 960), tone: "forest", space: "dvorek", order: 40 },
  { code: "hall", ...photo("04-predsin", 720), tone: "sand", space: "predsin", order: 70 },
  { code: "stairs", ...photo("09-schody", 960), tone: "muted", space: "predsin", order: 80 },
  { code: "kitchen", ...photo("04-spolecenska-mistnost-1", 1280), tone: "sand", space: "kuchyne", order: 140 },
  { code: "diningArea", ...photo("04-spolecenska-mistnost-2", 1018), tone: "muted", space: "kuchyne", order: 90 },
  { code: "livingRoom", ...photo("05-jidelna", 1018), tone: "sand", space: "kuchyne", order: 100 },
  { code: "kitchenWindow", ...photo("04-kuchyne", 960), tone: "sand", space: "kuchyne", order: 130 },
  { code: "stove", ...photo("04-krb", 960), tone: "muted", space: "kuchyne", order: 120 },
  { code: "dresser", ...photo("05-jidelna-2", 960), tone: "sand", space: "kuchyne", order: 110 },
  { code: "atticBedroom", ...photo("06-loznice", 960), tone: "muted", space: "loznice", order: 150 },
  { code: "largeBedroom", ...photo("11-loznice", 1280), tone: "forest", space: "loznice", order: 160 },
  { code: "largeBedroomSingles", ...photo("11-loznice-2", 1280), tone: "forest", space: "loznice", order: 170 },
  { code: "largeBedroomCorner", ...photo("11-loznice-3", 960), tone: "forest", space: "loznice", order: 180 },
  { code: "largeBedroomDouble", ...photo("11-loznice-4", 960), tone: "forest", space: "loznice", order: 190 },
  { code: "lowerBathroom", ...photo("08-koupelna", 960), tone: "sand", space: "koupelny", order: 200 },
  { code: "lowerBathroomWc", ...photo("08-koupelna-2", 960), tone: "sand", space: "koupelny", order: 210 },
  { code: "upperBathroom", ...photo("10-koupelna", 960), tone: "sand", space: "koupelny", order: 220 },
  { code: "upperBathroomShower", ...photo("10-koupelna-2", 960), tone: "sand", space: "koupelny", order: 230 },
];

// Fotka v hero. Je tady, ne v hero.jsx, protože ji kromě komponenty potřebuje i build
// (config/hero-preload.js ji přednačítá v index.html) a ten uu5 komponenty načíst neumí.
export const heroPhoto = gallery.find((item) => item.code === "facade");
// Na mobilu (uu5 `xs`, do 480 px) je fotka hero <img> přes celou šířku; od 481 px je to
// pozadí sekce a bere se plná `src`. Hranice musí sedět s `useScreenSize` v uu5g05.
export const HERO_MOBILE_MAX_WIDTH = 480;
export const HERO_MOBILE_SIZES = "100vw";

export default gallery;
