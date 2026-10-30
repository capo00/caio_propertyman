// Field errors of the forms come from caio-server's Validator (thrown from `fn`, so the error code
// is `<module>/invalidDtoIn`), and the client shows the lsi text for the field code
// (`errors[<error code>][<field code>]`, client/src/lsi). A code without a text in some language
// shows the generic "Something went wrong" instead of the message at the field.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Validator } from "caio-server";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LSI_DIR = path.join(ROOT, "client/src/lsi");
const LSI = Object.fromEntries(
  fs
    .readdirSync(LSI_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => [file.replace(".json", ""), JSON.parse(fs.readFileSync(path.join(LSI_DIR, file), "utf8"))]),
);

// Modules that validate their dtoIn with `Validator.create(CODE)`.
const PREFIX_LIST = ["reservation", "invoice", "icalFeed", "review"].map((module) => `caio-propertyman/${module}`);

function fieldCodesOf(error) {
  return Object.values(error.paramMap ?? {}).flatMap((keyMap) => Object.values(keyMap).flatMap((codeMap) => Object.keys(codeMap)));
}

function missingTexts(errorCode, fieldCodeList) {
  const problems = [];
  for (const [lang, lsi] of Object.entries(LSI)) {
    const entry = lsi.errors?.[errorCode];
    if (typeof entry?.message !== "string") problems.push(`${lang}: errors["${errorCode}"].message`);
    for (const fieldCode of fieldCodeList) {
      if (typeof entry?.[fieldCode] !== "string") problems.push(`${lang}: errors["${errorCode}"]["${fieldCode}"]`);
    }
  }
  return problems;
}

test("every field code of the Validator collector has a text in every language", () => {
  const problems = [];
  for (const prefix of PREFIX_LIST) {
    const v = Validator.create(prefix);
    v.string("", "name", { required: true });
    v.int("abc", "count");
    const error = (() => {
      try {
        v.assert();
      } catch (e) {
        return e;
      }
    })();
    assert.equal(error?.code, `${prefix}/invalidDtoIn`);
    assert.deepEqual(fieldCodesOf(error).sort(), [`${prefix}/invalidValue`, `${prefix}/missingValue`]);
    problems.push(...missingTexts(error.code, fieldCodesOf(error)));
  }
  assert.deepEqual(problems, []);
});

test("an invalid record id is <module>/invalidDtoIn without a paramMap, so the form shows the module message", () => {
  for (const prefix of PREFIX_LIST) {
    assert.throws(
      () => Validator.readId({ id: "not-an-id" }, prefix),
      (e) => e.code === `${prefix}/invalidDtoIn` && e.status === 400 && e.paramMap === undefined,
    );
    assert.deepEqual(missingTexts(`${prefix}/invalidDtoIn`, []), []);
  }
});

test("every reason of a reservation field error has a text in every language", () => {
  const source = ["reservation/api.js", "reservation/crud.js"].map((file) => fs.readFileSync(path.join(ROOT, "server", file), "utf8")).join("\n");
  // `invalid("<reason>", …)` and `EMAIL_PROBLEMS` (`key: ["<reason>", "<Message>"]`) in api.js,
  // `{ reason: "<reason>" }` in crud.js.
  const reasonList = [...source.matchAll(/invalid\("(\w+)"|: \["(\w+)", "[A-Z]|reason: "(\w+)"/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  assert.ok(reasonList.includes("guestCountOutOfRange") && reasonList.includes("domainNotFound") && reasonList.includes("paidDateInFuture"));
  const prefix = "caio-propertyman/reservation";
  assert.deepEqual(missingTexts(`${prefix}/invalidDtoIn`, [...new Set(reasonList)].map((reason) => `${prefix}/${reason}`)), []);
});
