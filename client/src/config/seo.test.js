import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import lsi from "../lsi/cs.json" with { type: "json" };
import nav from "./nav.js";
import { OG_LOCALE, getBreadcrumb, getSeoEntry, listSeoPages } from "./seo.js";
import { localizedPath } from "./routes.js";

const get = (path) => path.reduce((node, key) => node?.[key], lsi);
const INDEX_HTML = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const LANGUAGES = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8")).caio.languages;
const label = (page) => `${page.code}${page.space ? "/" + page.space : ""}`;

test("každá veřejná stránka má popis 40–155 znaků a titulek v LSI", () => {
  for (const page of listSeoPages()) {
    const entry = getSeoEntry(page);
    assert.ok(entry, `stránka ${label(page)} není v tabulce`);
    const description = get(entry.description);
    assert.equal(typeof description, "string", `${label(page)}: popis chybí v LSI`);
    assert.ok(
      description.length >= 40 && description.length <= 155,
      `${label(page)}: popis má ${description.length} znaků`,
    );
    if (entry.title) assert.equal(typeof get(entry.title), "string", `${label(page)}: titulek chybí v LSI`);
  }
});

test("každá stránka z menu je v tabulce", () => {
  for (const item of nav) assert.ok(getSeoEntry({ code: item.code }), `stránka ${item.code} chybí v config/seo.js`);
});

test("kanonické adresy jsou unikátní napříč jazyky", () => {
  const paths = LANGUAGES.flatMap((language) => listSeoPages().map((page) => localizedPath(language, page, LANGUAGES[0])));
  assert.equal(new Set(paths).size, paths.length);
});

test("neznámá stránka a neexistující prostor v tabulce nejsou", () => {
  for (const page of [{ code: "nesmysl" }, { code: "accommodation", space: "neexistuje" }, { code: "pricing", space: "stodola" }, undefined, null]) {
    assert.equal(getSeoEntry(page), null, JSON.stringify(page));
  }
});

test("statický popis v index.html odpovídá seo.home", () => {
  const content = (selector) => INDEX_HTML.match(new RegExp(`<meta ${selector} content="([^"]*)"`))?.[1];
  assert.equal(content('name="description"'), lsi.seo.home);
  assert.equal(content('property="og:description"'), lsi.seo.home);
  assert.equal(content('property="og:locale"'), OG_LOCALE[LANGUAGES[0]]);
});

test("og:locale má každý jazyk webu", () => {
  for (const language of LANGUAGES) assert.match(OG_LOCALE[language] ?? "", /^[a-z]{2}_[A-Z]{2}$/, language);
});

test("drobečková navigace: prostor má rozcestník, stránka první úrovně jen home", () => {
  const space = getBreadcrumb({ code: "accommodation", space: "stodola" });
  assert.deepEqual(
    space.map((crumb) => localizedPath("cs", crumb.page, "cs")),
    ["/", "/ubytovani", "/ubytovani/stodola"],
  );
  assert.deepEqual(
    space.map((crumb) => localizedPath("de", crumb.page, "cs")),
    ["/de/", "/de/unterkunft", "/de/unterkunft/scheune"],
  );
  assert.deepEqual(space[1].title, ["header", "nav", "ubytovani"]);
  for (const crumb of space) assert.equal(typeof get(crumb.title), "string", label(crumb.page));

  assert.deepEqual(
    getBreadcrumb({ code: "pricing" }).map((crumb) => localizedPath("cs", crumb.page, "cs")),
    ["/", "/cenik"],
  );
});

test("drobečková navigace: home a neznámá stránka žádnou nemají", () => {
  for (const page of [{ code: "home" }, { code: "nesmysl" }, { code: "accommodation", space: "neexistuje" }, null]) {
    assert.equal(getBreadcrumb(page), null, JSON.stringify(page));
  }
});
