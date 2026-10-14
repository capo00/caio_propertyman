import { App } from "caio-server";
import api from "./api.js";
import { createSpaRoutesMiddleware } from "./spa-routes/spa-routes.js";

// publicPath se resolvuje z process.cwd() -- nepředávat. App.init namountuje statiku,
// /auth/*, middleware z `middlewareList`, use casy z `api` a nakonec catch-all /*splat
// na index.html. `createSpaRoutesMiddleware` před ním vrací 404 pro neznámé adresy a 301
// pro přesměrování (docs/proposal-seo-404.md); `api` dostává, aby use casy pustil dál.
App.init({ api, middlewareList: [createSpaRoutesMiddleware({ api })] });
