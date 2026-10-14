import fs from "fs";
import path from "path";

// Skutečná 404 pro neznámé adresy a 301 pro přesměrování (docs/proposal-seo-404.md).
//
// Bez tohohle vrací SPA fallback caio-serveru 200 + index.html na cokoli a "nenalezeno"
// vykreslí až klient -- Google tomu říká soft 404. Seznam rout server sám nezná (client/
// se na App Engine nenahrává), zapisuje ho build do public/spa-routes.json
// (client/src/config/seo-files.js, `buildSpaRoutes`).
//
// Montuje se přes `App.init({ middlewareList })`: za statikou a /auth, PŘED use casy
// a SPA fallbackem. Use casy se registrují až po middlewareList, takže každou jejich cestu
// je potřeba pustit dál -- jinak by třeba iCal feed pro portály (`calendar/ical`, stahovač
// posílá `Accept: */*`, tedy "chce HTML") dostal 404 místo kalendáře.

const ROUTES_FILE = "spa-routes.json";
const FRAMEWORK_PREFIX = /^\/(auth|sys)(\/|$)/;

// Stejná pravidla pro UVE jako caio-server (app.js, `resolveUve`): public/<segment>.html
// odpovídá na /<segment> a všechno pod ním.
const UVE_SEGMENT = /^[a-z0-9][a-z0-9_-]*$/i;
const RESERVED_UVE = new Set(["login", "index"]);

function isUve(publicPath, reqPath) {
  const name = reqPath.split("/")[1];
  if (!name || !UVE_SEGMENT.test(name) || RESERVED_UVE.has(name.toLowerCase())) return false;
  return fs.existsSync(path.join(publicPath, `${name}.html`));
}

/**
 * Co udělat s navigací na `pathname`: `null` = známá routa, pustit dál (SPA fallback vrátí
 * index.html s 200); `{ status: 301, location }` = přesměrovat; `{ status: 404 }`.
 *
 * Lomítko na konci se při porovnání ignoruje: `/cenik/` je známá routa, ne 404. Že ji
 * klient (uu5g05 RouteProvider) dnes nevykreslí, je věc stacku, tady se to neřeší.
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
 * Načte public/spa-routes.json a drží ho v paměti; znovu ho čte jen po změně souboru,
 * protože `caio-devkit start` zapisuje do public/ až za běhu serveru. Bez souboru
 * (vývoj před prvním buildem) vrací `null` a middleware se chová jako dřív.
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
        console.warn(`[spa-routes] ${file} chybí, 404 pro neznámé adresy je vypnutá (chybí build?).`);
        warned = true;
      }
      return null;
    }
    if (stat.mtimeMs !== cached.mtimeMs) {
      const { routes, redirects } = JSON.parse(fs.readFileSync(file, "utf8"));
      cached = { mtimeMs: stat.mtimeMs, data: { routes: new Set(routes), redirects } };
    }
    return cached.data;
  };
}

export function createSpaRoutesMiddleware({ api = {}, publicPath = path.resolve(process.cwd(), "public") } = {}) {
  const useCasePaths = new Set(Object.keys(api).map((useCase) => `/${useCase}`));
  const loadRoutes = createRoutesLoader(publicPath);

  return (req, res, next) => {
    // Stejné podmínky jako SPA fallback caio-serveru: jen navigace (GET/HEAD bez přípony),
    // která chce HTML. Všechno ostatní je soubor nebo volání use casu.
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (path.extname(req.path)) return next();
    // Bez lomítka na konci: express routuje volně, takže `/calendar/ical/` je pořád use case.
    if (useCasePaths.has(req.path.replace(/\/+$/, "")) || FRAMEWORK_PREFIX.test(req.path)) return next();
    if (req.accepts(["html", "json"]) !== "html") return next();
    if (isUve(publicPath, req.path)) return next();

    const data = loadRoutes();
    if (!data) return next();

    const result = resolveNavigation(req.path, data);
    if (!result) return next();

    if (result.status === 301) {
      const queryIndex = req.originalUrl.indexOf("?");
      const query = queryIndex === -1 ? "" : req.originalUrl.slice(queryIndex);
      return res.redirect(301, result.location + query);
    }

    // Tělo je pořád SPA: host uvidí stránku "nenalezeno" s menu, jen se status nelže.
    return res.status(404).sendFile(path.join(publicPath, "index.html"));
  };
}
