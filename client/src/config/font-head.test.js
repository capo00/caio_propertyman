import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildFontHeadTags, listFontUrls } from "./font-head.js";

const FONTS_CSS = readFileSync(new URL("../fonts.css", import.meta.url), "utf8");
// Soubory leží v client/src/assets/, do buildu se kopírují pod /assets/.
const ASSETS_DIR = new URL("../assets/", import.meta.url);

test("fonts.css odkazuje na existující písma", () => {
  const urls = listFontUrls(FONTS_CSS);
  assert.equal(urls.length, 4, urls.join(", "));
  for (const url of urls) {
    assert.ok(existsSync(new URL(url.replace(/^\/assets\//, ""), ASSETS_DIR)), `${url} neexistuje`);
  }
});

test("každé písmo má preload s crossorigin", () => {
  const tags = buildFontHeadTags(FONTS_CSS);
  const preloads = tags.filter((tag) => tag.tag === "link");
  assert.deepEqual(
    preloads.map((tag) => tag.attrs.href),
    listFontUrls(FONTS_CSS),
  );
  for (const { attrs } of preloads) {
    assert.equal(attrs.rel, "preload");
    assert.equal(attrs.as, "font");
    assert.equal(attrs.type, "font/woff2");
    assert.equal(attrs.crossorigin, true);
  }
});

test("<style> nese všechny @font-face a žádné komentáře", () => {
  const style = buildFontHeadTags(FONTS_CSS).find((tag) => tag.tag === "style");
  assert.equal(style.children.match(/@font-face/g)?.length, 4);
  assert.doesNotMatch(style.children, /\/\*/);
});

test("main.jsx fonts.css neimportuje (deklarace by přišly podruhé a pozdě)", () => {
  const main = readFileSync(new URL("../main.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(main, /^import\s+["'].*fonts\.css["']/m);
});
