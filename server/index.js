import { App } from "caio-server";
import api from "./api.js";
import { createSpaRoutesMiddleware } from "./spa-routes/spa-routes.js";
import { createSitemap } from "./spa-routes/sitemap.js";
import { ownerHealth } from "./api.js";

// publicPath se resolvuje z process.cwd() -- nepředávat. App.init namountuje statiku,
// /auth/*, middleware z `middlewareList`, use casy z `api` a nakonec catch-all /*splat
// na index.html. `createSpaRoutesMiddleware` před ním vrací 404 pro neznámé adresy a 301
// pro přesměrování (docs/proposal-seo-404.md); `api` dostává, aby use casy pustil dál.
// robots.txt a sitemap.xml generuje caio-server; obsah sitemapy jsou stránky ze spa-routes.json.
App.init({
  api,
  middlewareList: [createSpaRoutesMiddleware({ api })],
  seo: { sitemap: createSitemap() },
  health: ownerHealth,
});
