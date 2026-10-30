// The server must not import from client/: client/ is not uploaded to App Engine
// (.gcloudignore), so such an import works locally and crashes the server in production on
// start (v0.2.7, server/email/send.js -> client/src/config/routes.js). Code shared by both
// belongs to shared/.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkNoClientImports } from "caio-devkit/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("server and shared code never import from client/", () => {
  assert.deepEqual(checkNoClientImports({ root: ROOT, dirs: ["server", "shared"] }), []);
});
