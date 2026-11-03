import { test } from "node:test";
import assert from "node:assert/strict";
import { priceHintQuery, formatPrice } from "./price-hint.js";

const GUEST = { dateRange: ["2027-03-15", "2027-03-19"], guestCount: 2, contactName: "Jana" };

test("priceHintQuery: a guest with a complete range asks for the price of that range", () => {
  assert.deepEqual(priceHintQuery(GUEST), { dateFrom: "2027-03-15", dateTo: "2027-03-19" });
  // Any one contact field is a contact for the server (`contact.name || contact.email || contact.phone`).
  assert.deepEqual(priceHintQuery({ ...GUEST, contactName: undefined, contactPhone: "+420 600 000 000" }), { dateFrom: "2027-03-15", dateTo: "2027-03-19" });
});

test("priceHintQuery: an incomplete or reversed range asks nothing", () => {
  assert.equal(priceHintQuery({ ...GUEST, dateRange: undefined }), null);
  assert.equal(priceHintQuery({ ...GUEST, dateRange: ["2027-03-15", undefined] }), null);
  assert.equal(priceHintQuery({ ...GUEST, dateRange: ["2027-03-19", "2027-03-15"] }), null);
  assert.equal(priceHintQuery({ ...GUEST, dateRange: ["2027-03-15", "2027-03-15"] }), null);
  assert.equal(priceHintQuery(null), null);
});

test("priceHintQuery: without a guest (contact + guest count) the server computes no price, so no hint", () => {
  assert.equal(priceHintQuery({ ...GUEST, guestCount: undefined }), null);
  assert.equal(priceHintQuery({ ...GUEST, guestCount: 0 }), null);
  assert.equal(priceHintQuery({ ...GUEST, contactName: "  " }), null);
  assert.equal(priceHintQuery({ dateRange: GUEST.dateRange, reason: "maintenance" }), null);
});

test("formatPrice: CZK without decimals, by language", () => {
  const nbsp = /[  ]/g;
  assert.equal(formatPrice(12000, "cs").replace(nbsp, " "), "12 000 Kč");
  assert.equal(formatPrice(12000.4, "en").replace(nbsp, " "), "CZK 12,000");
});
