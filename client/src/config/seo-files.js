// Obsah `robots.txt`, `sitemap.xml` a `spa-routes.json`. Generují se JEDNOU při buildu
// (plugin `seoFiles` ve `vite.config.js`) do kořene `public/`, odkud je server vrací jako
// statické soubory (docs/proposal-seo-robots-sitemap.md, docs/proposal-seo-404.md).
// Do bundlu appky se tenhle soubor nedostane.
//
// Seznam stránek je tentýž jako pro meta tagy (`seo.js`), takže sitemapa a canonical
// se nerozejdou.
import { getSeoEntry, listSeoRoutes } from "./seo.js";
import { ADMIN_SCREENS, REDIRECTS } from "./routes.js";
import property from "./property.js";
import contact from "../components/contact/content.js";
import gallery from "../components/gallery/content.js";
import lsi from "../lsi/cs.json" with { type: "json" };

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

/**
 * `spa-routes.json`: které routy appka zná a co kam přesměrovává. Podle něj server
 * (server/spa-routes/) vrátí na neznámou adresu 404 a na přesměrování 301
 * (docs/proposal-seo-404.md). Server sám `client/` číst nemůže, na App Engine se nenahrává.
 * Nic tajného: všechny routy včetně adminu jsou i v JS bundlu.
 */
export function buildSpaRoutes() {
  return {
    routes: [...listSeoRoutes(), ...ADMIN_SCREENS.map((screen) => `admin/${screen}`)],
    redirects: REDIRECTS,
  };
}

// Kolik fotek z galerie jde do `image` (podle pořadí v galerii), vedle obrázku pro sdílení.
const STRUCTURED_DATA_PHOTOS = 3;

/**
 * Strukturovaná data (JSON-LD) o webu a roubence: `WebSite` a `LodgingBusiness` v jednom
 * `@graph`. Plugin ve `vite.config.js` je při buildu vloží do `<head>` index.html, takže je
 * vidí i crawler bez JS (docs/proposal-seo-json-ld.md). Bez `appUrl` vrací `null`:
 * adresy ve strukturovaných datech musí být absolutní.
 *
 * Jen z dat, která web už má, nic se tu neopisuje. Cenu (`minNightPrice`) dodá volající
 * ze server/config.js -- ceník je na serveru a tenhle soubor má zůstat bez importů odtamtud.
 *
 * Vědomě chybí `aggregateRating`: hodnocení sbírané na vlastním webu Google u firem
 * nezobrazuje (self-serving reviews).
 */
export function buildStructuredData(appUrl, { minNightPrice } = {}) {
  const url = trimUrl(appUrl);
  if (!url) return null;

  const name = lsi.property.name;
  const { address, capacity, checkIn, checkOut } = property;
  const photos = [...gallery]
    .sort((a, b) => a.order - b.order)
    .slice(0, STRUCTURED_DATA_PHOTOS)
    .map((photo) => url + photo.src);

  const lodging = {
    "@type": "LodgingBusiness",
    "@id": `${url}/#lodging`,
    name,
    description: lsi.seo.home,
    url: `${url}/`,
    image: [`${url}/assets/meta/og-image.jpg`, ...photos],
    telephone: contact.phoneHref,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      postalCode: address.zip,
      addressLocality: address.city,
      addressCountry: "CZ",
    },
    geo: { "@type": "GeoCoordinates", latitude: address.gps.lat, longitude: address.gps.lng },
    hasMap: contact.mapUrl,
    checkinTime: checkIn,
    checkoutTime: checkOut,
    numberOfRooms: capacity.bedrooms,
    sameAs: [contact.social.facebook, contact.social.instagram],
  };
  if (minNightPrice) lodging.priceRange = `od ${minNightPrice.toLocaleString("cs-CZ")} Kč za noc`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}/#website`, name, url: `${url}/`, inLanguage: "cs" },
      lodging,
    ],
  };
}

/** JSON-LD jako obsah `<script>`: `<` escapovaný, aby text nemohl tag ukončit. */
export function serializeJsonLd(data) {
  // Šest znaků backslash-u003c, které JSON.parse přečte zase jako `<`.
  return JSON.stringify(data).replace(/</g, "\\" + "u003c");
}
