import { readFileSync } from "fs";
import { Authentication } from "caio-server";
import reservationApi from "./reservation/api.js";
import calendarApi from "./calendar/api.js";
import reviewApi from "./review/api.js";
import icalFeedApi from "./ical-feed/api.js";

// Mapa use casů celé appky. `App.init` ji rozbalí jako { "sys/health": …, ...api }, takže
// vlastní klíč "sys/health" ten vestavěný přebije -- což je přesně to, co tady děláme.
// Vestavěný vrací jen { version }, a i to je prázdné, když se server nespustí přes npm skript.

// Verzi čteme z package.json, ne z process.env.npm_package_version -- ta proměnná existuje
// jen při startu přes npm skript, takže `node server/index.js` by hlásil undefined.
const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));

const sysApi = {
  "sys/health": {
    method: "get",
    fn: async () => ({
      version,
      env: process.env.NODE_ENV || "development",
      uptime: Math.round(process.uptime()),
      // Konfigurace se hlásí, ne testuje -- health musí odpovědět i když je Mongo dole,
      // aby šlo odlišit "server neběží" od "server běží, databáze ne".
      mongoConfigured: !!process.env.MONGODB_URI,
      smtpConfigured: !!(process.env.SMTP_HOST && process.env.OWNER_EMAIL),
    }),
  },
};

export default {
  ...sysApi,
  ...reservationApi,
  ...calendarApi,
  ...reviewApi,
  ...icalFeedApi,

  // Identity a role (`identity/adminList`, `identity/update`, `member/set`, …). Knihovna
  // je schválně nemountuje sama -- appka rozhoduje, jestli je chce (caio-server README,
  // `Authentication.createApi()`). Správa identit v liště adminu je komponenta z caio-ui
  // (`displayIdentity` v `client/src/admin/top.jsx`) a volá právě tyhle use casy; bez
  // tohohle řádku odpoví server `identity/adminList does not exist`.
  ...Authentication.createApi(),
};
