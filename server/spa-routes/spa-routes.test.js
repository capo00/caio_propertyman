import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSpaRoutesMiddleware, resolveNavigation } from "./spa-routes.js";

const DATA = {
  routes: new Set(["", "cenik", "ubytovani/stodola"]),
  redirects: { home: "", preise: "cenik" },
};

// spa-routes.json, jak ho zapíše build: routy a přesměrování po jazycích.
const FILE = {
  routes: { cs: [...DATA.routes], de: ["", "preise", "unterkunft/scheune"] },
  redirects: { cs: DATA.redirects, de: { home: "", cenik: "preise" } },
};

test("resolveNavigation: známá routa projde, i s lomítkem na konci", () => {
  assert.equal(resolveNavigation("/", DATA), null);
  assert.equal(resolveNavigation("/cenik", DATA), null);
  assert.equal(resolveNavigation("/cenik/", DATA), null);
  assert.equal(resolveNavigation("/ubytovani/stodola", DATA), null);
  assert.equal(resolveNavigation("/ubytovani/stodola/", DATA), null);
});

test("resolveNavigation: přesměrování", () => {
  assert.deepEqual(resolveNavigation("/home", DATA), { status: 301, location: "/" });
  assert.deepEqual(resolveNavigation("/home/", DATA), { status: 301, location: "/" });
  assert.deepEqual(resolveNavigation("/preise", DATA), { status: 301, location: "/cenik" });
});

test("resolveNavigation: neznámá adresa je 404", () => {
  for (const pathname of ["/nesmysl", "/about", "/ubytovani/neexistuje", "/cenik/navic", "/%E0%A4%A"]) {
    assert.deepEqual(resolveNavigation(pathname, DATA), { status: 404 }, pathname);
  }
});

test("resolveNavigation: zděděné vlastnosti objektu nejsou přesměrování", () => {
  assert.deepEqual(resolveNavigation("/toString", DATA), { status: 404 });
  assert.deepEqual(resolveNavigation("/constructor", DATA), { status: 404 });
});

// --- middleware -------------------------------------------------------------------------

function makePublic({ withRoutes = true, uve = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spa-routes-"));
  fs.writeFileSync(path.join(dir, "index.html"), "<!doctype html>");
  if (withRoutes) {
    fs.writeFileSync(
      path.join(dir, "spa-routes.json"),
      JSON.stringify(FILE),
    );
  }
  if (uve) fs.writeFileSync(path.join(dir, `${uve}.html`), "<!doctype html>");
  return dir;
}

/** `document` = `res.locals.caioDocument`, jak ho nastaví caio-server (jazykové verze). */
function run(middleware, { method = "GET", url, accept = "html", document }) {
  const [reqPath] = url.split("?");
  const req = { method, path: reqPath, originalUrl: url, accepts: () => accept };
  const outcome = { next: false };
  const res = {
    locals: document ? { caioDocument: document } : {},
    redirect(status, location) {
      Object.assign(outcome, { status, location });
    },
    status(status) {
      outcome.status = status;
      return this;
    },
    sendFile(file) {
      outcome.file = file;
    },
  };
  middleware(req, res, () => {
    outcome.next = true;
  });
  return outcome;
}

const API = { "calendar/ical": {}, "reservation/list": {} };

test("middleware: neznámá adresa dostane 404 s index.html", () => {
  const publicPath = makePublic();
  const outcome = run(createSpaRoutesMiddleware({ api: API, publicPath }), { url: "/nesmysl" });
  assert.equal(outcome.status, 404);
  assert.equal(outcome.file, path.join(publicPath, "index.html"));
  assert.equal(outcome.next, false);
});

test("middleware: známá routa jde dál na SPA fallback", () => {
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath: makePublic() });
  assert.equal(run(middleware, { url: "/cenik" }).next, true);
  assert.equal(run(middleware, { url: "/cenik/" }).next, true);
  assert.equal(run(middleware, { url: "/" }).next, true);
});

test("middleware: 301 zachová query string", () => {
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath: makePublic() });
  const outcome = run(middleware, { url: "/home?utm_source=x" });
  assert.deepEqual([outcome.status, outcome.location], [301, "/?utm_source=x"]);
});

test("middleware: use casy pustí dál, i iCal feed s Accept */*", () => {
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath: makePublic() });
  assert.equal(run(middleware, { url: "/calendar/ical?token=abc" }).next, true);
  assert.equal(run(middleware, { url: "/calendar/ical/" }).next, true);
  assert.equal(run(middleware, { url: "/reservation/list" }).next, true);
  assert.equal(run(middleware, { url: "/sys/health" }).next, true);
  assert.equal(run(middleware, { url: "/auth/google/callback" }).next, true);
});

test("middleware: soubory, JSON, POST a UVE pustí dál", () => {
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath: makePublic({ uve: "shop" }) });
  assert.equal(run(middleware, { url: "/neexistuje.js" }).next, true);
  assert.equal(run(middleware, { url: "/nesmysl", accept: "json" }).next, true);
  assert.equal(run(middleware, { url: "/nesmysl", method: "POST" }).next, true);
  assert.equal(run(middleware, { url: "/shop/cokoli" }).next, true);
});

test("middleware: HEAD se chová jako GET", () => {
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath: makePublic() });
  assert.equal(run(middleware, { url: "/nesmysl", method: "HEAD" }).status, 404);
});

test("middleware: bez spa-routes.json se chová jako dřív", (t) => {
  t.mock.method(console, "warn", () => {});
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath: makePublic({ withRoutes: false }) });
  assert.equal(run(middleware, { url: "/nesmysl" }).next, true);
});

// --- jazykové verze ------------------------------------------------------------------

const de = (publicPath, rest) => ({
  language: "de",
  prefix: "/de",
  path: rest,
  file: path.join(publicPath, "index.de.html"),
});

test("middleware: jazyková verze -- známá routa jde dál, kořen jazyka taky", () => {
  const publicPath = makePublic();
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath });
  assert.equal(run(middleware, { url: "/de/preise", document: de(publicPath, "/preise") }).next, true);
  assert.equal(run(middleware, { url: "/de/", document: de(publicPath, "/") }).next, true);
  assert.equal(run(middleware, { url: "/de/unterkunft/scheune", document: de(publicPath, "/unterkunft/scheune") }).next, true);
});

test("middleware: jazyková verze -- slug jiného jazyka a home přesměrují v jazyce adresy", () => {
  const publicPath = makePublic();
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath });
  const cenik = run(middleware, { url: "/de/cenik?x=1", document: de(publicPath, "/cenik") });
  assert.deepEqual([cenik.status, cenik.location], [301, "/de/preise?x=1"]);
  const home = run(middleware, { url: "/de/home", document: de(publicPath, "/home") });
  assert.deepEqual([home.status, home.location], [301, "/de/"]);
});

test("middleware: jazyková verze -- neznámá adresa je 404 s dokumentem jazyka", () => {
  const publicPath = makePublic();
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath });
  const outcome = run(middleware, { url: "/de/ubytovani", document: de(publicPath, "/ubytovani") });
  assert.equal(outcome.status, 404);
  assert.equal(outcome.file, path.join(publicPath, "index.de.html"));
});

test("middleware: /cs/… se vyhodnotí proti češtině a zůstane pod /cs", () => {
  const publicPath = makePublic();
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath });
  const cs = (rest) => ({ language: "cs", prefix: "/cs", path: rest, file: path.join(publicPath, "index.cs.html") });
  assert.equal(run(middleware, { url: "/cs/cenik", document: cs("/cenik") }).next, true);
  const preise = run(middleware, { url: "/cs/preise", document: cs("/preise") });
  assert.deepEqual([preise.status, preise.location], [301, "/cs/cenik"]);
});

test("middleware: jazyk, který spa-routes.json nezná, pustí dál", () => {
  const publicPath = makePublic();
  const middleware = createSpaRoutesMiddleware({ api: API, publicPath });
  const document = { language: "xx", prefix: "/xx", path: "/a", file: "x" };
  assert.equal(run(middleware, { url: "/xx/a", document }).next, true);
});
