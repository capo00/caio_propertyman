import fs from "fs";
import path from "path";

// A real 404 for unknown addresses and a 301 for redirects (docs/proposal-seo-404.md).
//
// Without this, caio-server's SPA fallback returns 200 + index.html for anything and "not found"
// is only rendered by the client -- Google calls that a soft 404. The server itself does not know
// the list of routes (client/ is not uploaded to App Engine), the build writes it to
// public/spa-routes.json (client/src/config/seo-files.js, `buildSpaRoutes`).
//
// Mounted via `App.init({ middlewareList })`: after the statics and /auth, BEFORE the use cases
// and the SPA fallback. Use cases are registered only after middlewareList, so each of their paths
// has to be let through -- otherwise e.g. the iCal feed for the portals (`calendar/ical`, the fetcher
// sends `Accept: */*`, i.e. "wants HTML") would get a 404 instead of the calendar.
//
// Language versions (docs/proposal-seo-lang-urls.md § 6.7): routes differ in each language
// (`cenik` / `preise`), so spa-routes.json has them per language. Which language the navigation
// is in, what its path without the prefix is and which document is its body is told by caio-server
// in `res.locals.caioDocument` (`/de/preise` -> de, `/preise`, index.de.html). A redirect stays in
// the language of the address (`/de/cenik` -> `/de/preise`) and a 404 gets that language's document.

const ROUTES_FILE = "spa-routes.json";
const FRAMEWORK_PREFIX = /^\/(auth|sys)(\/|$)/;

// The same UVE rules as caio-server (app.js, `resolveUve`): public/<segment>.html
// answers /<segment> and everything under it.
const UVE_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/i;
const RESERVED_UVE = new Set(["login", "index"]);

function isUve(publicPath, reqPath) {
  const name = reqPath.split("/")[1];
  if (!name || !UVE_SEGMENT.test(name) || RESERVED_UVE.has(name.toLowerCase())) return false;
  return fs.existsSync(path.join(publicPath, `${name}.html`));
}

/**
 * What to do with a navigation to `pathname`: `null` = known route, let it through (the SPA fallback
 * returns index.html with 200); `{ status: 301, location }` = redirect; `{ status: 404 }`.
 *
 * A trailing slash is ignored in the comparison: `/cenik/` is a known route, not a 404. That the
 * client (uu5g05 RouteProvider) does not render it today is the stack's business, not handled here.
 */
export function resolveNavigation(pathname, { routes, redirects }) {
  let route;
  try {
    route = decodeURIComponent(pathname);
  } catch {
    return { status: 404 };
  }
  route = route.replace(/^\/+/, "").replace(/\/+$/, "");

  if (Object.hasOwn(redirects, route)) return { status: 301, location: `/${redirects[route]}` };
  if (routes.has(route)) return null;
  return { status: 404 };
}

/**
 * Loads public/spa-routes.json and keeps it in memory; re-reads it only after the file changes,
 * because `caio-devkit start` writes to public/ only while the server runs. Without the file
 * (development before the first build) it returns `null` and the middleware behaves as before.
 */
function createRoutesLoader(publicPath) {
  const file = path.join(publicPath, ROUTES_FILE);
  let cached = { mtimeMs: null, data: null };
  let warned = false;

  return () => {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      if (!warned) {
        console.warn(`[spa-routes] ${file} is missing, 404 for unknown addresses is off (missing build?).`);
        warned = true;
      }
      return null;
    }
    if (stat.mtimeMs !== cached.mtimeMs) {
      const { routes, redirects } = JSON.parse(fs.readFileSync(file, "utf8"));
      const byLanguage = Object.fromEntries(
        Object.entries(routes).map(([language, list]) => [
          language,
          { routes: new Set(list), redirects: redirects[language] ?? {} },
        ]),
      );
      cached = { mtimeMs: stat.mtimeMs, data: { byLanguage, defaultLanguage: Object.keys(routes)[0] } };
    }
    return cached.data;
  };
}

export function createSpaRoutesMiddleware({ api = {}, publicPath = path.resolve(process.cwd(), "public") } = {}) {
  const useCasePaths = new Set(Object.keys(api).map((useCase) => `/${useCase}`));
  const loadRoutes = createRoutesLoader(publicPath);

  return (req, res, next) => {
    // The same conditions as caio-server's SPA fallback: only a navigation (GET/HEAD without an extension)
    // that wants HTML. Everything else is a file or a use case call.
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (path.extname(req.path)) return next();
    // Without the trailing slash: express routes loosely, so `/calendar/ical/` is still a use case.
    if (useCasePaths.has(req.path.replace(/\/+$/, "")) || FRAMEWORK_PREFIX.test(req.path)) return next();
    if (req.accepts(["html", "json"]) !== "html") return next();
    if (isUve(publicPath, req.path)) return next();

    const data = loadRoutes();
    if (!data) return next();

    // Without caio-server with languages (or without `caio.languages`) everything is in the default language.
    const document = res.locals?.caioDocument ?? {
      language: data.defaultLanguage,
      prefix: "",
      path: req.path,
      file: path.join(publicPath, "index.html"),
    };
    const routes = data.byLanguage[document.language];
    if (!routes) return next();

    const result = resolveNavigation(document.path, routes);
    if (!result) return next();

    if (result.status === 301) {
      const queryIndex = req.originalUrl.indexOf("?");
      const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
      return res.redirect(301, document.prefix + result.location + query);
    }

    // The body is still the SPA in the language of the address: the guest sees the "not found" page with
    // the menu, only the status does not lie.
    return res.status(404).sendFile(document.file);
  };
}
