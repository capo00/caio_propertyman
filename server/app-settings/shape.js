// The shape of the owner's part of the Settings (`app.private`, see index.js) and its normalization.
// Pure, without imports: the preview tools read the Settings without loading caio-server
// (tools/preview-settings.js), whose import would create the indexes of its Daos.

/** Every field of `app.private`, empty. The keys are also the shape the validator accepts. */
export const EMPTY_PRIVATE = Object.freeze({
  ownerEmail: null,
  arrival: Object.freeze({ keys: null, parking: null, wifiName: null, wifiPassword: null }),
  payment: Object.freeze({ accountNumber: null, iban: null, bic: null }),
  invoiceSupplier: Object.freeze({ name: null, address: null, ico: null, registry: null }),
});

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * `app.private` in its full shape: every group and field present, `null` where nothing is stored.
 * The templates and the invoice read it without checking whether a group exists.
 */
export function normalizeAppPrivate(value) {
  const stored = isObject(value) ? value : {};
  const group = (name) => {
    const source = isObject(stored[name]) ? stored[name] : {};
    return Object.fromEntries(Object.keys(EMPTY_PRIVATE[name]).map((key) => [key, source[key] || null]));
  };
  return {
    ownerEmail: stored.ownerEmail || null,
    arrival: group("arrival"),
    payment: group("payment"),
    invoiceSupplier: group("invoiceSupplier"),
  };
}
