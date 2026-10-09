import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { actorOf, createEvent, diff } from "./history.js";
import { todayIn } from "../services/dates.js";

test("diff reports changed dotted paths only", () => {
  const before = { dateFrom: "2026-11-07", payment: { deposit: { dueDate: "2026-10-11", amount: 4500 } }, contact: { name: "Jan" } };
  const after = { dateFrom: "2026-11-07", payment: { deposit: { dueDate: "2026-10-14", amount: 4500 } }, contact: null };
  assert.deepEqual(diff(before, after, ["dateFrom", "payment.deposit.dueDate", "payment.deposit.amount", "contact.name"]), [
    { field: "payment.deposit.dueDate", from: "2026-10-11", to: "2026-10-14" },
    { field: "contact.name", from: "Jan", to: null },
  ]);
});

test("event drops undefined fields and always has an emailList", () => {
  const event = createEvent("transition", { by: null, action: "approve", message: undefined });
  assert.equal(event.type, "transition");
  assert.equal(event.action, "approve");
  assert.equal("message" in event, false);
  assert.deepEqual(event.emailList, []);
  assert.match(event.at, /^\d{4}-\d{2}-\d{2}T/);
});

test("actor keeps identity and a name, nothing else", () => {
  assert.deepEqual(actorOf({ identity: "1-2", firstName: "Ondřej", surname: "Čapek", password: "x" }), { identity: "1-2", name: "Ondřej Čapek" });
  assert.equal(actorOf(null), null);
});

test("today is taken in Prague, not UTC (half past midnight)", () => {
  mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-07T22:30:00Z") }); // 0:30 SELČ 8. 10.
  try {
    assert.equal(new Date().toISOString().slice(0, 10), "2026-10-07");
    assert.equal(todayIn("Europe/Prague"), "2026-10-08");
  } finally {
    mock.timers.reset();
  }
});
