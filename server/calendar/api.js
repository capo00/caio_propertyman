import { Error as AppError } from "caio-server";
import * as IcalExport from "../services/ical-export.js";
import { syncAll } from "../services/ical-import.js";

const CODE = "caio-propertyman/calendar";

export default {
  // Feed for Booking.com and e-chalupy. It must be a use case, not an app.get added after App.init --
  // the path /calendar/ical has no extension, so the catch-all /*splat would swallow it and return index.html.
  "calendar/ical": {
    method: "get",
    fn: async ({ res }) => {
      const body = await IcalExport.build();
      res.type("text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'inline; filename="roubenka.ics"');
      // Portals fetch every few tens of minutes; an extra cache would widen the overbooking window.
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.send(body);
      // false = "I sent the response myself", the framework no longer sends JSON.
      return false;
    },
  },

  // Triggered by Cloud Scheduler. auth: ["authorities"] is not possible here -- the cron does not log in --
  // so it is protected by a shared secret, or by the X-Appengine-Cron header (App Engine strips it
  // from foreign callers, so it is trustworthy).
  //
  // The owner has a separate use case `icalFeed/sync` with `auth: ["authorities"]` for the same thing
  // (design-v2.md § 8): a shared secret for a machine and a role for a human are two different
  // security considerations and do not belong in one condition. Since v2 both take the feeds from the
  // `ical_feed` collection, not from `.env`.
  "calendar/sync": {
    method: "post",
    fn: async ({ req }) => {
      const expected = process.env.ICAL_SYNC_SECRET;
      const provided = req?.headers?.["x-ical-sync-secret"];
      const isCron = req?.headers?.["x-appengine-cron"] === "true";

      if (!isCron) {
        if (!expected) {
          // Without a configured secret the endpoint would be open to anyone. Better broken
          // than publicly triggerable.
          throw new AppError.Failed("ICAL_SYNC_SECRET is not set, sync is disabled.", {
            status: 503,
            code: `${CODE}/syncNotConfigured`,
          });
        }
        if (provided !== expected) {
          throw new AppError.Failed("Invalid secret.", { status: 401, code: `${CODE}/unauthorized` });
        }
      }

      return syncAll();
    },
  },
};
