import { test } from "node:test";
import assert from "node:assert/strict";
import { createPaymentPlan, balanceAmount, nextVariableSymbol, variableSymbolPrefix } from "./payment.js";

const today = "2026-10-08";

test("deposit 50 % and balance 14 days before arrival when arrival is far", () => {
  const plan = createPaymentPlan({ totalPrice: 9000, dateFrom: "2026-11-07", today });
  assert.deepEqual(plan, {
    deposit: { amount: 4500, dueDate: "2026-10-11", paidDate: null },
    balance: { dueDate: "2026-10-24", paidDate: null },
  });
});

test("deposit is rounded to whole crowns", () => {
  assert.equal(createPaymentPlan({ totalPrice: 7801, dateFrom: "2026-12-01", today }).deposit.amount, 3901);
});

test("14 days or less before arrival: the whole amount at once (boundary)", () => {
  const at14 = createPaymentPlan({ totalPrice: 9000, dateFrom: "2026-10-22", today }); // přesně 14 dní
  assert.equal(at14.balance, null);
  assert.equal(at14.deposit.amount, 9000);
  assert.equal(at14.deposit.dueDate, "2026-10-11");

  const at15 = createPaymentPlan({ totalPrice: 9000, dateFrom: "2026-10-23", today }); // 15 dní
  assert.notEqual(at15.balance, null);
  assert.equal(at15.deposit.amount, 4500);
});

test("15–16 days before arrival: the deposit is never due after the balance", () => {
  const plan = createPaymentPlan({ totalPrice: 9000, dateFrom: "2026-10-23", today }); // doplatek do 9. 10.
  assert.equal(plan.balance.dueDate, "2026-10-09");
  assert.equal(plan.deposit.dueDate, "2026-10-09");
});

test("full payment is never due after arrival nor before today", () => {
  assert.equal(createPaymentPlan({ totalPrice: 9000, dateFrom: "2026-10-10", today }).deposit.dueDate, "2026-10-09");
  assert.equal(createPaymentPlan({ totalPrice: 9000, dateFrom: "2026-10-09", today }).deposit.dueDate, today);
  assert.equal(createPaymentPlan({ totalPrice: 9000, dateFrom: today, today }).deposit.dueDate, today);
});

test("balance amount is derived, never stored", () => {
  assert.equal(balanceAmount({ totalPrice: 9000, deposit: { amount: 4500 }, balance: { dueDate: "x" } }), 4500);
  assert.equal(balanceAmount({ totalPrice: 9000, deposit: { amount: 9000 }, balance: null }), null);
  assert.equal(balanceAmount({ totalPrice: 9000, deposit: null, balance: null }), null);
  assert.equal(balanceAmount(null), null);
});

test("variable symbol: YYMMDD of arrival + order", () => {
  assert.equal(variableSymbolPrefix("2026-11-07"), "261107");
  assert.equal(nextVariableSymbol("2026-11-07", []), "26110701");
  assert.equal(nextVariableSymbol("2026-11-07", ["26110701", "26110703", "26110801"]), "26110704");
  // cizí délka nebo prefix se nepočítá
  assert.equal(nextVariableSymbol("2026-11-07", ["2611070"]), "26110701");
  const full = Array.from({ length: 99 }, (_, i) => `261107${String(i + 1).padStart(2, "0")}`);
  assert.equal(nextVariableSymbol("2026-11-07", full), null);
});

test("plan validation: the two allowed shapes and nothing in between", async () => {
  const { planProblems, paidAmount } = await import("./payment.js");
  const doc = (payment) => ({ dateFrom: "2026-11-07", payment });
  const split = { totalPrice: 9000, deposit: { amount: 4500, dueDate: "2026-10-11" }, balance: { dueDate: "2026-10-24" } };
  const full = { totalPrice: 9000, deposit: { amount: 9000, dueDate: "2026-10-11" }, balance: null };

  assert.deepEqual(planProblems(doc(split)), {});
  assert.deepEqual(planProblems(doc(full)), {});
  // záloha = cena, ale doplatek zůstal → host by dostal „Doplatek 0 Kč“
  assert.deepEqual(planProblems(doc({ ...split, deposit: { ...split.deposit, amount: 9000 } })), { depositAmount: true });
  // celá částka, ale cena zvýšená a záloha ne → „závazně potvrzeno“ s nedoplatkem
  assert.deepEqual(planProblems(doc({ ...full, totalPrice: 12000 })), { depositAmount: true });
  // záloha 0 → e-mail bez platebních údajů
  assert.deepEqual(planProblems(doc({ ...split, deposit: { ...split.deposit, amount: 0 } })), { depositAmount: true });
  assert.deepEqual(planProblems(doc({ ...split, balance: { dueDate: "2026-11-07" } })), { balanceDueDate: true });
  assert.deepEqual(planProblems(doc({ ...split, deposit: { ...split.deposit, dueDate: "2026-10-30" } })), { depositDueDate: true });
  assert.deepEqual(planProblems(doc(null)), {});

  assert.equal(paidAmount({ totalPrice: 9000, deposit: { amount: 4500, paidDate: "x" }, balance: { paidDate: "y" } }), 9000);
  assert.equal(paidAmount({ totalPrice: 9000, deposit: { amount: 4500, paidDate: "x" }, balance: { paidDate: null } }), 4500);
  assert.equal(paidAmount({ totalPrice: 9000, deposit: { amount: 9000, paidDate: null }, balance: null }), 0);
});
