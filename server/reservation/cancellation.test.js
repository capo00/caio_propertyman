import { test } from "node:test";
import assert from "node:assert/strict";
import { cancellationPercent, computeCancellation } from "./cancellation.js";

test("cancellation bands: 0–14 → 100 %, 15–30 → 50 %, 31–60 → 25 %, 61+ → 0 % (boundaries inclusive)", () => {
  const cases = [[0, 100], [14, 100], [15, 50], [30, 50], [31, 25], [60, 25], [61, 0], [365, 0]];
  for (const [days, percent] of cases) assert.equal(cancellationPercent(days), percent, `${days} dní`);
});

test("fee from the total price, refund only from what was paid, never negative", () => {
  const payment = { totalPrice: 9000, deposit: { amount: 4500, paidDate: "2026-10-01" }, balance: { dueDate: "2026-12-01", paidDate: null } };
  const r = computeCancellation({ dateFrom: "2026-11-07", payment }, "2026-10-10"); // 28 dní → 50 %
  assert.deepEqual(r, { date: "2026-10-10", daysToArrival: 28, percent: 50, fee: 4500, paid: 4500, refund: 0 });
  const far = computeCancellation({ dateFrom: "2027-01-10", payment }, "2026-10-10"); // 92 dní → zdarma
  assert.equal(far.refund, 4500);
  const late = computeCancellation({ dateFrom: "2026-10-12", payment }, "2026-10-10"); // 2 dny → 100 %
  assert.equal(late.fee, 9000);
  assert.equal(late.refund, 0);
});

test("arrival in the past counts as 0 days", () => {
  const r = computeCancellation({ dateFrom: "2026-10-01", payment: { totalPrice: 1000 } }, "2026-10-10");
  assert.equal(r.daysToArrival, 0);
  assert.equal(r.percent, 100);
});
