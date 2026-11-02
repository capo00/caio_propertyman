import { AppConfig } from "caio-server";
import { addressLines } from "../../shared/contact.js";

// What the e-mails say about the cottage: name, address, check-in times and contact, all from
// caio.config.js (the same values the web shows). Until 2026-11 a copy in server/config.js `email`.
// What the owner changes while the app runs (her e-mail, the account, the arrival details) is not
// here but in the Settings (server/app-settings/), read per e-mail.
const { property, contact } = AppConfig.app;

export const SITE = Object.freeze({
  name: AppConfig.name,
  address: addressLines(property.address).join(", "),
  checkIn: property.checkIn,
  checkOut: property.checkOut,
  contact: Object.freeze({ phone: contact.phone, email: contact.email }),
});

/**
 * Address of the web for links in e-mails (the admin in the e-mail to the owner, pages in the
 * guest's language). APP_URL is the deployment's address (env file, layer 1), the same one
 * caio-server builds the password reset link from.
 */
export function webUrl() {
  return (process.env.APP_URL || "http://localhost:8080").replace(/\/+$/, "");
}
