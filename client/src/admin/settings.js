import { Utils } from "uu5g05";
import { lsi } from "../lsi/import-lsi.js";

// The owner's section of the Settings screen from caio-ui (`UiAuth.Settings`, a tab next to Mail
// and Registration; route `settings` and the identity menu, admin/app.jsx). Everything the owner
// changes while the app runs: her e-mail for new requests, the arrival details, the account and the
// invoice supplier -- the stack stores it as `app.private` of the Settings (`sys/settings/update`),
// the server validates it (server/app-settings/) and reads it for e-mails and invoices. Until 2026-11
// constants in server/config.js and OWNER_EMAIL in .env.
//
// The app writes only the fields and the conversion: `Fields` are its `Uu5Forms.Form*` inside the
// shared form, `toForm`/`fromForm` map `app` from the server onto their values and back. Field
// names must not start with `sys.` -- those are the stack's.
//
// `Fields` is lazy: this file goes into admin.js through admin/app.jsx, the fields with
// uu5g05-forms are downloaded when the owner opens the Settings.
const Fields = Utils.Component.lazy(() => import("./settings-fields.jsx"));

// Form field -> path in `app.private`. The form is flat, the stored part is grouped.
const FIELD_PATH = {
  ownerEmail: ["ownerEmail"],
  arrivalKeys: ["arrival", "keys"],
  arrivalParking: ["arrival", "parking"],
  wifiName: ["arrival", "wifiName"],
  wifiPassword: ["arrival", "wifiPassword"],
  accountNumber: ["payment", "accountNumber"],
  iban: ["payment", "iban"],
  bic: ["payment", "bic"],
  supplierName: ["invoiceSupplier", "name"],
  supplierAddress: ["invoiceSupplier", "address"],
  supplierIco: ["invoiceSupplier", "ico"],
  supplierRegistry: ["invoiceSupplier", "registry"],
};

const text = (value) => (typeof value === "string" ? value.trim() || null : null);

/** Stored `app` -> field values; whatever is not stored is an empty field. */
function toForm(app) {
  const stored = app.private ?? {};
  return Object.fromEntries(
    Object.entries(FIELD_PATH).map(([field, [group, key]]) => {
      const value = key ? stored[group]?.[key] : stored[group];
      return [field, value ?? ""];
    }),
  );
}

/**
 * Field values -> `app.private`. The server replaces the level as a whole, so every field goes back,
 * empty ones as null. `app.public` is not touched (the web reads nothing from the Settings).
 */
function fromForm(values) {
  const result = { arrival: {}, payment: {}, invoiceSupplier: {} };
  for (const [field, [group, key]] of Object.entries(FIELD_PATH)) {
    if (key) result[group][key] = text(values[field]);
    else result[group] = text(values[field]);
  }
  return { private: result };
}

// A server error on `$.app.private.<path>` -> the field it belongs to; anything else goes into the
// summary above the tabs.
const FIELD_BY_PATH = Object.fromEntries(Object.entries(FIELD_PATH).map(([field, path]) => [path.join("."), field]));

function fieldOf(path) {
  const match = /^\$\.app\.private\.(.+)$/.exec(path);
  return (match && FIELD_BY_PATH[match[1]]) ?? null;
}

const APP_SETTINGS = {
  label: lsi("admin", "settings", "label"),
  Fields,
  toForm,
  fromForm,
  fieldOf,
};

export { APP_SETTINGS };
