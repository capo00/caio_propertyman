import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createViteConfig } from "caio-devkit/vite";
import {
  buildSpaRoutes,
  buildStructuredData,
  localizeIndexHtml,
  serializeJsonLd,
} from "./src/config/seo-files.js";
import { languagePaths } from "./src/config/routes.js";
import { buildHeroPreloadScript } from "./src/config/hero-preload.js";
import { buildFontHeadTags } from "./src/config/font-head.js";
// Jen kvůli ceně ve strukturovaných datech: ceník je na serveru (server.config.js, čistá data).
// Čte se při buildu na stroji, kde leží celé repo, do bundlu klienta se nic z toho nedostane.
import serverConfig from "../server/server.config.js";

// Deklarace písem webu -- jediný zdroj, do index.html je vkládá plugin `seoFiles`.
const FONTS_CSS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src/fonts.css");

/**
 * Zapíše `spa-routes.json` (seznam rout pro 404 na serveru, docs/proposal-seo-404.md, a pro
 * sitemapu, server/spa-routes/sitemap.js) do kořene výstupu. Ve `writeBundle` ze stejného
 * důvodu jako devkitový `publicDir`: uu5-loader výstup při `buildStart` vyprázdní, takže
 * cokoli zapsaného dřív by watch rebuild smazal. `robots.txt` a `sitemap.xml` odpovídá
 * caio-server za běhu.
 *
 * Navíc vloží do `<head>` index.html strukturovaná data (JSON-LD) o webu a roubence
 * (docs/proposal-seo-json-ld.md) -- při buildu, ať je vidí i crawler bez JS. Jen do
 * index.html, ne do login.html.
 *
 * A skript, který na home přednačte fotku hero (config/hero-preload.js) -- taky jen do
 * index.html. Písma webu s preloadem (config/font-head.js) dostane i dokument UVE adminu
 * (src/admin/index.html), ať admin nečeká na písma z bundlu.
 *
 * Jazykové verze (docs/proposal-seo-lang-urls.md): jazyky webu jsou v caio.config.js
 * (`languages`) a caio-devkit je dává do `define` jako `process.env.CAIO_LANGUAGES` --
 * odtud je bere i tenhle plugin, ať nejsou na dvou místech. Stejně `APP_URL` (absolutní adresy
 * ve strukturovaných datech): devkit ji dává do `process.env.CAIO_PUBLIC_ENV` podle svého
 * pravidla (proměnná v prostředí buildu, jinak `.env` v kořeni repa, nikdy `.env.development`). `index.<lang>.html` zapisuje
 * devkit; obsah v jazyce (popis, og:locale, JSON-LD) a mapu cest pro přesměrování podle
 * uložené volby mu plugin dává přes háčky `api.caio` (caio-devkit README, 7).
 */
function seoFiles() {
  let outDir = null;
  let rootHtml = null;
  let languages = ["cs"];
  let appUrl = "";
  const { firstNights, nextNight } = serverConfig.app.pricing;
  const minNightPrice = Math.min(firstNights.price, nextNight);
  return {
    name: "caio-propertyman:seo-files",
    api: {
      caio: {
        languagePaths: ({ languages: list }) => languagePaths(list),
        languageHtml: (html, { language, defaultLanguage }) =>
          localizeIndexHtml(html, { language, defaultLanguage, appUrl, minNightPrice }),
      },
    },
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      rootHtml = path.resolve(config.root, "index.html");
      const defined = config.define?.["process.env.CAIO_LANGUAGES"];
      const list = defined ? JSON.parse(defined) : [];
      if (list.length) languages = list;
      const publicEnv = config.define?.["process.env.CAIO_PUBLIC_ENV"];
      appUrl = (publicEnv ? JSON.parse(publicEnv).APP_URL : null) ?? "";
    },
    transformIndexHtml(html, ctx) {
      const file = ctx?.filename ? path.resolve(ctx.filename) : "";
      // Dokument každé UVE je `index.html` (kořen i src/<uve>/); login.html sem nechodí.
      if (path.basename(file) !== "index.html") return html;
      // Písma (config/font-head.js): `@font-face` a preload rovnou v HTML, ne až z bundlu.
      // Čte se při každém buildu, ať watch vezme i změnu fonts.css.
      const fontTags = buildFontHeadTags(fs.readFileSync(FONTS_CSS, "utf8"));
      if (file !== rootHtml) return { html, tags: fontTags };
      const tags = [
        // Preload fotky hero jen na home (config/hero-preload.js). V `head`, ať request
        // vznikne dřív, než prohlížeč dojde k zavaděči appky na konci `body`.
        { tag: "script", children: buildHeroPreloadScript(), injectTo: "head" },
        ...fontTags,
      ];
      const structuredData = buildStructuredData(appUrl, { minNightPrice, language: languages[0], defaultLanguage: languages[0] });
      if (structuredData) {
        tags.push({
          tag: "script",
          attrs: { type: "application/ld+json" },
          children: serializeJsonLd(structuredData),
          injectTo: "head",
        });
      }
      return { html, tags };
    },
    writeBundle() {
      fs.writeFileSync(path.join(outDir, "spa-routes.json"), JSON.stringify(buildSpaRoutes(languages), null, 2) + "\n");
    },
  };
}

// Klíče prostředí pro bundl (Google Maps, site key reCAPTCHA, APP_URL) dává caio-devkit sám
// (`UiApp.PublicEnv`, caio.config.js `env.client`); do 2026-11 je sem dosazoval vlastní `define`
// z client/.env.development.
export default createViteConfig({ plugins: [seoFiles()] });
