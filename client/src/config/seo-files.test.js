import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import {
  buildRobotsTxt,
  buildSitemapXml,
  buildSpaRoutes,
  buildStructuredData,
  localizeIndexHtml,
  readLsi,
  serializeJsonLd,
  DISALLOWED_PATHS,
} from "./seo-files.js";
import property from "./property.js";
import contact from "../components/contact/content.js";
import { listPages, pageRoute } from "./routes.js";

const SERVER_DIR = new URL("../../../server/", import.meta.url);
const LANGUAGES = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).caio.languages;
const INDEX_HTML = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("robots.txt zakazuje admin a odkazuje na sitemapu", () => {
  const robots = buildRobotsTxt("https://roubenyraj.cz/");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Disallow: \/admin$/m);
  assert.match(robots, /^Sitemap: https:\/\/roubenyraj\.cz\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
});

/**
 * Zakazuje robots.txt cestu? Jako Google: `Disallow` je prefix, `*` je cokoli, `$` konec adresy.
 * `Allow` robots.txt webu nemá, takže stačí projít zákazy.
 */
function isDisallowed(robots, path) {
  return robots
    .split("\n")
    .filter((line) => line.startsWith("Disallow: "))
    .map((line) => line.slice("Disallow: ".length).trim())
    .some((rule) => {
      const anchored = rule.endsWith("$");
      const pattern = (anchored ? rule.slice(0, -1) : rule)
        .split("*")
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*");
      return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
    });
}

// Dřívější `Disallow: /index.` zakazoval i `/index.js`: Google appku nespustil a anglické
// stránky hlásil jako noindex (Search Console 2026-10-29).
test("robots.txt nezakazuje nic, co stránka potřebuje k vykreslení", () => {
  const robots = buildRobotsTxt("https://roubenyraj.cz/");
  const paths = [
    "/",
    "/index.js",
    "/index.js?v=43fad126",
    "/libs/uu5g05/1.52.2/uu5g05.min.js",
    "/assets/roubenka-Vm7CUMmq.svg",
    "/assets/meta/og-image.jpg",
    "/favicon.ico",
    ...listPages().flatMap((page) => LANGUAGES.map((language) => `/${language}/${pageRoute(language, page)}`)),
  ];
  for (const path of paths) {
    assert.equal(isDisallowed(robots, path), false, `robots.txt zakazuje ${path}`);
  }
});

test("robots.txt zakazuje dokumenty jazykových verzí napřímo", () => {
  const robots = buildRobotsTxt("https://roubenyraj.cz/");
  for (const path of ["/index.html", ...LANGUAGES.map((language) => `/index.${language}.html`)]) {
    assert.equal(isDisallowed(robots, path), true, `robots.txt nezakazuje ${path}`);
  }
});

test("robots.txt bez APP_URL nemá řádek Sitemap", () => {
  assert.doesNotMatch(buildRobotsTxt(""), /Sitemap:/);
  assert.doesNotMatch(buildRobotsTxt(undefined), /Sitemap:/);
});

test("sitemap má každou stránku v každém jazyce s absolutní adresou", () => {
  const xml = buildSitemapXml("https://roubenyraj.cz", LANGUAGES);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locs.length, listPages().length * LANGUAGES.length);
  assert.equal(new Set(locs).size, locs.length);
  for (const loc of ["/", "/cenik", "/ubytovani/stodola", "/de/", "/de/preise", "/en/accommodation/barn"]) {
    assert.ok(locs.includes("https://roubenyraj.cz" + loc), loc);
  }
  assert.ok(locs.every((loc) => loc.startsWith("https://roubenyraj.cz/")));
});

test("sitemap: každá adresa má alternativy všech jazyků a x-default na češtinu", () => {
  const xml = buildSitemapXml("https://roubenyraj.cz", LANGUAGES);
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  const blocks = xml.split("<url>").slice(1);
  for (const block of blocks) {
    const hreflangs = [...block.matchAll(/hreflang="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(hreflangs, [...LANGUAGES, "x-default"]);
  }
  const pricing = blocks.find((block) => block.includes("<loc>https://roubenyraj.cz/de/preise</loc>"));
  assert.match(pricing, /hreflang="cs" href="https:\/\/roubenyraj\.cz\/cenik"/);
  assert.match(pricing, /hreflang="x-default" href="https:\/\/roubenyraj\.cz\/cenik"/);
});

test("bez APP_URL sitemap nevznikne", () => {
  assert.equal(buildSitemapXml("", LANGUAGES), null);
  assert.equal(buildSitemapXml("  ", LANGUAGES), null);
});

test("robots.txt zakazuje každý prefix use casu ze server/*/api.js", () => {
  const prefixes = new Set();
  for (const dir of readdirSync(SERVER_DIR, { withFileTypes: true })) {
    const apiFile = new URL(`${dir.name}/api.js`, SERVER_DIR);
    if (!dir.isDirectory() || !existsSync(apiFile)) continue;
    const source = readFileSync(apiFile, "utf8");
    for (const match of source.matchAll(/^\s*"([a-z][a-zA-Z]*)\/[a-zA-Z/]+":/gm)) prefixes.add(match[1]);
  }
  assert.ok(prefixes.size > 0);
  for (const prefix of prefixes) {
    assert.ok(DISALLOWED_PATHS.includes(`/${prefix}/`), `chybí Disallow: /${prefix}/`);
  }
});

test("spa-routes: routy a přesměrování po jazycích, admin ne (je to UVE)", () => {
  const { routes, redirects } = buildSpaRoutes(LANGUAGES);
  assert.deepEqual(Object.keys(routes), LANGUAGES);
  for (const language of LANGUAGES) {
    for (const page of listPages()) {
      assert.ok(routes[language].includes(pageRoute(language, page)), `${language}: ${page.code}`);
    }
    assert.ok(routes[language].includes(""));
    assert.ok(!routes[language].some((route) => route.startsWith("admin")));
    assert.equal(redirects[language].home, "");
    assert.equal(new Set(routes[language]).size, routes[language].length);
    for (const from of Object.keys(redirects[language])) {
      assert.ok(!routes[language].includes(from), `${language}: ${from} je routa i přesměrování`);
    }
  }
  assert.equal(redirects.de.cenik, "preise");
});

test("strukturovaná data: web a ubytování z datových souborů, absolutní adresy", () => {
  const data = buildStructuredData("https://roubenyraj.cz/", { minNightPrice: 3700 });
  const website = data["@graph"].find((node) => node["@type"] === "WebSite");
  const lodging = data["@graph"].find((node) => node["@type"] === "LodgingBusiness");

  assert.equal(website.url, "https://roubenyraj.cz/");
  assert.equal(website.inLanguage, "cs");
  assert.equal(lodging.name, website.name);
  assert.equal(lodging.address.streetAddress, property.address.street);
  assert.equal(lodging.address.postalCode, property.address.zip);
  assert.equal(lodging.geo.latitude, property.address.gps.lat);
  assert.equal(lodging.geo.longitude, property.address.gps.lng);
  assert.equal(lodging.telephone, contact.phoneHref);
  assert.equal(lodging.numberOfRooms, property.capacity.bedrooms);
  assert.deepEqual(lodging.sameAs, [contact.social.facebook, contact.social.instagram]);
  assert.equal(lodging.priceRange, "3700+ CZK");
  assert.ok(lodging.image.length > 1);
  assert.ok(lodging.image.every((url) => url.startsWith("https://roubenyraj.cz/assets/")));
  assert.equal(lodging.aggregateRating, undefined);
});

test("strukturovaná data: bez APP_URL nic, bez ceny bez priceRange", () => {
  assert.equal(buildStructuredData(""), null);
  const lodging = buildStructuredData("https://roubenyraj.cz")["@graph"][1];
  assert.equal(lodging.priceRange, undefined);
});

test("strukturovaná data v jiném jazyce: popis, adresa webu a inLanguage toho jazyka", () => {
  const data = buildStructuredData("https://roubenyraj.cz", { language: "de", defaultLanguage: "cs" });
  const [website, lodging] = data["@graph"];
  assert.equal(website.inLanguage, "de");
  assert.equal(website.url, "https://roubenyraj.cz/de/");
  assert.equal(lodging.description, readLsi("de").seo.home);
  assert.equal(lodging["@id"], "https://roubenyraj.cz/#lodging", "ubytování je jedno pro všechny jazyky");
});

test("serializeJsonLd escapuje <, aby text neukončil <script>", () => {
  const json = serializeJsonLd({ text: "</script><b>" });
  assert.ok(!json.includes("<"));
  assert.equal(JSON.parse(json).text, "</script><b>");
});

test("jazykový dokument: popis, og:locale a JSON-LD v jazyce, nic českého z hlavičky", () => {
  const jsonLd = serializeJsonLd(buildStructuredData("https://roubenyraj.cz"));
  const html = INDEX_HTML.replace("</head>", `<script type="application/ld+json">${jsonLd}</script></head>`);
  const de = localizeIndexHtml(html, {
    language: "de",
    defaultLanguage: "cs",
    appUrl: "https://roubenyraj.cz",
    minNightPrice: 3700,
  });
  const german = readLsi("de").seo.home;
  assert.equal(de.split(`content="${german}"`).length - 1, 2);
  assert.ok(!de.includes(readLsi("cs").seo.home));
  assert.match(de, /<meta property="og:locale" content="de_DE" \/>/);
  const data = JSON.parse(de.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data["@graph"][0].inLanguage, "de");
});

test("jazykový dokument: index.html jiného tvaru shodí build", () => {
  const broken = INDEX_HTML.replace('property="og:locale"', 'property="x"');
  assert.throws(() => localizeIndexHtml(broken, { language: "de", defaultLanguage: "cs" }), /og:locale/);
});
