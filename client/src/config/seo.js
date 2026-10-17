// Meta údaje stránek pro vyhledávače a sdílení: jedna tabulka stránka -> kde v LSI je
// titulek a popis. Čte ji `tools/page-meta.js` (tagy v `<head>`) a sitemap (seo-files.js),
// takže titulky, popisy a seznam URL se nerozejdou (docs/proposal-seo-meta.md).
//
// Klíčem je KÓD stránky z config/routes.js, ne adresa: adresa je v každém jazyce jiná
// (`/cenik`, `/de/preise`) a skládá ji `localizedPath` (config/routes.js). Texty jsou cesty
// do LSI, takže je každý jazyk čte ze svého `<lang>.json`.
//
// Cesty do LSI, ne vlastní texty: titulek je tentýž řetězec, jaký nese položka menu (nebo
// název prostoru), popis je v bloku `seo` (u prostoru je to jeho `perex`).
//
// Žádný import z uu5 -- soubor jde načíst i z `node --test` (seo.test.js).
import spaces from "../components/accommodation/content.js";
import { listPages } from "./routes.js";

// `title: null` = jen název nemovitosti (home).
const SEO_BY_PAGE = {
  home: { title: null, description: ["seo", "home"] },
  accommodation: { title: ["header", "nav", "ubytovani"], description: ["seo", "ubytovani"] },
  gallery: { title: ["header", "nav", "galerie"], description: ["seo", "galerie"] },
  pricing: { title: ["header", "nav", "cenik"], description: ["seo", "cenik"] },
  reservation: { title: ["header", "nav", "rezervace"], description: ["seo", "rezervace"] },
  reviews: { title: ["header", "nav", "recenze"], description: ["seo", "recenze"] },
  surroundings: { title: ["header", "nav", "okoli"], description: ["seo", "okoli"] },
  faq: { title: ["sections", "faq", "eyebrow"], description: ["seo", "faq"] },
  contact: { title: ["header", "nav", "kontakt"], description: ["seo", "kontakt"] },
};

// `og:locale` jazyků webu (jazyky samotné jsou v package.json `caio.languages`; že tu žádný
// nechybí, hlídá seo.test.js). Čte page-meta.js i vite.config.js (statické tagy v index.<lang>.html).
export const OG_LOCALE = { cs: "cs_CZ", en: "en_GB", de: "de_DE", pl: "pl_PL", sk: "sk_SK" };

const SPACE_CODES = new Set(spaces.map((space) => space.code));

/** Všechny veřejné stránky (pro sitemap a testy), totéž co `listPages()`. */
export function listSeoPages() {
  return listPages();
}

/**
 * Meta údaje stránky `{ code, space? }`: `{ title, description }` (cesty do LSI), nebo `null`,
 * když stránka v tabulce není (404). Detail prostoru se odvodí z kódu, ať přidání prostoru
 * není zásah i sem.
 */
export function getSeoEntry(page) {
  if (!page || !SEO_BY_PAGE[page.code]) return null;
  if (page.space != null) {
    if (page.code !== "accommodation" || !SPACE_CODES.has(page.space)) return null;
    return { title: ["spaces", page.space, "title"], description: ["spaces", page.space, "perex"] };
  }
  return SEO_BY_PAGE[page.code];
}

/**
 * Drobečková navigace stránky pro `BreadcrumbList` (tools/page-meta.js): seznam
 * `{ title, page }` od home po aktuální stránku, `title` je cesta do LSI. Home a neznámá
 * stránka žádnou nemají (`null`) -- home je kořen. Detail prostoru má mezi sebou a home
 * rozcestník ubytování.
 */
export function getBreadcrumb(page) {
  const entry = getSeoEntry(page);
  if (!entry || !entry.title) return null;

  const home = { title: ["property", "name"], page: { code: "home" } };
  const current = { title: entry.title, page };
  if (page.space != null) {
    return [home, { title: SEO_BY_PAGE.accommodation.title, page: { code: "accommodation" } }, current];
  }
  return [home, current];
}
