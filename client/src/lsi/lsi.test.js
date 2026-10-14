import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import config from "../../../server/config.js";

// cs.json je zdroj, ostatní jazyky jeho překlad (import-lsi.js). Překlad, kterému chybí klíč,
// by na webu ukázal prázdné místo, a to se v devu s českým prohlížečem nepozná.
const DIR = new URL("./", import.meta.url);
const LSI = Object.fromEntries(
  readdirSync(DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => [file.replace(".json", ""), JSON.parse(readFileSync(new URL(file, DIR), "utf8"))]),
);

/** Ploché `{ "a.b.c": "text" }` ze stromu LSI. */
function flatten(node, prefix = "", result = {}) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, path, result);
    else result[path] = value;
  }
  return result;
}

const SOURCE = flatten(LSI.cs);
const PLACEHOLDER = /\$\{\w+\}/g;
const placeholders = (text) => (text.match(PLACEHOLDER) ?? []).sort();

test("LSI soubory jsou přesně jazyky serveru (server/config.js `languages`)", () => {
  assert.deepEqual(Object.keys(LSI).sort(), [...config.languages].sort());
});

for (const lang of Object.keys(LSI).filter((lang) => lang !== "cs")) {
  const flat = flatten(LSI[lang]);

  test(`${lang}.json má stejné klíče jako cs.json`, () => {
    assert.deepEqual(Object.keys(flat).sort(), Object.keys(SOURCE).sort());
  });

  test(`${lang}.json: žádný prázdný text a stejné zástupky \${…} jako cs.json`, () => {
    for (const [path, text] of Object.entries(flat)) {
      assert.equal(typeof text, "string", `${lang} ${path}`);
      assert.ok(text.trim(), `${lang} ${path} je prázdný`);
      assert.deepEqual(placeholders(text), placeholders(SOURCE[path] ?? ""), `${lang} ${path}`);
    }
  });

  // Stejná mez jako u češtiny v config/seo.test.js.
  test(`${lang}.json: popisy pro vyhledávače mají 40–155 znaků`, () => {
    for (const [route, text] of Object.entries(LSI[lang].seo)) {
      assert.ok(text.length >= 40 && text.length <= 155, `${lang} seo.${route} má ${text.length} znaků`);
    }
  });
}
