// The new-reservation form has arrival and departure as one field, `dateRange`
// (Uu5Forms.FormDateRange, value `[from, to]`). The server keeps two: `dateFrom` and `dateTo`
// (`reservation/createManual`, `reservation/createEmailPreview`). The value is split on the way
// out, and the server's field errors on those two go back onto the range field -- the same thing
// caio-server `Validator.renameFields` does for the public form, only on the client, so the
// admin endpoints keep reporting `dateFrom`/`dateTo`.

export const DATE_RANGE_NAME = "dateRange";

const PART_LIST = ["dateFrom", "dateTo"];

/**
 * Form value -> dtoIn: `dateRange: [from, to]` becomes `dateFrom` + `dateTo`. A value without the
 * range (the edit form has two date fields) is returned as it is.
 */
export function splitDateRange(value) {
  if (!value || !Object.hasOwn(value, DATE_RANGE_NAME)) return value;
  const { [DATE_RANGE_NAME]: range, ...rest } = value;
  const [dateFrom, dateTo] = Array.isArray(range) ? range : [];
  return { ...rest, dateFrom, dateTo };
}

/**
 * The error with paramMap keys `$.dateFrom` / `$.dateTo` renamed to `$.dateRange` (field codes of
 * both merged), so that uu5g05-forms shows them at the range field. Changes the error in place
 * and returns it.
 */
export function renameDateRangeErrors(error) {
  const map = error?.paramMap;
  if (!map) return error;
  for (const kind of Object.keys(map)) {
    const renamed = {};
    for (const [key, codes] of Object.entries(map[kind] ?? {})) {
      const name = key.startsWith("$.") ? key.slice(2) : key;
      const target = PART_LIST.includes(name) ? `$.${DATE_RANGE_NAME}` : key;
      renamed[target] = { ...renamed[target], ...codes };
    }
    map[kind] = renamed;
  }
  return error;
}

/** `call(dtoIn)` for a form value with the range: split on the way out, field errors back onto the range. */
export function withDateRange(call) {
  return async (value) => {
    try {
      return await call(splitDateRange(value));
    } catch (e) {
      throw renameDateRangeErrors(e);
    }
  };
}
