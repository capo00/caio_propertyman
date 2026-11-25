import { test } from "node:test";
import assert from "node:assert/strict";
import { planChange, receivedDefault, reminderFullDue, reminderPlan, reminderPlanChanges, transitionMoneyDtoIn } from "./modal-money.js";
import { reminderPhase } from "../../../../../server/reservation/states.js";

const awaiting = { totalPrice: 9000, depositAmount: 4500, depositDueDate: "2026-12-01", balanceAmount: 4500, balanceDueDate: "2026-12-20" };

test("receivedDefault: '… received' starts with the amount asked for, other actions take none", () => {
  assert.equal(receivedDefault(awaiting, "markDepositPaid"), 4500);
  assert.equal(receivedDefault({ ...awaiting, balanceAmount: 3900 }, "markBalancePaid"), 3900);
  assert.equal(receivedDefault(awaiting, "approve"), null);
  assert.equal(receivedDefault({ totalPrice: 9000 }, "markDepositPaid"), null, "no plan yet");
});

test("planChange: the same plan as the reservation (the amount asked for) changes nothing", () => {
  assert.equal(planChange(awaiting, { totalPrice: 9000, balanceAmount: 4500 }), null);
  assert.equal(planChange(awaiting, null), null, "no preview yet");
  assert.equal(planChange(null, { totalPrice: 1, balanceAmount: null }), null, "not loaded yet");
});

test("planChange: a changed price wins (balance received, whole amount at once)", () => {
  assert.deepEqual(planChange(awaiting, { totalPrice: 8500, balanceAmount: 4000 }), { totalPrice: 8500 });
  const full = { totalPrice: 9000, depositAmount: 9000, balanceAmount: null };
  assert.deepEqual(planChange(full, { totalPrice: 8000, balanceAmount: null }), { totalPrice: 8000 });
});

test("planChange: a changed deposit changes the balance; none left = 0", () => {
  assert.deepEqual(planChange(awaiting, { totalPrice: 9000, balanceAmount: 4000 }), { balanceAmount: 4000 });
  assert.deepEqual(planChange(awaiting, { totalPrice: 9000, balanceAmount: null }), { balanceAmount: 0 });
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

test("reminderFullDue: deposit overdue and the balance due in 3 days or less -- the e-mail asks for the whole price", () => {
  // awaiting: deposit due 2026-12-01, balance due 2026-12-20
  assert.equal(reminderFullDue(awaiting, "depositReminder", "2026-12-01"), null, "deposit not overdue yet");
  assert.equal(reminderFullDue(awaiting, "depositReminder", "2026-12-16"), null, "overdue, balance 4 days away");
  assert.deepEqual(reminderFullDue(awaiting, "depositReminder", "2026-12-17"), { amount: 9000, dueDate: "2026-12-20" });
  assert.deepEqual(reminderFullDue(awaiting, "depositReminder", "2026-12-20"), { amount: 9000, dueDate: "2026-12-20" });
  assert.deepEqual(reminderFullDue(awaiting, "depositReminder", "2026-12-21"), { amount: 9000, dueDate: null }, "balance due date passed: as soon as possible");
  assert.equal(reminderFullDue(awaiting, "balanceReminder", "2026-12-21"), null, "only the deposit reminder");
  const full = { totalPrice: 9000, depositAmount: 9000, depositDueDate: "2026-12-01", balanceAmount: null, balanceDueDate: null };
  assert.equal(reminderFullDue(full, "depositReminder", "2026-12-21"), null, "full payment at once has no balance");
  const newYear = { ...awaiting, balanceDueDate: "2027-01-02" };
  assert.equal(reminderFullDue(newYear, "depositReminder", "2026-12-29"), null, "across the year boundary");
  assert.deepEqual(reminderFullDue(newYear, "depositReminder", "2026-12-30"), { amount: 9000, dueDate: "2027-01-02" });
  assert.equal(reminderFullDue({ ...awaiting, balancePaidDate: "2026-12-10" }, "depositReminder", "2026-12-18"), null, "balance already paid");
});

test("reminderFullDue agrees with the server's reminderPhase (the e-mail the modal describes)", () => {
  // The same rule twice: the modal needs it before the preview arrives (no layout jump).
  const cases = [
    { deposit: "2026-12-01", balance: "2026-12-20", balancePaid: null },
    { deposit: "2026-12-30", balance: "2027-01-02", balancePaid: null },
    { deposit: "2026-12-01", balance: "2026-12-20", balancePaid: "2026-12-05" },
  ];
  for (const c of cases) {
    const doc = { payment: { totalPrice: 9000, deposit: { amount: 4500, dueDate: c.deposit, paidDate: null }, balance: { dueDate: c.balance, paidDate: c.balancePaid } } };
    const dto = { totalPrice: 9000, depositAmount: 4500, depositDueDate: c.deposit, balanceAmount: 4500, balanceDueDate: c.balance, balancePaidDate: c.balancePaid };
    for (let day = new Date("2026-11-25T00:00:00Z"); day <= new Date("2027-01-10T00:00:00Z"); day.setUTCDate(day.getUTCDate() + 1)) {
      const today = day.toISOString().slice(0, 10);
      const server = reminderPhase(doc, "depositReminder", { today }) === "fullDue";
      assert.equal(Boolean(reminderFullDue(dto, "depositReminder", today)), server, `${JSON.stringify(c)} on ${today}`);
    }
  }
});
