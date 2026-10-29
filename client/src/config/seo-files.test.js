import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildSpaRoutes,
  buildStructuredData,
  localizeIndexHtml,
  readLsi,
  serializeJsonLd,
} from "./seo-files.js";
import property from "./property.js";
import contact from "../components/contact/content.js";
import { listPages, pageRoute } from "./routes.js";

const LANGUAGES = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).caio.languages;
const INDEX_HTML = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

// robots.txt and sitemap.xml are caio-server's (Disallow from the use cases, sitemap from
// spa-routes.json: server/spa-routes/sitemap.test.js).

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
