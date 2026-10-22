import { test } from "node:test";
import assert from "node:assert/strict";
import { createValidator, formParamMap, invalidDtoIn, readId, renameFormFields } from "./dto.js";

test("formParamMap: uu5g05-forms shape with $.-prefixed input names and the field code", () => {
  assert.deepEqual(formParamMap({ dateTo: true, note: false }, "Bad date.", "invalidValueKeyMap", "app/x/badDate"), {
    invalidValueKeyMap: { "$.dateTo": { "app/x/badDate": "Bad date." } },
  });
  assert.deepEqual(formParamMap({ name: true }, "Missing.", "missingKeyMap", "app/x/missingValue"), {
    missingKeyMap: { "$.name": { "app/x/missingValue": "Missing." } },
  });
  assert.equal(formParamMap({}, "x", "invalidValueKeyMap", "app/x/y"), undefined);
});

test("invalidDtoIn: <prefix>/invalidDtoIn with the reason as the field code", () => {
  const error = invalidDtoIn("app/x", "tooLong", "Too long.", { note: true });
  assert.equal(error.code, "app/x/invalidDtoIn");
  assert.deepEqual(error.paramMap, { invalidValueKeyMap: { "$.note": { "app/x/tooLong": "Too long." } } });
});

test("renameFormFields merges server fields into one form input", () => {
  const error = { paramMap: formParamMap({ dateFrom: true, dateTo: true, guestCount: true }, "Bad.", "invalidValueKeyMap", "app/x/y") };
  renameFormFields(error, { dateFrom: "stay", dateTo: "stay" });
  assert.deepEqual(Object.keys(error.paramMap.invalidValueKeyMap).sort(), ["$.guestCount", "$.stay"]);
});

test("validator errors carry field codes, missing id carries no paramMap", () => {
  const missing = createValidator("app/x");
  missing.string("", "customerName", { required: true });
  assert.throws(() => missing.assert(), (e) => e.code === "app/x/invalidDtoIn" && e.paramMap?.missingKeyMap?.["$.customerName"]?.["app/x/missingValue"] != null);

  const bad = createValidator("app/x");
  bad.int("abc", "count");
  assert.throws(() => bad.assert(), (e) => e.paramMap?.invalidValueKeyMap?.["$.count"]?.["app/x/invalidValue"] != null);

  assert.throws(() => readId({}, "app/x"), (e) => e.code === "app/x/invalidDtoIn" && e.paramMap === undefined);
});

test("messages are English", () => {
  const v = createValidator("app/x");
  v.string("", "a", { required: true });
  assert.throws(() => v.assert(), (e) => /^[\x20-\x7E]+$/.test(e.message));
});
