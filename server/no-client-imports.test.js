// The server must not import from client/: client/ is not uploaded to App Engine
// (.gcloudignore), so such an import works locally and crashes the server in production on
// start (v0.2.7, server/email/send.js -> client/src/config/routes.js). Code shared by both
// belongs to shared/.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIENT = path.join(ROOT, "client") + path.sep;
const RUNTIME_DIRS = ["server", "shared"];
const IMPORT = /(?:^|[^\w.])(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

function runtimeFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : runtimeFiles(full);
    return /\.(m?js)$/.test(entry.name) && !/\.test\.m?js$/.test(entry.name) ? [full] : [];
  });
}

test("server and shared code never import from client/", () => {
  const offenders = [];
  for (const dir of RUNTIME_DIRS) {
    for (const file of runtimeFiles(path.join(ROOT, dir))) {
      for (const match of fs.readFileSync(file, "utf8").matchAll(IMPORT)) {
        const spec = match[1] ?? match[2];
        if (!spec.startsWith(".")) continue;
        if (path.resolve(path.dirname(file), spec).startsWith(CLIENT)) {
          offenders.push(`${path.relative(ROOT, file)} -> ${spec}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, []);
});
