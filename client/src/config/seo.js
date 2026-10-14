// Meta údaje stránek pro vyhledávače a sdílení: jedna tabulka routa -> kde v LSI je titulek
// a popis a jaká je kanonická cesta. Čte ji `tools/page-meta.js` (tagy v `<head>`) a bude
// ji číst i sitemap a prerender (docs/proposal-seo-meta.md), takže titulky, popisy a seznam
// URL se nerozejdou.
//
// Cesty do LSI (`cs.json`), ne vlastní texty: titulek je tentýž řetězec, jaký nese položka
// menu (nebo název prostoru), popis je v bloku `seo` (u prostoru je to jejich `perex`).
//
// Žádný import z uu5 -- soubor jde načíst i z `node --test` (seo.test.js).
import spaces from "../components/accommodation/content.js";

const SPACE_ROUTE_PREFIX = "ubytovani/";

// Klíč = `uu5Route` (home je `""`, adresa `/`). `title: null` = jen název nemovitosti.
// `path` je kanonická cesta bez domény. Přesměrování (config/routes.js) se vyřídí dřív,
// než se sem dostanou.
const SEO_BY_ROUTE = {
  "": { title: null, description: ["seo", "home"], path: "/" },
  ubytovani: { title: ["header", "nav", "ubytovani"], description: ["seo", "ubytovani"], path: "/ubytovani" },
  galerie: { title: ["header", "nav", "galerie"], description: ["seo", "galerie"], path: "/galerie" },
  cenik: { title: ["header", "nav", "cenik"], description: ["seo", "cenik"], path: "/cenik" },
  rezervace: { title: ["header", "nav", "rezervace"], description: ["seo", "rezervace"], path: "/rezervace" },
  recenze: { title: ["header", "nav", "recenze"], description: ["seo", "recenze"], path: "/recenze" },
  okoli: { title: ["header", "nav", "okoli"], description: ["seo", "okoli"], path: "/okoli" },
  faq: { title: ["sections", "faq", "eyebrow"], description: ["seo", "faq"], path: "/faq" },
  kontakt: { title: ["header", "nav", "kontakt"], description: ["seo", "kontakt"], path: "/kontakt" },
};

const SPACE_CODES = new Set(spaces.map((space) => space.code));

/** Všechny veřejné routy tabulky včetně detailů prostorů (pro sitemap a testy). */
export function listSeoRoutes() {
  return [...Object.keys(SEO_BY_ROUTE), ...spaces.map((space) => `${SPACE_ROUTE_PREFIX}${space.code}`)];
}

/**
 * Meta údaje routy: `{ title, description, path, noindex }` (cesty do LSI), nebo `null`,
 * když routa v tabulce není. Detail prostoru (`ubytovani/<code>`) se odvodí z kódu, ať
 * přidání prostoru není zásah i sem.
 */
export function getSeoEntry(uu5Route) {
  if (typeof uu5Route !== "string") return null;
  if (uu5Route.startsWith(SPACE_ROUTE_PREFIX)) {
    const code = uu5Route.slice(SPACE_ROUTE_PREFIX.length);
    if (!SPACE_CODES.has(code)) return null;
    return {
      title: ["spaces", code, "title"],
      description: ["spaces", code, "perex"],
      path: `/${uu5Route}`,
    };
  }
  return SEO_BY_ROUTE[uu5Route] ?? null;
}
