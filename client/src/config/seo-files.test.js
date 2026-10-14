import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { buildRobotsTxt, buildSitemapXml, buildSpaRoutes, DISALLOWED_PATHS } from "./seo-files.js";
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
