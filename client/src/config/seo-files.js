// Obsah `robots.txt`, `sitemap.xml` a `spa-routes.json` a obsah jazykových dokumentů
// `index.<lang>.html`. Generují se JEDNOU při buildu (plugin `seoFiles` ve `vite.config.js`)
// do kořene `public/`, odkud je server vrací jako statické soubory
// (docs/proposal-seo-robots-sitemap.md, docs/proposal-seo-404.md, docs/proposal-seo-lang-urls.md).
// Do bundlu appky se tenhle soubor nedostane, takže smí číst soubory (LSI jazyků) přes `fs`.
//
// Seznam stránek a jejich adres je tentýž jako pro router a meta tagy (`routes.js`,
// `seo.js`), takže sitemapa, canonical a hreflang se nerozejdou. Jazyky webu přicházejí
// zvenčí (package.json `caio.languages`, do buildu je dává caio-devkit), první je výchozí.
import { readFileSync } from "node:fs";
import { OG_LOCALE } from "./seo.js";
import { listPages, localizedPath, pageRoute, redirectsFor } from "./routes.js";
import property from "./property.js";
import contact from "../components/contact/content.js";
import gallery from "../components/gallery/content.js";

/** LSI jazyka (`lsi/<lang>.json`). Čte se ze souboru, ať přidání jazyka není zásah i sem. */
export function readLsi(language) {
  return JSON.parse(readFileSync(new URL(`../lsi/${language}.json`, import.meta.url), "utf8"));
}

// Cesty, které do vyhledávání nepatří: admin, přihlášení, dokumenty jazykových verzí napřímo
// (`/index.en.html` vrací static, adresa té stránky je `/en/`) a prefixy use casů ze
// `server/*/api.js` (na ty host nikdy nepřijde odkazem). Že tu žádný prefix nechybí,
// hlídá seo-files.test.js.
export const DISALLOWED_PATHS = [
  "/admin",
  "/login.html",
  "/index.",
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
 * Každá stránka v každém jazyce je vlastní `<url>` a nese `xhtml:link` na všechny jazykové
 * verze včetně sebe a `x-default` (výchozí jazyk, `roubenyraj.cz` je česky) -- tak to Google
 * chce pro sitemap s alternativami.
 * Bez `<lastmod>`: pravdivý údaj o změně obsahu nemáme a nepřesný Google ignoruje.
 */
export function buildSitemapXml(appUrl, languages) {
  const url = trimUrl(appUrl);
  if (!url) return null;
  const [defaultLanguage] = languages;
  const entries = listPages().flatMap((page) => {
    const alternates = [
      ...languages.map((language) => [language, localizedPath(language, page, defaultLanguage)]),
      ["x-default", localizedPath(defaultLanguage, page, defaultLanguage)],
    ]
      .map(([hreflang, path]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(url + path)}"/>`)
      .join("\n");
    return languages.map(
      (language) =>
        `  <url>\n    <loc>${escapeXml(url + localizedPath(language, page, defaultLanguage))}</loc>\n${alternates}\n  </url>`,
    );
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * `spa-routes.json`: které routy appka zná v kterém jazyce a co kam přesměrovává. Podle
 * něj server (server/spa-routes/) vrátí na neznámou adresu 404 a na přesměrování 301
 * (docs/proposal-seo-404.md). Routy jsou bez prefixu jazyka, ten serveru řekne caio-server
 * (`res.locals.caioDocument`). Server sám `client/` číst nemůže, na App Engine se nenahrává.
 * Nic tajného: všechny routy jsou i v JS bundlu. Admin tu není, je to vlastní UVE.
 */
export function buildSpaRoutes(languages) {
  return {
    routes: Object.fromEntries(
      languages.map((language) => [language, listPages().map((page) => pageRoute(language, page))]),
    ),
    redirects: Object.fromEntries(languages.map((language) => [language, redirectsFor(language, languages)])),
  };
}

// Kolik fotek z galerie jde do `image` (podle pořadí v galerii), vedle obrázku pro sdílení.
const STRUCTURED_DATA_PHOTOS = 3;

/**
 * Strukturovaná data (JSON-LD) o webu a roubence: `WebSite` a `LodgingBusiness` v jednom
 * `@graph`. Plugin ve `vite.config.js` je při buildu vloží do `<head>` index.html a každého
 * index.<lang>.html v jeho jazyce, takže je vidí i crawler bez JS
 * (docs/proposal-seo-json-ld.md). Bez `appUrl` vrací `null`: adresy ve strukturovaných
 * datech musí být absolutní.
 *
 * Jen z dat, která web už má, nic se tu neopisuje. Cenu (`minNightPrice`) dodá volající
 * ze server/config.js -- ceník je na serveru a tenhle soubor má zůstat bez importů odtamtud.
 * `priceRange` je jazykově neutrální (`3700+ CZK`), ať není další text k překladu.
 *
 * Vědomě chybí `aggregateRating`: hodnocení sbírané na vlastním webu Google u firem
 * nezobrazuje (self-serving reviews).
 */
export function buildStructuredData(appUrl, { minNightPrice, language = "cs", defaultLanguage = "cs" } = {}) {
  const url = trimUrl(appUrl);
  if (!url) return null;

  const lsi = readLsi(language);
  const name = lsi.property.name;
  const { address, capacity, checkIn, checkOut } = property;
  const photos = [...gallery]
    .sort((a, b) => a.order - b.order)
    .slice(0, STRUCTURED_DATA_PHOTOS)
    .map((photo) => url + photo.src);
  const home = url + localizedPath(language, { code: "home" }, defaultLanguage);

  const lodging = {
    "@type": "LodgingBusiness",
    "@id": `${url}/#lodging`,
    name,
    description: lsi.seo.home,
    url: home,
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
  if (minNightPrice) lodging.priceRange = `${minNightPrice}+ CZK`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${url}/#website`, name, url: home, inLanguage: language },
      lodging,
    ],
  };
}

/** JSON-LD jako obsah `<script>`: `<` escapovaný, aby text nemohl tag ukončit. */
export function serializeJsonLd(data) {
  // Šest znaků backslash-u003c, které JSON.parse přečte zase jako `<`.
  return JSON.stringify(data).replace(/</g, "\\" + "u003c");
}

const escapeAttr = (value) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Nahradí v `html` právě jeden výskyt, jinak vyhodí -- jazykový dokument nesmí zůstat napůl český. */
function replaceExactly(html, from, to, count, what) {
  const found = html.split(from).length - 1;
  if (found !== count) throw new Error(`[seo-files] ${what}: čekal jsem ${count}× v index.html, je tam ${found}×`);
  return html.split(from).join(to);
}

/**
 * Obsah jazykového dokumentu `index.<lang>.html` (háček `api.caio.languageHtml` pro
 * caio-devkit): statický popis a `og:description` z `seo.home` jazyka, `og:locale` a
 * strukturovaná data v jazyce. `lang` a app base nastavil devkit. Pro crawlery bez JS
 * (Facebook, WhatsApp, Seznam), Google si zbytek přepíše za běhu (tools/page-meta.js).
 */
export function localizeIndexHtml(html, { language, defaultLanguage, appUrl, minNightPrice }) {
  const source = readLsi(defaultLanguage).seo.home;
  const target = readLsi(language).seo.home;
  let result = replaceExactly(html, `content="${escapeAttr(source)}"`, `content="${escapeAttr(target)}"`, 2, "popis (description, og:description)");
  result = replaceExactly(
    result,
    `<meta property="og:locale" content="${OG_LOCALE[defaultLanguage]}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[language]}" />`,
    1,
    "og:locale",
  );
  const structuredData = buildStructuredData(appUrl, { minNightPrice, language, defaultLanguage });
  if (structuredData) {
    result = result.replace(
      /(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
      (_, open, close) => open + serializeJsonLd(structuredData) + close,
    );
  }
  return result;
}
