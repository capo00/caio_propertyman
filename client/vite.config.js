import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { createViteConfig } from "caio-devkit/vite";
import { buildRobotsTxt, buildSitemapXml } from "./src/config/seo-files.js";

// Kořen repa -- tam je serverový `.env` s `APP_URL`.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Zapíše `robots.txt` a `sitemap.xml` do kořene výstupu (docs/proposal-seo-robots-sitemap.md).
 * Ve `writeBundle` ze stejného důvodu jako devkitový `publicDir`: uu5-loader výstup při
 * `buildStart` vyprázdní, takže cokoli zapsaného dřív by watch rebuild smazal.
 * Bez `APP_URL` vznikne jen `robots.txt` bez řádku `Sitemap:`; stará sitemapa se smaže,
 * ať v `public/` nezůstane s jinou doménou.
 */
function seoFiles(appUrl) {
  let outDir = null;
  return {
    name: "caio-propertyman:seo-files",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      fs.writeFileSync(path.join(outDir, "robots.txt"), buildRobotsTxt(appUrl));
      const sitemap = buildSitemapXml(appUrl);
      const sitemapPath = path.join(outDir, "sitemap.xml");
      if (sitemap) fs.writeFileSync(sitemapPath, sitemap);
      else fs.rmSync(sitemapPath, { force: true });
    },
  };
}

// Klíč pro Google Maps musí být v bundlu, ne v runtime prostředí (klient je statický build).
//
// `import.meta.env.VITE_*` -- standardní cesta Vite -- v tomhle buildu NEFUNGUJE: výstup je
// SystemJS a hodnota se do bundlu vůbec nedostane (ověřeno -- `VITE_…` ani property, do které
// se přiřazovala, v `public/index.js` nejsou). Funkční mechanismus v tomhle stacku je
// `define`, kterým už devkit dosazuje NAME/VERSION/OUTPUT_NAME, takže env proměnné klienta
// jdou stejnou cestou.
//
// Prefix `VITE_` proto nemá smysl a proměnná se jmenuje `GOOGLE_MAPS_API_KEY`.
//
// `loadEnv(configEnv.mode, …)` čte podle Vite konvence jen `.env` a `.env.<mode>` -- při
// produkčním buildu (`mode: "production"`) to `.env.development` NIKDY nezahrne, i když
// prázdný prefix jinak pokrývá "cokoli", protože výběr SOUBORU je na módu, ne na prefixu.
// Proto se `.env.development` čte navíc explicitně a bere se jako fallback (2026-09-28,
// majitel -- deploy si nemá žádat proměnnou v prostředí pro každé spuštění zvlášť). Je to
// bezpečné: klíč je Maps Embed API, veřejný v URL iframu i tak, chráněný jen HTTP referrer
// restrikcí v Google Cloud (tam musí být localhost i produkční doména zároveň).
//
// Proměnná v prostředí buildu (`GOOGLE_MAPS_API_KEY=… npm run build/deploy`) má pořád
// přednost -- pro případ, že by produkce někdy chtěla jiný klíč než lokální dev.
export default (configEnv) => {
  const env = loadEnv(configEnv.mode, process.cwd(), "");
  const devEnv = loadEnv("development", process.cwd(), "");
  const googleMapsApiKey = env.GOOGLE_MAPS_API_KEY || devEnv.GOOGLE_MAPS_API_KEY || "";
  // Site key reCAPTCHA v3 -- stejná cesta a stejný fallback jako klíč pro Maps. Je veřejný
  // (Google ho vidí v každé stránce), ověření dělá server se secretem (caio-server Captcha).
  const recaptchaSiteKey = env.GOOGLE_RECAPTCHA_API_KEY || devEnv.GOOGLE_RECAPTCHA_API_KEY || "";
  // Adresa webu pro canonical, `og:*`, robots.txt a sitemapu. Jedna proměnná pro server
  // i klienta: `APP_URL` ze serverového `.env` v kořeni repa (ten se s appkou i deployuje),
  // proměnná v prostředí buildu má přednost. Viz config/config.js, `appUrl`.
  const appUrl = process.env.APP_URL || loadEnv("production", REPO_ROOT, "").APP_URL || "";

  return createViteConfig({
    define: {
      "process.env.GOOGLE_MAPS_API_KEY": JSON.stringify(googleMapsApiKey),
      "process.env.GOOGLE_RECAPTCHA_API_KEY": JSON.stringify(recaptchaSiteKey),
      "process.env.APP_URL": JSON.stringify(appUrl),
    },
    plugins: [seoFiles(appUrl)],
  })(configEnv);
};
