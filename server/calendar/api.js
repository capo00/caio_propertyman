import { Error as AppError } from "caio-server";
import * as IcalExport from "../services/ical-export.js";
import { syncAll } from "../services/ical-import.js";

const CODE = "caio-propertyman/calendar";

export default {
  // Feed pro Booking.com a e-chalupy. Musí to být use case, ne app.get přidaný po App.init --
  // cesta /calendar/ical nemá příponu, takže by ji spolkl catch-all /*splat a vrátil index.html.
  "calendar/ical": {
    method: "get",
    fn: async ({ res }) => {
      const body = await IcalExport.build();
      res.type("text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="roubenka.ics"');
      // Portály stahují po desítkách minut; cache navíc by prodloužila okno pro overbooking.
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.send(body);
      // false = "odpověď jsem poslal sám", framework už neposílá JSON.
      return false;
    },
  },

  // Spouští Cloud Scheduler. auth: ["owner"] tady nejde -- cron se nepřihlásí -- takže se
  // chrání sdíleným secretem, případně hlavičkou X-Appengine-Cron (tu App Engine cizímu
  // volajícímu odstraní, takže je důvěryhodná).
  "calendar/sync": {
    method: "post",
    fn: async ({ req }) => {
      const expected = process.env.ICAL_SYNC_SECRET;
      const provided = req?.headers?.["x-ical-sync-secret"];
      const isCron = req?.headers?.["x-appengine-cron"] === "true";

      if (!isCron) {
        if (!expected) {
          // Bez nastaveného secretu by byl endpoint otevřený komukoli. Radši nefunkční
          // než veřejně spustitelný.
          throw new AppError.Failed("ICAL_SYNC_SECRET není nastavený, sync je zakázaný.", {
            status: 503,
            code: `${CODE}/syncNotConfigured`,
          });
        }
        if (provided !== expected) {
          throw new AppError.Failed("Neplatný secret.", { status: 401, code: `${CODE}/unauthorized` });
        }
      }

      return syncAll();
    },
  },
};
