import { test } from "node:test";
import assert from "node:assert/strict";
import { assertStayRules } from "./stay-rules.js";

// Noc patří dni, na který připadá (ráno se odjíždí). Termíny 2027: 1. 7. je čtvrtek.

const failsWith = (code) => (e) =>
  e.code === `caio-propertyman/stay/${code}` && e.paramMap?.invalidValueKeyMap?.["$.dateTo"] != null;

test("mimo léto a Vánoce projde jakýkoli termín", () => {
  assert.doesNotThrow(() => assertStayRules("2026-11-06", "2026-11-08"));
  assert.doesNotThrow(() => assertStayRules("2026-11-02", "2026-11-12"));
});

test("Vánoce nejméně na 3 noci", () => {
  assert.throws(() => assertStayRules("2026-12-23", "2026-12-25"), failsWith("christmasMinNights"));
  assert.doesNotThrow(() => assertStayRules("2026-12-23", "2026-12-26"));
});

test("v červenci a srpnu jen přesně 7 nocí", () => {
  assert.doesNotThrow(() => assertStayRules("2027-07-03", "2027-07-10"));
  assert.doesNotThrow(() => assertStayRules("2027-08-21", "2027-08-28"));
  assert.throws(() => assertStayRules("2027-07-03", "2027-07-06"), failsWith("summerWeekOnly"));
  assert.throws(() => assertStayRules("2027-07-03", "2027-07-05"), failsWith("summerWeekOnly"));
  assert.throws(() => assertStayRules("2027-07-03", "2027-07-17"), failsWith("summerWeekOnly")); // 14 nocí
});

test("léto začíná nocí na 1. 7. a končí nocí na 31. 8.", () => {
  // noci na 28.–30. 6. -- ještě červen
  assert.doesNotThrow(() => assertStayRules("2027-06-27", "2027-06-30"));
  // noc na 1. 7. už je v sezóně
  assert.throws(() => assertStayRules("2027-06-28", "2027-07-01"), failsWith("summerWeekOnly"));
  // týden přes začátek sezóny je v pořádku
  assert.doesNotThrow(() => assertStayRules("2027-06-26", "2027-07-03"));

  // noc na 31. 8. ještě v sezóně, noci na 1.–3. 9. už ne
  assert.throws(() => assertStayRules("2027-08-30", "2027-09-02"), failsWith("summerWeekOnly"));
  assert.doesNotThrow(() => assertStayRules("2027-08-31", "2027-09-03"));
});
