import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import gallery, { heroPhoto } from "./content.js";

// Soubory leží v client/src/assets/gallery/, do buildu se kopírují pod /assets/gallery/.
const ASSETS_DIR = new URL("../../assets/", import.meta.url);
const fileExists = (url) => existsSync(new URL(url.replace(/^\/assets\//, ""), ASSETS_DIR));

test("každá fotka má plnou verzi, náhled a srcSet a všechny soubory existují", () => {
  for (const item of gallery) {
    assert.ok(item.src && item.thumbnailSrc && item.srcSet, `${item.code}: chybí src/thumbnailSrc/srcSet`);
    const srcSetUrls = item.srcSet.split(",").map((part) => part.trim().split(/\s+/)[0]);
    for (const url of [item.src, item.thumbnailSrc, ...srcSetUrls]) {
      assert.ok(fileExists(url), `${item.code}: ${url} neexistuje (tools/gallery-variants.js?)`);
    }
  }
});

test("srcSet končí plnou fotkou", () => {
  for (const item of gallery) {
    const last = item.srcSet.split(",").at(-1).trim().split(/\s+/)[0];
    assert.equal(last, item.src, item.code);
  }
});

test("fotka hero je fasáda", () => {
  assert.equal(heroPhoto.code, "facade");
});
