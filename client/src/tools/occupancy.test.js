import { test } from "node:test";
import assert from "node:assert/strict";
import { occupiedNights, occupiedDays, dayRule } from "./occupancy.js";

const days = (list) => Object.fromEntries(occupiedDays(list));

test("occupiedNights: dateTo is exclusive, confirmed wins over tentative", () => {
  const nights = occupiedNights([
    { dateFrom: "2027-07-03", dateTo: "2027-07-05", tentative: true },
    { dateFrom: "2027-07-04", dateTo: "2027-07-06" },
  ]);
  assert.deepEqual(Object.fromEntries(nights), {
    "2027-07-03": "tentative",
    "2027-07-04": "confirmed",
    "2027-07-05": "confirmed",
  });
});

test("occupiedDays: check-in day busy in the afternoon, check-out day in the morning", () => {
  assert.deepEqual(days([{ dateFrom: "2027-07-03", dateTo: "2027-07-06" }]), {
    "2027-07-03": { am: null, pm: "confirmed" },
    "2027-07-04": { am: "confirmed", pm: "confirmed" },
    "2027-07-05": { am: "confirmed", pm: "confirmed" },
    "2027-07-06": { am: "confirmed", pm: null },
  });
});

test("occupiedDays: a changeover day is busy all day, half of each booking", () => {
  const result = days([
    { dateFrom: "2027-07-03", dateTo: "2027-07-05" },
    { dateFrom: "2027-07-05", dateTo: "2027-07-07", tentative: true },
  ]);
  assert.deepEqual(result["2027-07-05"], { am: "confirmed", pm: "tentative" });
  assert.deepEqual(result["2027-07-07"], { am: "tentative", pm: null });
  // One-night stay: both of its days are halves.
  assert.deepEqual(days([{ dateFrom: "2027-07-03", dateTo: "2027-07-04" }]), {
    "2027-07-03": { am: null, pm: "confirmed" },
    "2027-07-04": { am: "confirmed", pm: null },
  });
});

test("occupiedDays: crosses month and year boundaries", () => {
  const result = days([{ dateFrom: "2027-12-31", dateTo: "2028-01-02" }]);
  assert.deepEqual(Object.keys(result), ["2027-12-31", "2028-01-01", "2028-01-02"]);
});

test("dayRule: half days are selectable as one end of the range", () => {
  assert.deepEqual(dayRule({ am: null, pm: "confirmed" }), { disabled: "exceptEnd", kind: null, split: [null, "confirmed"] });
  assert.deepEqual(dayRule({ am: "tentative", pm: null }), { disabled: "exceptStart", kind: null, split: ["tentative", null] });
  assert.deepEqual(dayRule({ am: "confirmed", pm: "confirmed" }), { disabled: true, kind: "confirmed", split: null });
  assert.deepEqual(dayRule({ am: "confirmed", pm: "tentative" }), { disabled: true, kind: "confirmed", split: ["confirmed", "tentative"] });
});
