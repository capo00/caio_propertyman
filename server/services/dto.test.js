import { test } from "node:test";
import assert from "node:assert/strict";
import { createValidator, formParamMap, readId, renameFormFields } from "./dto.js";

test("formParamMap: uu5g05-forms shape with $.-prefixed input names", () => {
  assert.deepEqual(formParamMap({ dateTo: true, note: false }, "Odjezd musí být po příjezdu."), {
    invalidValueKeyMap: { "$.dateTo": { invalid: "Odjezd musí být po příjezdu." } },
  });
  assert.deepEqual(formParamMap({ name: true }, "Vyplňte.", "missingKeyMap"), { missingKeyMap: { "$.name": { missing: "Vyplňte." } } });
  assert.equal(formParamMap({}, "x"), undefined);
});

test("renameFormFields merges server fields into one form input", () => {
  const error = { paramMap: formParamMap({ dateFrom: true, dateTo: true, guestCount: true }, "Špatně.") };
  renameFormFields(error, { dateFrom: "stay", dateTo: "stay" });
  assert.deepEqual(Object.keys(error.paramMap.invalidValueKeyMap).sort(), ["$.guestCount", "$.stay"]);
});

test("validator errors carry field paramMap, missing id carries none", () => {
  const v = createValidator("app/x");
  v.string("", "customerName", { required: true });
  assert.throws(() => v.assert(), (e) => e.paramMap?.missingKeyMap?.["$.customerName"]?.missing != null);
  assert.throws(() => readId({}, "app/x"), (e) => e.paramMap === undefined);
});
