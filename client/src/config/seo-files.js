// Obsah `robots.txt` a `sitemap.xml`. Generují se JEDNOU při buildu (plugin `seoFiles`
// ve `vite.config.js`) do kořene `public/`, odkud je server vrací jako statické soubory
// (docs/proposal-seo-robots-sitemap.md). Do bundlu appky se tenhle soubor nedostane.
//
// Seznam stránek je tentýž jako pro meta tagy (`seo.js`), takže sitemapa a canonical
// se nerozejdou.
import { getSeoEntry, listSeoRoutes } from "./seo.js";

// Cesty, které do vyhledávání nepatří: admin, přihlášení a prefixy use casů ze
// `server/*/api.js` (na ty host nikdy nepřijde odkazem). Že tu žádný prefix nechybí,
// hlídá seo-files.test.js.
export const DISALLOWED_PATHS = [
  "/admin",
  "/login.html",
  "/auth/",
  "/sys/",
  "/availability/",
  "/calendar/",
  "/icalFeed/",
  "/invoice/",
  "/price/",
  "/reservation/",
  "/review/",
];

const XML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

const trimUrl = (appUrl) => (appUrl || "").trim().replace(/\/+$/, "") || null;
const escapeXml = (value) => value.replace(/[&<>"']/g, (char) => XML_ENTITIES[char]);

/**
 * `robots.txt`. Stejný pro hlavní doménu i technickou adresu (`*.appspot.com`): duplicitu
 * řeší canonical na každé stránce, ne zákaz -- zakázanou stránku Google nenačte, a tak
 * neuvidí ani canonical. Bez `appUrl` chybí jen řádek `Sitemap:`.
 */
export function buildRobotsTxt(appUrl) {
  const url = trimUrl(appUrl);
  const lines = ["User-agent: *", ...DISALLOWED_PATHS.map((path) => `Disallow: ${path}`)];
  if (url) lines.push("", `Sitemap: ${url}/sitemap.xml`);
  return lines.join("\n") + "\n";
}

/**
 * `sitemap.xml`, nebo `null` bez `appUrl` (sitemapa s relativními adresami neplatí).
 * Bez `<lastmod>`: pravdivý údaj o změně obsahu nemáme a nepřesný Google ignoruje.
 */
export function buildSitemapXml(appUrl) {
  const url = trimUrl(appUrl);
  if (!url) return null;
  const entries = listSeoRoutes().map(
    (route) => `  <url><loc>${escapeXml(url + getSeoEntry(route).path)}</loc></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}
