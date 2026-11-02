import { App } from "caio-server";
import api from "./api.js";
import serverConfig from "./server.config.js";
import { validatePrivate } from "./app-settings/index.js";
import { createSpaRoutesMiddleware } from "./spa-routes/spa-routes.js";
import { createSitemap } from "./spa-routes/sitemap.js";

// publicPath se resolvuje z process.cwd() -- nepředávat. App.init namountuje statiku,
// /auth/*, middleware z `middlewareList`, use casy z `api` a nakonec catch-all /*splat
// na index.html. `createSpaRoutesMiddleware` před ním vrací 404 pro neznámé adresy a 301
// pro přesměrování (docs/proposal-seo-404.md); `api` dostává, aby use casy pustil dál.
// robots.txt a sitemap.xml generuje caio-server; obsah sitemapy jsou stránky ze spa-routes.json.
//
// `config` je server.config.js (caio-server ho validuje, neznámý klíč start shodí). `settings`
// je validátor části Nastavení, kterou mění majitelka (app-settings/); co je v Nastavení
// uložené, hlásí `sys/health` sám (`config.settings`), appka do něj nic nepřidává.
App.init({
  api,
  config: serverConfig,
  settings: { validatePrivate },
  middlewareList: [createSpaRoutesMiddleware({ api })],
  seo: { sitemap: createSitemap() },
});
