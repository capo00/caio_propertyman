import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import lsi from "../lsi/cs.json" with { type: "json" };
import nav from "./nav.js";
import { getSeoEntry, listSeoRoutes } from "./seo.js";

const get = (path) => path.reduce((node, key) => node?.[key], lsi);
const INDEX_HTML = readFileSync(new URL("../../index.html", import.meta.url), "utf8");

test("každá veřejná routa má popis 40–155 znaků a titulek v LSI", () => {
  for (const route of listSeoRoutes()) {
    const entry = getSeoEntry(route);
    assert.ok(entry, `routa ${route} není v tabulce`);
    const description = get(entry.description);
    assert.equal(typeof description, "string", `${route}: popis chybí v LSI`);
    assert.ok(
      description.length >= 40 && description.length <= 155,
      `${route}: popis má ${description.length} znaků`,
    );
    if (entry.title) assert.equal(typeof get(entry.title), "string", `${route}: titulek chybí v LSI`);
  }
});

test("každá routa z menu je v tabulce", () => {
  for (const item of nav) assert.ok(getSeoEntry(item.route), `routa ${item.route} chybí v config/seo.js`);
});

test("kanonické cesty jsou unikátní", () => {
  const paths = listSeoRoutes().map((route) => getSeoEntry(route).path);
  assert.equal(new Set(paths).size, paths.length);
});

test("neznámá routa, admin a neexistující prostor v tabulce nejsou", () => {
  for (const route of ["nesmysl", "admin/reservations", "ubytovani/neexistuje", undefined, null]) {
    assert.equal(getSeoEntry(route), null, String(route));
  }
});

test("statický popis v index.html odpovídá seo.home", () => {
  const content = (selector) => INDEX_HTML.match(new RegExp(`<meta ${selector} content="([^"]*)"`))?.[1];
  assert.equal(content('name="description"'), lsi.seo.home);
  assert.equal(content('property="og:description"'), lsi.seo.home);
});
