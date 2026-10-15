// Seznam fotek. Tvar drží budoucí entitu galerie (design-v1.md § 8) -- ve v2 se import
// vymění za Call.cmdGet("gallery/list") a komponenta galerie zůstane.
//
// Popisky jsou v client/src/lsi/<lang>.json pod "gallery.<code>".
//
// Skutečné fotky (2026-09-02), max 1280 px na delší straně, od 2026-10-15 jako WebP
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
  { code: "annex", ...photo("02-vejmenek", 1018), tone: "sand", space: "dvorek", order: 20 },
  { code: "facade", ...photo("03-chalupa", 1280), tone: "forest", space: "dvorek", order: 30 },
  { code: "kitchen", ...photo("04-spolecenska-mistnost-1", 1280), tone: "sand", space: "kuchyne", order: 40 },
  { code: "diningArea", ...photo("04-spolecenska-mistnost-2", 1018), tone: "muted", space: "kuchyne", order: 50 },
  { code: "livingRoom", ...photo("05-jidelna", 1018), tone: "sand", space: "kuchyne", order: 60 },
  { code: "atticBedroom", ...photo("06-pokoj-1", 960), tone: "muted", space: "loznice", order: 70 },
  { code: "secondBedroom", ...photo("07-loznice-1", 1018), tone: "forest", space: "loznice", order: 80 },
  { code: "secondBathroom", ...photo("08-koupelna", 1200), tone: "sand", space: "koupelny", order: 90 },
];

// Fotka v hero. Je tady, ne v hero.jsx, protože ji kromě komponenty potřebuje i build
// (config/hero-preload.js ji přednačítá v index.html) a ten uu5 komponenty načíst neumí.
export const heroPhoto = gallery.find((item) => item.code === "facade");
// Na mobilu (uu5 `xs`, do 480 px) je fotka hero <img> přes celou šířku; od 481 px je to
// pozadí sekce a bere se plná `src`. Hranice musí sedět s `useScreenSize` v uu5g05.
export const HERO_MOBILE_MAX_WIDTH = 480;
export const HERO_MOBILE_SIZES = "100vw";

export default gallery;
