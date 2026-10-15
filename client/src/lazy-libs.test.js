// Těžké uu5 knihovny nesmí být mezi statickými závislostmi index.js (docs/decisions.md,
// 2026-10-15): SystemJS index.js spustí až po stažení všech jeho statických importů,
// takže každá z nich brzdí první vykreslení webu. Načítají se líně přes `withLazy`:
//   uu5g05-forms, uu5extrasg01 -- components/reservation/reservation-form.jsx
//   uu5imagingg01              -- components/gallery-image.jsx
//   admin/**                   -- celý admin je lazy chunk (router.jsx)
// Test čte zdrojáky: knihovny smí staticky importovat jen tyhle soubory a na ně samé smí
// vést jen dynamický `import()`, nikdy statický import.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SRC = path.dirname(fileURLToPath(import.meta.url));
const HEAVY_LIBS = ["uu5g05-forms", "uu5extrasg01", "uu5imagingg01"];
const LAZY_MODULES = ["components/reservation/reservation-form.jsx", "components/gallery-image.jsx"];

const isAdmin = (file) => file.startsWith("admin/");

function listSources(dir = SRC) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSources(full);
    if (!/\.(jsx?|mjs)$/.test(entry.name) || entry.name.endsWith(".test.js")) return [];
    return [path.relative(SRC, full).replaceAll(path.sep, "/")];
  });
}

/** Specifikátory statických importů (`import x from "…"`, `import "…"`), ne `import()`. */
function staticImports(code) {
  return [...code.matchAll(/^\s*import\s+(?:[^;'"]*?\s+from\s+)?["']([^"']+)["']/gm)].map((match) => match[1]);
}

const sources = listSources();
const importsByFile = Object.fromEntries(
  sources.map((file) => [file, staticImports(readFileSync(path.join(SRC, file), "utf8"))]),
);

test("těžké knihovny staticky importují jen líně načítané moduly", () => {
  for (const [file, specifiers] of Object.entries(importsByFile)) {
    const heavy = specifiers.filter((specifier) => HEAVY_LIBS.includes(specifier));
    if (!heavy.length) continue;
    assert.ok(isAdmin(file) || LAZY_MODULES.includes(file), `${file} staticky importuje ${heavy.join(", ")}`);
  }
});

test("na líně načítané moduly nevede statický import", () => {
  for (const [file, specifiers] of Object.entries(importsByFile)) {
    for (const specifier of specifiers) {
      if (!specifier.startsWith(".")) continue;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
      assert.ok(!LAZY_MODULES.includes(target), `${file} staticky importuje ${target} -- musí přes withLazy`);
    }
  }
});

test("líně načítané moduly existují a knihovny opravdu importují", () => {
  for (const file of LAZY_MODULES) {
    assert.ok(importsByFile[file], `${file} neexistuje`);
    assert.ok(importsByFile[file].some((specifier) => HEAVY_LIBS.includes(specifier)), `${file} žádnou knihovnu neimportuje`);
  }
});
