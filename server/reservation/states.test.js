import { test } from "node:test";
import assert from "node:assert/strict";
import { STATE, STATE_LIST, ACTION_LIST, TRANSITIONS, transitionProblem, allowedActions, nextAction } from "./states.js";

const today = "2026-10-08";
const guest = (state, extra = {}) => ({
  state,
  icalFeedCode: null,
  contact: { name: "Jan", email: "jan@seznam.cz", phone: "+420 777 123 456" },
  dateFrom: "2026-11-07",
  dateTo: "2026-11-09",
  payment: { totalPrice: 9000, deposit: { amount: 4500, dueDate: "2026-10-05", paidDate: null }, balance: { dueDate: "2026-10-24", paidDate: null } },
  ...extra,
});

// Úplná matice: každá akce z každého stavu. Povolené jsou přesně ty z TRANSITIONS.from
// (guardy se testují zvlášť níž, tady jsou splněné).
test("every action from every state follows the TRANSITIONS table", () => {
  for (const state of STATE_LIST) {
    for (const action of ACTION_LIST) {
      const item = guest(state, { dateTo: "2026-10-01" }); // pobyt skončil -> `complete` guard splněn
      const expected = TRANSITIONS[action].from.includes(state) ? null : "invalidTransition";
      assert.equal(transitionProblem(item, action, { today }), expected, `${action} from ${state}`);
    }
  }
});

test("unknown action", () => {
  assert.equal(transitionProblem(guest(STATE.REQUESTED), "delete", { today }), "unknownAction");
});

test("imports and blocks have no state actions", () => {
  assert.equal(transitionProblem(guest(STATE.CONFIRMED, { icalFeedCode: "booking" }), "cancel", { today }), "notGuestReservation");
  assert.equal(transitionProblem(guest(STATE.CONFIRMED, { contact: null }), "cancel", { today }), "notGuestReservation");
  assert.deepEqual(allowedActions(guest(STATE.CONFIRMED, { contact: null }), { today }), []);
});

test("markBalancePaid only with an unpaid balance", () => {
  assert.equal(transitionProblem(guest(STATE.CONFIRMED), "markBalancePaid", { today }), null);
  const paid = guest(STATE.CONFIRMED);
  paid.payment.balance.paidDate = "2026-10-20";
  assert.equal(transitionProblem(paid, "markBalancePaid", { today }), "noBalanceDue");
  const full = guest(STATE.CONFIRMED);
  full.payment.balance = null;
  assert.equal(transitionProblem(full, "markBalancePaid", { today }), "noBalanceDue");
});

test("complete only once the stay has ended (departure day counts)", () => {
  assert.equal(transitionProblem(guest(STATE.CONFIRMED, { dateTo: "2026-10-09" }), "complete", { today }), "stayNotFinished");
  assert.equal(transitionProblem(guest(STATE.CONFIRMED, { dateTo: today }), "complete", { today }), null);
});

test("next step per state", () => {
  assert.equal(nextAction(guest(STATE.REQUESTED), { today }), "approve");
  assert.equal(nextAction(guest(STATE.AWAITING_DEPOSIT), { today }), "markDepositPaid");
  assert.equal(nextAction(guest(STATE.CONFIRMED), { today }), "markBalancePaid");
  const paid = guest(STATE.CONFIRMED, { dateTo: "2026-10-05" });
  paid.payment.balance.paidDate = "2026-09-20";
  assert.equal(nextAction(paid, { today }), "complete");
  assert.equal(nextAction(guest(STATE.EXPIRED), { today }), null); // obnovit je v menu, ne „další krok“
  assert.equal(nextAction(guest(STATE.CANCELLED), { today }), null);
});

test("expire only after the deposit due date", () => {
  const due = (dueDate) => {
    const item = guest(STATE.AWAITING_DEPOSIT);
    item.payment.deposit.dueDate = dueDate;
    return item;
  };
  assert.equal(transitionProblem(due("2026-10-07"), "expire", { today }), null);
  assert.equal(transitionProblem(due(today), "expire", { today }), "notOverdue"); // splatné do 23:59 dneška
  assert.equal(transitionProblem(due("2026-10-11"), "expire", { today }), "notOverdue");
});

test("no balance step when the deposit covers the whole price", () => {
  const item = guest(STATE.CONFIRMED);
  item.payment.deposit.amount = 9000;
  assert.equal(transitionProblem(item, "markBalancePaid", { today }), "noBalanceDue");
});
