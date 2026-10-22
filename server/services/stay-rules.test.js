import { test } from "node:test";
import assert from "node:assert/strict";
import { assertStayRules } from "./stay-rules.js";

// A night belongs to the day it falls on (guests leave in the morning). Dates in 2027: 1 July is a Thursday.

const failsWith = (code) => (e) =>
  e.code === `caio-propertyman/stay/${code}` &&
  e.paramMap?.invalidValueKeyMap?.["$.dateTo"]?.[`caio-propertyman/stay/${code}`] != null;

test("outside summer and Christmas any stay passes", () => {
  assert.doesNotThrow(() => assertStayRules("2026-11-06", "2026-11-08"));
  assert.doesNotThrow(() => assertStayRules("2026-11-02", "2026-11-12"));
});

test("Christmas at least 3 nights", () => {
  assert.throws(() => assertStayRules("2026-12-23", "2026-12-25"), failsWith("christmasMinNights"));
  assert.doesNotThrow(() => assertStayRules("2026-12-23", "2026-12-26"));
});

test("July and August exactly 7 nights only", () => {
  assert.doesNotThrow(() => assertStayRules("2027-07-03", "2027-07-10"));
  assert.doesNotThrow(() => assertStayRules("2027-08-21", "2027-08-28"));
  assert.throws(() => assertStayRules("2027-07-03", "2027-07-06"), failsWith("summerWeekOnly"));
  assert.throws(() => assertStayRules("2027-07-03", "2027-07-05"), failsWith("summerWeekOnly"));
  assert.throws(() => assertStayRules("2027-07-03", "2027-07-17"), failsWith("summerWeekOnly")); // 14 nights
});

test("summer starts with the night of 1 July and ends with the night of 31 August", () => {
  // nights of 28–30 June -- still June
  assert.doesNotThrow(() => assertStayRules("2027-06-27", "2027-06-30"));
  // the night of 1 July is already in the season
  assert.throws(() => assertStayRules("2027-06-28", "2027-07-01"), failsWith("summerWeekOnly"));
  // a week across the start of the season is fine
  assert.doesNotThrow(() => assertStayRules("2027-06-26", "2027-07-03"));

  // the night of 31 August is still in the season, the nights of 1–3 September are not
  assert.throws(() => assertStayRules("2027-08-30", "2027-09-02"), failsWith("summerWeekOnly"));
  assert.doesNotThrow(() => assertStayRules("2027-08-31", "2027-09-03"));
});
