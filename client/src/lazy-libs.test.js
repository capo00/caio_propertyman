// Heavy uu5 libraries must not be among the static dependencies of index.js (docs/decisions.md,
// 2026-10-15): SystemJS runs index.js only after all its static imports are downloaded, so each
// of them delays the first render of the web. They are loaded lazily through `withLazy`:
//   uu5g05-forms, uu5extrasg01 -- components/reservation/reservation-form.jsx
//   uu5imagingg01              -- components/gallery-image.jsx
//   admin/**                   -- the admin is a UVE of its own (src/admin/index.html, admin.js);
//                                 no import leads there from the web, not even `import()`
//   caio-ui                    -- only by its root barrel `caio-ui`: with `sideEffects: false` the
//                                 bundler takes just what the web uses, so Crud (uu5tiles, Monaco)
//                                 and UiEcc (rich text) stay out of index.js; no `caio-ui/src/...`
// The check reads the sources (`checkLazyImports` of caio-devkit): only these files and the admin
// may import the libraries statically, and only a dynamic `import()` may lead to the lazy files.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLazyImports } from "caio-devkit/test";

const SRC = path.dirname(fileURLToPath(import.meta.url));

test("heavy libraries only lazily, the web never imports the admin", () => {
  assert.deepEqual(
    checkLazyImports({
      srcDir: SRC,
      heavy: ["uu5g05-forms", "uu5extrasg01", "uu5imagingg01"],
      lazyOnly: ["components/reservation/reservation-form.jsx", "components/gallery-image.jsx"],
      separate: [{ dir: "admin/", dynamic: false }],
      allow: { "caio-ui": ["caio-ui"] },
    }),
    [],
  );
});
