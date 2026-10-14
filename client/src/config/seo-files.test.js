import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import {
  buildRobotsTxt,
  buildSitemapXml,
  buildSpaRoutes,
  buildStructuredData,
  serializeJsonLd,
  DISALLOWED_PATHS,
} from "./seo-files.js";
import property from "./property.js";
import contact from "../components/contact/content.js";
import { listSeoRoutes } from "./seo.js";

const SERVER_DIR = new URL("../../../server/", import.meta.url);

test("robots.txt zakazuje admin a odkazuje na sitemapu", () => {
  const robots = buildRobotsTxt("https://roubenyraj.cz/");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Disallow: \/admin$/m);
  assert.match(robots, /^Sitemap: https:\/\/roubenyraj\.cz\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
});

test("robots.txt bez APP_URL nemá řádek Sitemap", () => {
  assert.doesNotMatch(buildRobotsTxt(""), /Sitemap:/);
  assert.doesNotMatch(buildRobotsTxt(undefined), /Sitemap:/);
});

test("sitemap má každou veřejnou routu s absolutní adresou", () => {
  const xml = buildSitemapXml("https://roubenyraj.cz");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(locs.length, listSeoRoutes().length);
  assert.ok(locs.includes("https://roubenyraj.cz/"));
  assert.ok(locs.includes("https://roubenyraj.cz/cenik"));
  assert.ok(locs.includes("https://roubenyraj.cz/ubytovani/stodola"));
  assert.ok(locs.every((loc) => loc.startsWith("https://roubenyraj.cz/")));
});

test("bez APP_URL sitemap nevznikne", () => {
  assert.equal(buildSitemapXml(""), null);
  assert.equal(buildSitemapXml("  "), null);
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

test("spa-routes obsahuje každou veřejnou routu, admin a přesměrování home", () => {
  const { routes, redirects } = buildSpaRoutes();
  for (const route of listSeoRoutes()) assert.ok(routes.includes(route), route);
  assert.ok(routes.includes(""));
  assert.ok(routes.includes("admin/reservations"));
  assert.equal(redirects.home, "");
  assert.equal(new Set(routes).size, routes.length);
  for (const from of Object.keys(redirects)) assert.ok(!routes.includes(from), `${from} je routa i přesměrování`);
});

test("strukturovaná data: web a ubytování z datových souborů, absolutní adresy", () => {
  const data = buildStructuredData("https://roubenyraj.cz/", { minNightPrice: 3700 });
  const website = data["@graph"].find((node) => node["@type"] === "WebSite");
  const lodging = data["@graph"].find((node) => node["@type"] === "LodgingBusiness");

  assert.equal(website.url, "https://roubenyraj.cz/");
  assert.equal(lodging.name, website.name);
  assert.equal(lodging.address.streetAddress, property.address.street);
  assert.equal(lodging.address.postalCode, property.address.zip);
  assert.equal(lodging.geo.latitude, property.address.gps.lat);
  assert.equal(lodging.geo.longitude, property.address.gps.lng);
  assert.equal(lodging.telephone, contact.phoneHref);
  assert.equal(lodging.numberOfRooms, property.capacity.bedrooms);
  assert.deepEqual(lodging.sameAs, [contact.social.facebook, contact.social.instagram]);
  assert.match(lodging.priceRange, /^od 3\s700 Kč za noc$/);
  assert.ok(lodging.image.length > 1);
  assert.ok(lodging.image.every((url) => url.startsWith("https://roubenyraj.cz/assets/")));
  assert.equal(lodging.aggregateRating, undefined);
});

test("strukturovaná data: bez APP_URL nic, bez ceny bez priceRange", () => {
  assert.equal(buildStructuredData(""), null);
  const lodging = buildStructuredData("https://roubenyraj.cz")["@graph"][1];
  assert.equal(lodging.priceRange, undefined);
});

test("serializeJsonLd escapuje <, aby text neukončil <script>", () => {
  const json = serializeJsonLd({ text: "</script><b>" });
  assert.ok(!json.includes("<"));
  assert.equal(JSON.parse(json).text, "</script><b>");
});
