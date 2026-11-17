import { test } from "node:test";
import assert from "node:assert/strict";
import { priceHintQuery, formatPrice } from "./price-hint.js";

const DATES_ONLY = { dateRange: ["2027-03-15", "2027-03-19"] };

test("priceHintQuery: a complete range is enough, like on the public web", () => {
  assert.deepEqual(priceHintQuery(DATES_ONLY), { dateFrom: "2027-03-15", dateTo: "2027-03-19" });
  // Guest fields change nothing: the price does not depend on them.
  assert.deepEqual(priceHintQuery({ ...DATES_ONLY, guestCount: 2, contactName: "Jana" }), { dateFrom: "2027-03-15", dateTo: "2027-03-19" });
  assert.deepEqual(priceHintQuery({ ...DATES_ONLY, reason: "onBehalf" }), { dateFrom: "2027-03-15", dateTo: "2027-03-19" });
});

test("priceHintQuery: an incomplete or reversed range asks nothing", () => {
  assert.equal(priceHintQuery({ ...DATES_ONLY, dateRange: undefined }), null);
  assert.equal(priceHintQuery({ ...DATES_ONLY, dateRange: ["2027-03-15", undefined] }), null);
  assert.equal(priceHintQuery({ ...DATES_ONLY, dateRange: ["2027-03-19", "2027-03-15"] }), null);
  assert.equal(priceHintQuery({ ...DATES_ONLY, dateRange: ["2027-03-15", "2027-03-15"] }), null);
  assert.equal(priceHintQuery(null), null);
});

test("priceHintQuery: a block has no price, so no hint", () => {
  assert.equal(priceHintQuery({ ...DATES_ONLY, reason: "maintenance" }), null);
  assert.equal(priceHintQuery({ ...DATES_ONLY, reason: "owner" }), null);
});

test("formatPrice: CZK without decimals, by language", () => {
  const nbsp = /[  ]/g;
  assert.equal(formatPrice(12000, "cs").replace(nbsp, " "), "12 000 Kč");
  assert.equal(formatPrice(12000.4, "en").replace(nbsp, " "), "CZK 12,000");
});
