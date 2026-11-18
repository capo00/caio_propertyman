import { test } from "node:test";
import assert from "node:assert/strict";
import { sitemapEntries } from "./sitemap.js";

const ROUTES = {
  cs: ["", "cenik", "ubytovani/koupelny"],
  de: ["", "preise", "unterkunft/baeder"],
  en: ["", "prices", "accommodation/bathrooms"],
};

test("every page in every language, default language without a prefix", () => {
  const paths = sitemapEntries(ROUTES, ["cs", "de", "en"]).map((entry) => entry.path);
  assert.deepEqual(paths, ["/", "/de/", "/en/", "/cenik", "/de/preise", "/en/prices", "/ubytovani/koupelny", "/de/unterkunft/baeder", "/en/accommodation/bathrooms"]);
});

test("each entry points at all language versions of its page", () => {
  const pricing = sitemapEntries(ROUTES, ["cs", "de", "en"]).find((entry) => entry.path === "/de/preise");
  assert.deepEqual(pricing.alternates, { cs: "/cenik", de: "/de/preise", en: "/en/prices" });
});

test("a page missing in one language is left out there, not linked to nowhere", () => {
  const entries = sitemapEntries({ cs: ["", "x"], de: ["", null] }, ["cs", "de"]);
  assert.deepEqual(entries.map((entry) => entry.path), ["/", "/de/", "/x"]);
  assert.deepEqual(entries[2].alternates, { cs: "/x" });
});
