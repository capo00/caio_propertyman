// Přednačtení fotky hero v index.html (docs/decisions.md, 2026-10-15).
//
// Fotka hero je LCP prvek home, jenže ji zná jen appka: request by vznikl až po zavaděči,
// index.js, uu5 knihovnách a prvním vykreslení (na mobilu v PageSpeed ~2 s po HTML). Tenhle
// skript ji začne stahovat hned s HTML, appka ji pak vezme z cache.
//
// Proč inline skript a ne `<link rel="preload">` rovnou v HTML: index.html dostávají všechny
// routy (/cenik, /de/preise, i 404) a fotku chceme jen na home. `<img>` s opacity 0 by
// stáhl preload scanner na každé routě a neviditelný prvek se navíc nepočítá jako LCP.
//
// Dva preloady podle šířky, stejně jako hero.jsx:
//   do 480 px  -- <img> se `srcSet`; preload má stejný `imagesrcset`/`imagesizes`, takže
//                 prohlížeč vybere stejnou variantu (jinak by ji stáhl podruhé)
//   od 481 px  -- pozadí sekce s plnou `src`
//
// Musí jít načíst v node (vite.config.js) -- žádný uu5 import, jen data z gallery/content.js.
import { heroPhoto, HERO_MOBILE_MAX_WIDTH, HERO_MOBILE_SIZES } from "../components/gallery/content.js";

/** Vrátí tělo inline `<script>`, které na home přidá do `<head>` preload fotky hero. */
export function buildHeroPreloadScript(photo = heroPhoto) {
  const links = [
    {
      imageSrcset: photo.srcSet,
      imageSizes: HERO_MOBILE_SIZES,
      media: `(max-width: ${HERO_MOBILE_MAX_WIDTH}px)`,
    },
    { href: photo.src, media: `(min-width: ${HERO_MOBILE_MAX_WIDTH + 1}px)` },
  ];
  // JSON.stringify kvůli escapování; `<` navíc, ať řetězec nikdy neukončí <script>.
  const data = JSON.stringify(links).replace(/</g, "\\u003c");
  return [
    // Home je app base dokumentu: `/` v index.html, `/de/` v index.de.html (jazykové verze,
    // docs/proposal-seo-lang-urls.md). `/de` bez lomítka server přesměruje, sem nedojde.
    `var base = document.querySelector("base[data-uu-app-base]");`,
    `if (location.pathname === (base ? base.getAttribute("data-uu-app-base") : "/")) {`,
    `  ${data}.forEach(function (attrs) {`,
    `    var link = document.createElement("link");`,
    `    link.rel = "preload";`,
    `    link.as = "image";`,
    `    link.setAttribute("fetchpriority", "high");`,
    `    for (var key in attrs) link[key] = attrs[key];`,
    `    document.head.appendChild(link);`,
    `  });`,
    `}`,
  ].join("\n");
}
