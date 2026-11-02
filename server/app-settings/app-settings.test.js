import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeAppPrivate, validatePrivate } from "./index.js";
import { SAMPLE_SETTINGS } from "../email/samples.js";
import { missingSupplierFields, supplierSnapshot } from "../invoice/draft.js";

// Keys of the 400 a validator throws: `$.payment.iban`, … (the stack moves them under `$.app.private.`).
function badKeys(fn) {
  try {
    fn();
  } catch (e) {
    assert.equal(e.status, 400);
    const map = e.paramMap ?? {};
    return [...Object.keys(map.invalidValueKeyMap ?? {}), ...Object.keys(map.missingKeyMap ?? {})].sort();
  }
  assert.fail("expected a 400");
}

test("normalizeAppPrivate: full shape with null for anything not stored", () => {
  assert.deepEqual(normalizeAppPrivate(undefined), {
    ownerEmail: null,
    arrival: { keys: null, parking: null, wifiName: null, wifiPassword: null },
    payment: { accountNumber: null, iban: null, bic: null },
    invoiceSupplier: { name: null, address: null, ico: null, registry: null },
  });
  assert.equal(normalizeAppPrivate({ payment: { iban: "CZ98" }, extra: 1 }).payment.iban, "CZ98");
  assert.deepEqual(normalizeAppPrivate(SAMPLE_SETTINGS), SAMPLE_SETTINGS);
});

test("validatePrivate: the values from server/config.js pass unchanged", () => {
  assert.deepEqual(validatePrivate(SAMPLE_SETTINGS), SAMPLE_SETTINGS);
});

test("validatePrivate: IBAN and BIC without spaces in upper case, texts trimmed", () => {
  const value = validatePrivate({
    payment: { accountNumber: " 6338724003/0800 ", iban: "cz98 0800 0000 0063 3872 4003", bic: "gibaczpx" },
    arrival: { keys: "  Schránka u branky  " },
  });
  assert.deepEqual(value.payment, { accountNumber: "6338724003/0800", iban: "CZ9808000000006338724003", bic: "GIBACZPX" });
  assert.equal(value.arrival.keys, "Schránka u branky");
  assert.equal(value.ownerEmail, null);
});

test("validatePrivate: every bad field at once, unknown keys too", () => {
  assert.deepEqual(
    badKeys(() =>
      validatePrivate({
        ownerEmail: "not an e-mail",
        payment: { iban: "6338724003/0800", bic: "GIBA", owner: "x" },
        invoiceSupplier: { ico: "1".repeat(21) },
        notice: "x",
      }),
    ),
    ["$.invoiceSupplier.ico", "$.notice", "$.ownerEmail", "$.payment.bic", "$.payment.iban", "$.payment.owner"],
  );
});

test("invoice: missing supplier details and account are named, the snapshot prints DOPLNIT", () => {
  assert.deepEqual(missingSupplierFields(SAMPLE_SETTINGS), []);
  const empty = normalizeAppPrivate();
  assert.deepEqual(missingSupplierFields(empty), ["name", "address", "ico", "registry", "accountNumber"]);
  assert.deepEqual(supplierSnapshot(empty), { name: "DOPLNIT", address: "DOPLNIT", ico: "DOPLNIT", registry: "DOPLNIT", account: "DOPLNIT" });
  assert.equal(supplierSnapshot(SAMPLE_SETTINGS).account, "6338724003/0800");
});
