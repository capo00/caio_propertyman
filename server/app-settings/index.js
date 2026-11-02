import { Mailer, Settings, Validator } from "caio-server";
import { EMPTY_PRIVATE, normalizeAppPrivate } from "./shape.js";

// The owner's part of the Settings (layer 3, collection `sys_settings`, part `app`): what she changes
// while the app runs, in the admin (Správa -> Nastavení, client/src/admin/settings.js). The stack
// stores it and provides the use cases; this file only says what the part looks like.
//
// Everything is in `app.private` -- readable by the server and `authorities` only (sys/settings/get
// returns no app values to the web). `app.public` stays empty.
//
//   ownerEmail       new requests and overdue deposits go here (until 2026-11 OWNER_EMAIL in .env)
//   arrival          keys, parking and Wi-Fi in the arrival e-mail; one text for every language
//   payment          the account in payment e-mails, the QR payment (IBAN) and on the invoice
//   invoiceSupplier  the supplier block of an invoice (docs/proposal-invoice-pdf.md)
//
// Until 2026-11 these were constants in server/config.js (`arrivalInfo` was all null): the values
// are copied into the database once by tools/migrate-settings.js. Nothing has a default in code --
// what is empty is left out of the e-mail, and an invoice without a supplier is refused in production.

const CODE = "caio-propertyman/settings";

// An IBAN as the QR payment (SPAYD) needs it: without spaces, upper case. The check digits are not
// verified -- the owner copies it from her bank, and SPAYD itself rejects only the shape.
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/;
const BIC = /^[A-Z0-9]{8}(?:[A-Z0-9]{3})?$/;

const compact = (value) => (typeof value === "string" ? value.replace(/\s+/g, "").toUpperCase() : value);

/**
 * Validator of `app.private` for `App.init({ settings })` and tools/migrate-settings.js: trimmed
 * texts with a length limit, the e-mail, IBAN and BIC checked; an unknown key is an error. Throws
 * one 400 with every bad field (`$.ownerEmail`, `$.payment.iban`, …), which the stack puts under
 * `$.app.private.` for the settings screen.
 */
export function validatePrivate(value) {
  const v = Validator.create(CODE);
  const text = (maxLength) => (item, key) => v.string(item, key, { maxLength });

  const ownerEmail = v.string(value?.ownerEmail, "ownerEmail", { maxLength: 254 });
  if (ownerEmail) v.check(Mailer.validateEmail(ownerEmail), "ownerEmail");

  const result = {
    ownerEmail,
    arrival: v.shape(value?.arrival, "arrival", {
      keys: text(1000),
      parking: text(1000),
      wifiName: text(100),
      wifiPassword: text(100),
    }),
    payment: v.shape(value?.payment, "payment", {
      accountNumber: text(50),
      iban: (item, key) => v.string(compact(item), key, { maxLength: 34, pattern: IBAN }),
      bic: (item, key) => v.string(compact(item), key, { maxLength: 11, pattern: BIC }),
    }),
    invoiceSupplier: v.shape(value?.invoiceSupplier, "invoiceSupplier", {
      name: text(200),
      // Several lines (street, town) -- printed as they are.
      address: text(500),
      ico: text(20),
      // The whole footer sentence ("Zapsán v živnostenském rejstříku vedeném …").
      registry: text(500),
    }),
  };
  for (const key of Object.keys(value ?? {})) if (!Object.hasOwn(EMPTY_PRIVATE, key)) v.invalid(key);
  v.assert();
  return normalizeAppPrivate(result);
}

/** The owner's settings now (`Settings.get()`: a snapshot at most a minute old). */
export async function readAppSettings() {
  const { app } = await Settings.get();
  return normalizeAppPrivate(app.private);
}

export { normalizeAppPrivate };

export default { normalizeAppPrivate, validatePrivate, readAppSettings };
