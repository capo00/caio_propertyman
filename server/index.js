import { App } from "caio-server";
import api from "./api.js";

// publicPath se resolvuje z process.cwd() -- nepředávat. App.init namountuje statiku,
// /auth/*, use casy z `api` a nakonec catch-all /*splat na index.html.
App.init({ api });
