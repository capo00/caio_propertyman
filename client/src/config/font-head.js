// Písma webu v <head> index.html (docs/decisions.md, 2026-10-15).
//
// Dřív `@font-face` z fonts.css přišly v bundlu (main.jsx `import "./fonts.css"`): SystemJS
// build je vkládá do stránky až při `execute` index.js, tedy po stažení všech uu5 knihoven.
// Písma se tak začala stahovat až po prvním renderu, text se vykreslil záložním písmem
// a po dorazu Karly a Fraunces se přeskládal (CLS).
//
// Teď je build vloží přímo do HTML: `<style>` s deklaracemi a ke každému souboru preload,
// takže se písma stahují souběžně s JS a jsou hotová dřív, než appka vykreslí text.
// Zdrojem zůstává client/src/fonts.css -- tady se jen čte.
//
// Musí jít načíst v node (vite.config.js) -- žádný uu5 import.

const FONT_URL_RE = /url\(\s*["']?([^"')]+\.woff2)["']?\s*\)/g;

/** Všechny soubory písem, na které fonts.css odkazuje (bez duplicit, v pořadí výskytu). */
export function listFontUrls(css) {
  return [...new Set([...css.matchAll(FONT_URL_RE)].map((match) => match[1]))];
}

/**
 * Vrátí tagy pro Vite `transformIndexHtml`: preload každého písma a `<style>` s `@font-face`.
 * Komentáře z fonts.css (dokumentace pro vývojáře) do HTML nejdou.
 */
export function buildFontHeadTags(css) {
  const preloads = listFontUrls(css).map((href) => ({
    tag: "link",
    // `crossorigin` i pro stejný origin: písma se stahují v režimu CORS a preload bez něj
    // by prohlížeč nepoužil a stáhl písmo podruhé.
    attrs: { rel: "preload", as: "font", type: "font/woff2", crossorigin: true, href },
    injectTo: "head",
  }));
  const declarations = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return [...preloads, { tag: "style", children: declarations, injectTo: "head" }];
}
