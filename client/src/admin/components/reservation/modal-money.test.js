import { test } from "node:test";
import assert from "node:assert/strict";
import { receivedDefault, reminderPlan, reminderPlanChanges, transitionMoneyDtoIn } from "./modal-money.js";

const awaiting = { totalPrice: 9000, depositAmount: 4500, depositDueDate: "2026-12-01", balanceAmount: 4500, balanceDueDate: "2026-12-20" };

test("receivedDefault: '… received' starts with the amount asked for, other actions take none", () => {
  assert.equal(receivedDefault(awaiting, "markDepositPaid"), 4500);
  assert.equal(receivedDefault({ ...awaiting, balanceAmount: 3900 }, "markBalancePaid"), 3900);
  assert.equal(receivedDefault(awaiting, "approve"), null);
  assert.equal(receivedDefault({ totalPrice: 9000 }, "markDepositPaid"), null, "no plan yet");
});

test("transitionMoneyDtoIn: '… received' always sends the date and the amount", () => {
  const dtoIn = transitionMoneyDtoIn({ action: "markDepositPaid", item: awaiting, price: 9000, paidAmount: 4500, paidDate: "2026-11-24" });
  assert.deepEqual(dtoIn, { paidDate: "2026-11-24", paidAmount: 4500 });
  assert.deepEqual(transitionMoneyDtoIn({ action: "markBalancePaid", item: awaiting, paidAmount: 4000, paidDate: "2026-11-24" }), { paidDate: "2026-11-24", paidAmount: 4000 });
});

test("transitionMoneyDtoIn: approval sends the price only when the owner changed it", () => {
  const requested = { totalPrice: 10800 };
  assert.deepEqual(transitionMoneyDtoIn({ action: "approve", item: requested, price: 10800 }), {}, "unchanged = the stored price, no history change");
  assert.deepEqual(transitionMoneyDtoIn({ action: "approve", item: requested, price: 9500 }), { totalPrice: 9500 });
  assert.deepEqual(transitionMoneyDtoIn({ action: "approve", item: { totalPrice: null }, price: 8000 }), { totalPrice: 8000 }, "a request without a price");
  assert.deepEqual(transitionMoneyDtoIn({ action: "approve", item: { totalPrice: null }, price: null }), {}, "no price at all: nothing to send");
});

test("transitionMoneyDtoIn: other actions send no money, even with leftovers from a previously picked action", () => {
  for (const action of ["reject", "expire", "cancel", "complete", "reopen"]) {
    assert.deepEqual(transitionMoneyDtoIn({ action, item: awaiting, price: 1, paidAmount: 4500, paidDate: "2026-11-24" }), {}, action);
  }
});

test("reminderPlan: the deposit reminder edits the deposit, the balance reminder the balance", () => {
  assert.deepEqual(reminderPlan(awaiting, "depositReminder"), { amount: 4500, dueDate: "2026-12-01" });
  assert.deepEqual(reminderPlan(awaiting, "balanceReminder"), { amount: 4500, dueDate: "2026-12-20" });
  assert.deepEqual(reminderPlan(awaiting, "arrivalInfo"), { amount: null, dueDate: "" });
  assert.deepEqual(reminderPlan({ depositAmount: null }, "depositReminder"), { amount: null, dueDate: "" });
});

test("reminderPlanChanges: only what changed; nothing changed = nothing to save", () => {
  const plan = reminderPlan(awaiting, "depositReminder");
  assert.deepEqual(reminderPlanChanges(plan, { amount: 4500, dueDate: "2026-12-01" }), {});
  assert.deepEqual(reminderPlanChanges(plan, { amount: 4000, dueDate: "2026-12-01" }), { amount: 4000 });
  assert.deepEqual(reminderPlanChanges(plan, { amount: 4500, dueDate: "2026-12-05" }), { dueDate: "2026-12-05" });
  assert.deepEqual(reminderPlanChanges(plan, { amount: null, dueDate: "" }), { amount: null, dueDate: "" }, "cleared fields are a change (the modal blocks sending)");
  assert.deepEqual(reminderPlanChanges(null, { amount: 1, dueDate: "x" }), {}, "arrival information has no plan");
});
