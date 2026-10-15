import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { buildHeroPreloadScript } from "./hero-preload.js";
import { heroPhoto, HERO_MOBILE_SIZES } from "../components/gallery/content.js";

/** Pustí skript nad falešným `location`/`document` a vrátí přidané `<link>`y. */
function run(pathname) {
  const appended = [];
  const document = {
    createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
    head: { appendChild: (el) => appended.push(el) },
  };
  vm.runInNewContext(buildHeroPreloadScript(), { location: { pathname }, document });
  return appended;
}

test("na home přednačte fotku hero: mobil srcSet, desktop plnou", () => {
  const [mobile, desktop] = run("/");
  assert.equal(mobile.rel, "preload");
  assert.equal(mobile.as, "image");
  assert.equal(mobile.fetchpriority, "high");
  assert.equal(mobile.imageSrcset, heroPhoto.srcSet);
  assert.equal(mobile.imageSizes, HERO_MOBILE_SIZES);
  assert.equal(mobile.media, "(max-width: 480px)");
  assert.equal(desktop.href, heroPhoto.src);
  assert.equal(desktop.media, "(min-width: 481px)");
});

test("na ostatních routách nepřednačte nic", () => {
  for (const pathname of ["/cenik", "/ubytovani/stodola", "/admin/reservations", "/neexistuje"]) {
    assert.deepEqual(run(pathname), [], pathname);
  }
});

test("skript nejde ukončit obsahem dat", () => {
  assert.doesNotMatch(buildHeroPreloadScript({ src: "</script>", srcSet: "x" }), /<\/script>/);
});
