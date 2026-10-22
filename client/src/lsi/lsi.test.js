import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import config from "../../../server/config.js";

// cs.json is the source, the other languages are its translation (import-lsi.js). A translation
// missing a key would show an empty spot on the web, and in dev with a Czech browser nobody notices.
const DIR = new URL("./", import.meta.url);
const FILES = readdirSync(DIR).filter((file) => file.endsWith(".json"));
const RAW = Object.fromEntries(FILES.map((file) => [file.replace(".json", ""), readFileSync(new URL(file, DIR), "utf8")]));
const LSI = Object.fromEntries(Object.entries(RAW).map(([lang, raw]) => [lang, JSON.parse(raw)]));

/** Flat `{ "a.b.c": "text" }` from an LSI tree. */
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

// Space before "%": cs, sk and de write "25 %" with a NON-BREAKING space, en and pl "25%"
// without one. The same rule as `percent` in server/email/format.js.
const PERCENT_WITH_SPACE = new Set(["cs", "sk", "de"]);

test("LSI files are exactly the web languages (package.json `caio.languages`, server/config.js `languages`)", () => {
  assert.deepEqual(Object.keys(LSI).sort(), [...config.languages].sort());
});

for (const lang of Object.keys(LSI)) {
  const flat = flatten(LSI[lang]);

  test(`${lang}.json: percentages are written by the language's rule`, () => {
    for (const [path, text] of Object.entries(flat)) {
      for (const [, space] of text.matchAll(/\d(\s*)%/g)) {
        const expected = PERCENT_WITH_SPACE.has(lang) ? "\u00a0" : "";
        assert.equal(space, expected, `${lang} ${path}: "${text}"`);
      }
    }
  });

  // A non-breaking space is invisible in the file and an editor may turn it into a plain one --
  // it is written as the JSON escape (backslash, u00a0), so it can be seen in the source.
  test(`${lang}.json: a non-breaking space is written as the \\u00a0 escape`, () => {
    assert.ok(!RAW[lang].includes("\u00a0"), `${lang}.json has a literal non-breaking space`);
  });
}

for (const lang of Object.keys(LSI).filter((lang) => lang !== "cs")) {
  const flat = flatten(LSI[lang]);

  test(`${lang}.json has the same keys as cs.json`, () => {
    assert.deepEqual(Object.keys(flat).sort(), Object.keys(SOURCE).sort());
  });

  test(`${lang}.json: no empty text and the same \${…} placeholders as cs.json`, () => {
    for (const [path, text] of Object.entries(flat)) {
      assert.equal(typeof text, "string", `${lang} ${path}`);
      assert.ok(text.trim(), `${lang} ${path} is empty`);
      assert.deepEqual(placeholders(text), placeholders(SOURCE[path] ?? ""), `${lang} ${path}`);
    }
  });

  // The same limit as for Czech in config/seo.test.js.
  test(`${lang}.json: search engine descriptions have 40–155 characters`, () => {
    for (const [route, text] of Object.entries(LSI[lang].seo)) {
      assert.ok(text.length >= 40 && text.length <= 155, `${lang} seo.${route} has ${text.length} characters`);
    }
  });
}
