import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import gallery, { heroPhoto } from "./content.js";

// The files are in client/src/assets/gallery/ and are copied into the build under /assets/gallery/.
const ASSETS_DIR = new URL("../../assets/", import.meta.url);
const fileExists = (url) => existsSync(new URL(url.replace(/^\/assets\//, ""), ASSETS_DIR));

// Captions are in lsi `gallery.<code>`; cs is the source, lsi.test.js keeps the other languages in step.
const captions = JSON.parse(readFileSync(new URL("../../lsi/cs.json", import.meta.url), "utf8")).gallery;

test("every photo has a full version, a thumbnail and a srcSet, and all files exist", () => {
  for (const item of gallery) {
    assert.ok(item.src && item.thumbnailSrc && item.srcSet, `${item.code}: src/thumbnailSrc/srcSet missing`);
    const srcSetUrls = item.srcSet.split(",").map((part) => part.trim().split(/\s+/)[0]);
    for (const url of [item.src, item.thumbnailSrc, ...srcSetUrls]) {
      assert.ok(fileExists(url), `${item.code}: ${url} does not exist (tools/gallery-variants.js?)`);
    }
  }
});

test("every photo has a caption (it is also the alt text)", () => {
  for (const item of gallery) {
    assert.ok(captions[item.code]?.trim(), `${item.code}: no gallery.${item.code} in cs.json`);
  }
});

test("srcSet ends with the full photo", () => {
  for (const item of gallery) {
    const last = item.srcSet.split(",").at(-1).trim().split(/\s+/)[0];
    assert.equal(last, item.src, item.code);
  }
});

test("the hero photo is the facade", () => {
  assert.equal(heroPhoto.code, "facade");
});
