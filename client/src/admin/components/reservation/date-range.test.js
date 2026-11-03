import { test } from "node:test";
import assert from "node:assert/strict";
import { splitDateRange, renameDateRangeErrors, withDateRange } from "./date-range.js";

test("splitDateRange: the range becomes dateFrom + dateTo, the rest stays", () => {
  assert.deepEqual(splitDateRange({ dateRange: ["2027-07-03", "2027-07-10"], guestCount: 2 }), {
    guestCount: 2,
    dateFrom: "2027-07-03",
    dateTo: "2027-07-10",
  });
});

test("splitDateRange: an empty range sends no dates (the server reports them missing)", () => {
  const dtoIn = splitDateRange({ dateRange: undefined, reason: "owner" });
  assert.equal(dtoIn.dateFrom, undefined);
  assert.equal(dtoIn.dateTo, undefined);
  assert.equal("dateRange" in dtoIn, false);
  assert.deepEqual(JSON.parse(JSON.stringify(dtoIn)), { reason: "owner" });
});

test("splitDateRange: a value without the range (edit form) is unchanged", () => {
  const value = { dateFrom: "2027-07-03", dateTo: "2027-07-10" };
  assert.equal(splitDateRange(value), value);
});

test("renameDateRangeErrors: dateFrom / dateTo go to the range field, other fields stay", () => {
  const error = new Error("Invalid dtoIn.");
  error.paramMap = {
    invalidValueKeyMap: {
      "$.dateFrom": { "caio-propertyman/reservation/dateOccupied": "Taken." },
      "$.dateTo": { "caio-propertyman/reservation/stayTooShort": "Too short." },
      "$.contactEmail": { "caio-propertyman/reservation/invalidValue": "Invalid value." },
    },
    missingKeyMap: { "$.dateTo": { "caio-propertyman/reservation/missingValue": "Missing." } },
  };
  assert.equal(renameDateRangeErrors(error), error);
  assert.deepEqual(error.paramMap, {
    invalidValueKeyMap: {
      "$.dateRange": { "caio-propertyman/reservation/dateOccupied": "Taken.", "caio-propertyman/reservation/stayTooShort": "Too short." },
      "$.contactEmail": { "caio-propertyman/reservation/invalidValue": "Invalid value." },
    },
    missingKeyMap: { "$.dateRange": { "caio-propertyman/reservation/missingValue": "Missing." } },
  });
});

test("renameDateRangeErrors: an error without paramMap is returned as it is", () => {
  const error = new Error("Network");
  assert.equal(renameDateRangeErrors(error), error);
  assert.equal(renameDateRangeErrors(undefined), undefined);
});

test("withDateRange: the call gets dateFrom/dateTo and its field errors come back on the range", async () => {
  let sent;
  const ok = withDateRange(async (dtoIn) => ((sent = dtoIn), { id: "1" }));
  assert.deepEqual(await ok({ dateRange: ["2027-07-03", "2027-07-10"] }), { id: "1" });
  assert.deepEqual(sent, { dateFrom: "2027-07-03", dateTo: "2027-07-10" });

  const failing = withDateRange(async () => {
    const error = new Error("Taken");
    error.paramMap = { invalidValueKeyMap: { "$.dateFrom": { taken: "Taken." } } };
    throw error;
  });
  await assert.rejects(failing({ dateRange: ["2027-07-03", "2027-07-10"] }), (e) => {
    assert.deepEqual(e.paramMap, { invalidValueKeyMap: { "$.dateRange": { taken: "Taken." } } });
    return true;
  });
});
