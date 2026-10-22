import { Error as AppError } from "caio-server";

// Reading and validating dtoIn. Shared by the use cases that came with the admin (v2).
//
// WHY THIS IS NOT IN THE `validator` FIELD: caio-server's `validator` has a broken error path --
// when it throws, `getDtoIn` sends 400 but DOES NOT STOP, and `fn` is still called with the
// invalid dtoIn. For a writing use case that means a DB write followed by a crash on
// ERR_HTTP_HEADERS_SENT. Validation therefore belongs in `fn` (as in v1, see reservation/api.js).
//
// SECOND THING: a GET dtoIn arrives entirely as strings. Query parameters are not converted,
// only values starting with `{` or `[` go through JSON.parse (caio-server-app/services/command.js) --
// so `pageInfo` arrives as an object, but numbers and dates as strings.
//
// MESSAGES: every error carries a code (`<app>/<module>/<error>`) and an English message. The
// message is for logs and API clients; the client shows its own text for the code from lsi
// (`errors.*`), so nothing here is ever read by a guest or the owner.

/**
 * `paramMap` that uu5g05-forms assigns to form fields:
 * `{ <kind>: { "$.<input name>": { <code>: <message> } } }`. `keyMap` is `{ <input name>: true }`.
 * `code` is what the client translates (uu5g05-forms `lsiError`: `[<error code>][<code>]`).
 *
 * CAUTION: the keys must be input names of the form that calls the use case. For a field the
 * form does not have, uu5g05-forms creates an invisible item with the error, and the form then
 * never passes validation until it is closed. That is why `readId` has no paramMap and the
 * public form renames `dateFrom`/`dateTo` to `stay` (`renameFormFields`).
 */
export function formParamMap(keyMap, message, kind, code) {
  const keyList = Object.keys(keyMap ?? {}).filter((key) => keyMap[key]);
  if (!keyList.length) return undefined;
  return { [kind]: Object.fromEntries(keyList.map((key) => [`$.${key}`, { [code]: message }])) };
}

/**
 * Renames fields in an error's paramMap (`{ dateFrom: "stay" }`) and returns the error. For a
 * form that builds one server field from a different input.
 */
export function renameFormFields(error, renameMap) {
  const paramMap = error?.paramMap;
  if (!paramMap) return error;
  for (const kind of Object.keys(paramMap)) {
    const renamed = {};
    for (const [key, errors] of Object.entries(paramMap[kind] ?? {})) {
      const name = key.startsWith("$.") ? key.slice(2) : key;
      const target = `$.${renameMap[name] ?? name}`;
      renamed[target] = { ...renamed[target], ...errors };
    }
    paramMap[kind] = renamed;
  }
  return error;
}

/**
 * Error that uu5g05-forms understands: `<codePrefix>/invalidDtoIn`, and the paramMap keys are
 * mapped to inputs with the field code `<codePrefix>/<reason>`.
 */
export function invalidDtoIn(codePrefix, reason, message, keyMap, kind = "invalidValueKeyMap") {
  return new AppError.Failed(message, {
    status: 400,
    code: `${codePrefix}/invalidDtoIn`,
    paramMap: formParamMap(keyMap, message, kind, `${codePrefix}/${reason}`),
  });
}

/** Error collector: gathers all bad fields at once, so the form does not light up one by one. */
export function createValidator(codePrefix) {
  const badMap = {};
  const missingMap = {};

  return {
    /** Non-empty string. */
    string(value, key, { required = false, maxLength = 1000 } = {}) {
      const text = value == null ? "" : String(value).trim();
      if (!text) {
        if (required) missingMap[key] = true;
        return null;
      }
      if (text.length > maxLength) badMap[key] = true;
      return text;
    },

    /** Integer in range. `undefined` passes when not `required`. */
    int(value, key, { required = false, min = -Infinity, max = Infinity } = {}) {
      if (value == null || value === "") {
        if (required) missingMap[key] = true;
        return null;
      }
      const number = Number(value);
      if (!Number.isInteger(number) || number < min || number > max) {
        badMap[key] = true;
        return null;
      }
      return number;
    },

    /** Value from an enumeration. */
    enumeration(value, key, allowed, { required = false } = {}) {
      if (value == null || value === "") {
        if (required) missingMap[key] = true;
        return null;
      }
      const text = String(value);
      if (!allowed.includes(text)) {
        badMap[key] = true;
        return null;
      }
      return text;
    },

    /** Custom condition when there is no typed reader for it. */
    check(condition, key) {
      if (!condition) badMap[key] = true;
    },

    /** Throws the collected errors, or does nothing. Called before the first DB write. */
    assert() {
      if (Object.keys(missingMap).length) {
        throw invalidDtoIn(codePrefix, "missingValue", "Required fields are missing.", missingMap, "missingKeyMap");
      }
      if (Object.keys(badMap).length) {
        throw invalidDtoIn(codePrefix, "invalidValue", "Some fields have an invalid value.", badMap);
      }
    },
  };
}

const MAX_PAGE_SIZE = 1000;

/** `pageInfo` for paged lists. Arrives over the query as an object (JSON.parse above). */
export function readPageInfo(dtoIn) {
  const { pageIndex, pageSize } = dtoIn?.pageInfo ?? {};
  return {
    // A negative index would be refused by Mongo (skip < 0) and end as a 500.
    pageIndex: Number.isInteger(Number(pageIndex)) && Number(pageIndex) >= 0 ? Number(pageIndex) : 0,
    // Integer 1–1000: 0 < pageSize < 1 would be taken by Mongo as limit(0) = no limit.
    pageSize: Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize)))) : 100,
  };
}

/** Required record id. */
export function readId(dtoIn, codePrefix) {
  const id = String(dtoIn?.id ?? "").trim();
  // No paramMap: `id` is not a field of any form (see formParamMap).
  if (!id) throw invalidDtoIn(codePrefix, "missingId", "The record id is missing.");
  return id;
}
