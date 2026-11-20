// E-mails the owner sends by hand from the admin (docs/proposal-admin-emails.md): which are
// available (states.js `allowedEmails`), which are shown prominently (`emailHighlight`), the phase
// of a payment reminder, and `reservation/sendEmail` with an in-memory dao.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { STATE, allowedEmails, emailProblem, emailHighlight, reminderPhase } from "./states.js";

const contact = { name: "Jan", email: "jan@seznam.cz", phone: "+420 777 123 456" };
const plan = { totalPrice: 9000, variableSymbol: "26110701", deposit: { amount: 4500, dueDate: "2026-10-11", paidDate: null }, balance: { dueDate: "2026-10-24", paidDate: null } };
const awaiting = (extra = {}) => ({ state: STATE.AWAITING_DEPOSIT, icalFeedCode: null, contact, dateFrom: "2026-11-07", dateTo: "2026-11-09", payment: plan, reminder: {}, ...extra });
const depositPaid = { ...plan, deposit: { ...plan.deposit, paidDate: "2026-10-10" } };
const allPaid = { ...depositPaid, balance: { ...plan.balance, paidDate: "2026-10-20" } };
const confirmed = (extra = {}) => awaiting({ state: STATE.CONFIRMED, payment: depositPaid, ...extra });
const at = (today) => ({ today });

// ---------------------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------------------

test("deposit reminder: only while waiting for the deposit, before and after the due date", () => {
  assert.deepEqual(allowedEmails(awaiting(), at("2026-10-01")), ["depositReminder"]);
  assert.deepEqual(allowedEmails(awaiting(), at("2026-10-20")), ["depositReminder"]);
  for (const state of [STATE.REQUESTED, STATE.EXPIRED, STATE.CANCELLED, STATE.REJECTED, STATE.COMPLETED]) {
    assert.equal(emailProblem(awaiting({ state }), "depositReminder", at("2026-10-01")), "invalidEmailState", state);
  }
});

test("balance reminder: confirmed with an unpaid balance", () => {
  assert.equal(emailProblem(confirmed(), "balanceReminder", at("2026-10-01")), null);
  assert.equal(emailProblem(confirmed({ payment: allPaid }), "balanceReminder", at("2026-10-01")), "noBalanceDue");
  // Full payment at once (or a manual confirmed reservation without a plan): nothing to remind.
  assert.equal(emailProblem(confirmed({ payment: { ...depositPaid, balance: null } }), "balanceReminder", at("2026-10-01")), "noBalanceDue");
  assert.equal(emailProblem(confirmed({ payment: { totalPrice: 9000, variableSymbol: null, deposit: null, balance: null } }), "balanceReminder", at("2026-10-01")), "noBalanceDue");
});

test("arrival information: earlier than 3 days before arrival only when everything is paid", () => {
  // Unpaid balance: from 3 days before arrival.
  assert.equal(emailProblem(confirmed(), "arrivalInfo", at("2026-11-03")), "notFullyPaid");
  assert.equal(emailProblem(confirmed(), "arrivalInfo", at("2026-11-04")), null);
  // Paid: any time before the stay ends.
  assert.equal(emailProblem(confirmed({ payment: allPaid }), "arrivalInfo", at("2026-10-25")), null);
  assert.equal(emailProblem(confirmed({ payment: { totalPrice: 9000, deposit: null, balance: null } }), "arrivalInfo", at("2026-10-25")), null);
  // During the stay yes, after it no.
  assert.equal(emailProblem(confirmed({ payment: allPaid }), "arrivalInfo", at("2026-11-08")), null);
  assert.equal(emailProblem(confirmed({ payment: allPaid }), "arrivalInfo", at("2026-11-09")), "stayFinished");
  assert.equal(emailProblem(awaiting(), "arrivalInfo", at("2026-11-06")), "invalidEmailState");
});

test("no e-mails for an import, a block or a guest without an e-mail", () => {
  assert.equal(emailProblem(confirmed({ icalFeedCode: "booking" }), "arrivalInfo", at("2026-11-06")), "emailNoGuest");
  assert.equal(emailProblem(confirmed({ contact: null }), "arrivalInfo", at("2026-11-06")), "emailNoGuest");
  assert.equal(emailProblem(confirmed({ contact: { ...contact, email: null } }), "arrivalInfo", at("2026-11-06")), "noGuestEmail");
  assert.equal(emailProblem(confirmed(), "thankYou", at("2026-11-06")), "unknownEmail");
  assert.deepEqual(emailHighlight(confirmed({ contact: { ...contact, email: null } }), at("2026-11-06")), []);
});

// ---------------------------------------------------------------------------------------
// Prominent actions (proposal § 3)
// ---------------------------------------------------------------------------------------

test("deposit reminder is prominent from 1 day before the due date until paid, also after sending", () => {
  assert.deepEqual(emailHighlight(awaiting(), at("2026-10-09")), []);
  assert.deepEqual(emailHighlight(awaiting(), at("2026-10-10")), [{ email: "depositReminder", colorScheme: "warning" }]);
  assert.deepEqual(emailHighlight(awaiting({ reminder: { depositSentAt: "2026-10-10T08:00:00Z" } }), at("2026-10-15")), [{ email: "depositReminder", colorScheme: "warning" }]);
});

test("balance reminder is prominent from 3 days before the due date until paid", () => {
  assert.deepEqual(emailHighlight(confirmed(), at("2026-10-20")), []);
  assert.deepEqual(emailHighlight(confirmed(), at("2026-10-21")), [{ email: "balanceReminder", colorScheme: "warning" }]);
  assert.deepEqual(emailHighlight(confirmed({ payment: allPaid }), at("2026-10-26")), []);
});

test("arrival information: building 3 days before, success from 2 days before to the arrival day, not after sending", () => {
  const paid = (extra) => confirmed({ payment: allPaid, ...extra });
  assert.deepEqual(emailHighlight(paid(), at("2026-11-03")), []);
  assert.deepEqual(emailHighlight(paid(), at("2026-11-04")), [{ email: "arrivalInfo", colorScheme: "building" }]);
  assert.deepEqual(emailHighlight(paid(), at("2026-11-05")), [{ email: "arrivalInfo", colorScheme: "positive" }]);
  assert.deepEqual(emailHighlight(paid(), at("2026-11-07")), [{ email: "arrivalInfo", colorScheme: "positive" }]);
  assert.deepEqual(emailHighlight(paid(), at("2026-11-08")), [], "during the stay only in the menu");
  assert.deepEqual(emailHighlight(paid({ reminder: { arrivalInfoSentAt: "2026-11-05T08:00:00Z" } }), at("2026-11-06")), []);
});

test("arrival information first, then the payment reminder", () => {
  const late = confirmed({ payment: { ...depositPaid, balance: { dueDate: "2026-11-02", paidDate: null } } });
  assert.deepEqual(emailHighlight(late, at("2026-11-05")), [
    { email: "arrivalInfo", colorScheme: "positive" },
    { email: "balanceReminder", colorScheme: "warning" },
  ]);
  // The arrival information sent, the balance still unpaid: the reminder stays.
  assert.deepEqual(emailHighlight({ ...late, reminder: { arrivalInfoSentAt: "x" } }, at("2026-11-05")), [{ email: "balanceReminder", colorScheme: "warning" }]);
});

// ---------------------------------------------------------------------------------------
// Phase of a payment reminder (proposal § 4)
// ---------------------------------------------------------------------------------------

test("deposit reminder phase: before the due date, overdue, then the full amount 3 days before the balance", () => {
  assert.equal(reminderPhase(awaiting(), "depositReminder", at("2026-10-11")), "beforeDue");
  assert.equal(reminderPhase(awaiting(), "depositReminder", at("2026-10-12")), "overdue");
  assert.equal(reminderPhase(awaiting(), "depositReminder", at("2026-10-20")), "overdue");
  assert.equal(reminderPhase(awaiting(), "depositReminder", at("2026-10-21")), "fullDue");
  assert.equal(reminderPhase(awaiting(), "depositReminder", at("2026-10-30")), "fullDue");
  // Full payment at once: no balance, so never the full-amount phase.
  const full = awaiting({ payment: { ...plan, deposit: { ...plan.deposit, amount: 9000 }, balance: null } });
  assert.equal(reminderPhase(full, "depositReminder", at("2026-10-30")), "overdue");
});

test("balance reminder phase", () => {
  assert.equal(reminderPhase(confirmed(), "balanceReminder", at("2026-10-24")), "beforeDue");
  assert.equal(reminderPhase(confirmed(), "balanceReminder", at("2026-10-25")), "overdue");
  assert.equal(reminderPhase(confirmed(), "arrivalInfo", at("2026-10-25")), null);
});

// ---------------------------------------------------------------------------------------
// reservation/sendEmail + sendEmailPreview (api.js, crud.js) -- in-memory dao. Without a database
// the Settings are empty: the arrival e-mail renders (no Wi-Fi), a payment e-mail fails for the
// missing account -- which is still recorded, so the reminder is tested through the history.
// ---------------------------------------------------------------------------------------

let api;
let crud;
let dao;
let Mailer;
const ID = "6710c0ffee0000000000000b";
const ADMIN = { identity: "1-2-3", name: "Ondřej" };
const originals = {};
let stored;
let fieldWrites;

// Emails must never leave a test: a port nobody listens on makes every send `failed`.
before(async () => {
  Object.assign(process.env, { SMTP_HOST: "127.0.0.1", SMTP_PORT: "2599", SMTP_USER: "u", SMTP_PASSWORD: "p", MAIL_FROM: "noreply@roubenyraj.test" });
  api = (await import("./api.js")).default;
  crud = (await import("./crud.js")).default;
  dao = (await import("./dao.js")).default;
  ({ Mailer } = await import("caio-server"));
  for (const name of ["get", "pushEvent", "updateFields", "updateIfCurrent"]) originals[name] = dao[name];
});

after(() => {
  for (const name of ["get", "pushEvent", "updateFields", "updateIfCurrent"]) dao[name] = originals[name];
});

/** A date relative to today (Prague), so the rules hold whenever the test runs. */
function relative(days) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date(Date.now() + days * 86_400_000));
}

function stub(doc) {
  stored = { id: ID, sys: { mts: "t" }, lang: "cs", source: "manual", eventList: [], reminder: {}, keyCode: null, ...doc };
  fieldWrites = [];
  dao.get = async () => structuredClone(stored);
  dao.pushEvent = async (id, event) => {
    stored.eventList.push(event);
  };
  dao.updateFields = async (id, set) => {
    fieldWrites.push(set);
    for (const [path, value] of Object.entries(set)) {
      if (path.startsWith("reminder.")) stored.reminder = { ...stored.reminder, [path.slice("reminder.".length)]: value };
      else stored[path] = value;
    }
  };
  dao.updateIfCurrent = async (id, current, set) => {
    Object.assign(stored, set);
    return true;
  };
}

const paidStay = () => ({
  state: STATE.CONFIRMED,
  icalFeedCode: null,
  contact,
  dateFrom: relative(2),
  dateTo: relative(5),
  guestCount: 2,
  payment: { totalPrice: 9000, variableSymbol: "26110701", deposit: { amount: 9000, dueDate: relative(-10), paidDate: relative(-11) }, balance: null },
});

const send = (dtoIn) => api["reservation/sendEmail"].fn({ dtoIn: { id: ID, ...dtoIn }, identity: ADMIN });
const preview = (dtoIn) => api["reservation/sendEmailPreview"].fn({ dtoIn: { id: ID, ...dtoIn } });
const fieldCodes = (e) => JSON.stringify(e.paramMap ?? {});

test("sendEmail: arrival information needs a key box code, digits only", async () => {
  stub(paidStay());
  await assert.rejects(send({ email: "arrivalInfo" }), (e) => fieldCodes(e).includes("keyCodeMissing"));
  await assert.rejects(send({ email: "arrivalInfo", keyCode: "12a4" }), (e) => fieldCodes(e).includes("invalidKeyCode"));
  await assert.rejects(send({ email: "thankYou", keyCode: "1234" }), (e) => fieldCodes(e).includes("email"));
  assert.equal(stored.eventList.length, 0, "nothing recorded");
});

test("sendEmailPreview: the e-mail with the code, nothing written; the stored code is the default", async () => {
  stub({ ...paidStay(), keyCode: "5566" });
  const withStored = await preview({ email: "arrivalInfo" });
  assert.equal(withStored.email.template, "arrivalInfo");
  assert.equal(withStored.email.to, contact.email);
  assert.match(withStored.email.text, /5566/);
  const typed = await preview({ email: "arrivalInfo", keyCode: "7788", message: "Vítejte!", lang: "de" });
  assert.match(typed.email.text, /7788/);
  assert.match(typed.email.text, /Vítejte!/);
  assert.equal(typed.email.lang, "de");
  assert.equal(typed.phase, null);
  assert.equal(stored.eventList.length, 0);
  assert.deepEqual(fieldWrites, []);
});

test("sendEmail: a failed e-mail is recorded in the history, nothing else is written", async () => {
  stub(paidStay());
  const dto = await send({ email: "arrivalInfo", keyCode: "4821", message: "Vítejte!" });
  const event = stored.eventList.at(-1);
  assert.equal(event.type, "email");
  assert.equal(event.email, "arrivalInfo");
  assert.equal(event.message, "Vítejte!");
  assert.deepEqual(event.by, ADMIN);
  assert.equal(event.emailList[0].status, "failed");
  assert.deepEqual(fieldWrites, [], "only a sent e-mail moves the reminder, the language and the code");
  assert.equal(dto.eventList.length, 1);
});

test("sendEmail: a sent e-mail stores the reminder time, the language and the key box code", async () => {
  const originalSend = Mailer.send;
  const originalCanSend = Mailer.canSend;
  Mailer.send = async () => ({});
  Mailer.canSend = () => true;
  try {
    stub(paidStay());
    const dto = await send({ email: "arrivalInfo", keyCode: "4821", lang: "en" });
    assert.equal(stored.eventList.at(-1).emailList[0].status, "sent");
    assert.ok(stored.reminder.arrivalInfoSentAt);
    assert.equal(stored.lang, "en");
    assert.equal(stored.keyCode, "4821");
    assert.equal(dto.keyCode, "4821");
    // Sent: no longer prominent, still in the menu.
    assert.deepEqual(dto.emailHighlight, []);
    assert.ok(dto.emailActionList.includes("arrivalInfo"));
  } finally {
    Mailer.send = originalSend;
    Mailer.canSend = originalCanSend;
  }
});

test("sendEmail: a reminder records its phase; a disallowed e-mail is 409 with the current e-mails", async () => {
  stub({ ...paidStay(), state: STATE.AWAITING_DEPOSIT, payment: { totalPrice: 9000, variableSymbol: "26110701", deposit: { amount: 9000, dueDate: relative(-1), paidDate: null }, balance: null } });
  await send({ email: "depositReminder" });
  const event = stored.eventList.at(-1);
  assert.equal(event.email, "depositReminder");
  assert.equal(event.phase, "overdue");
  assert.equal(event.fullPayment, true, "full amount at once: the history calls it a payment reminder");
  assert.match(event.emailList[0].error, /account/, "no account in the empty Settings");

  await assert.rejects(send({ email: "balanceReminder" }), (e) => {
    assert.equal(e.status, 409);
    assert.deepEqual(e.dtoOut?.emailActionList, ["depositReminder"]);
    return true;
  });

  // A deposit with a balance after it stays a deposit reminder.
  stub({ ...paidStay(), state: STATE.AWAITING_DEPOSIT, payment: { totalPrice: 9000, variableSymbol: "26110701", deposit: { amount: 4500, dueDate: relative(1), paidDate: null }, balance: { dueDate: relative(1), paidDate: null } } });
  await send({ email: "depositReminder" });
  assert.equal(stored.eventList.at(-1).fullPayment, undefined);
});

test("key box code on update: stored for a guest without an e-mail to the guest, refused for a block", async () => {
  stub(paidStay());
  await api["reservation/update"].fn({ dtoIn: { id: ID, keyCode: "9911", sendEmail: true }, identity: ADMIN });
  assert.equal(stored.keyCode, "9911");
  const event = stored.eventList.at(-1);
  assert.deepEqual(event.changes, [{ field: "keyCode", from: null, to: "9911" }]);
  assert.deepEqual(event.emailList, [], "a new code alone sends the guest nothing");

  stub({ ...paidStay(), contact: null, payment: null, reason: "owner" });
  await assert.rejects(crud.updateOwn({ id: ID, changes: { keyCode: "1234" } }), (e) => fieldCodes(e).includes("keyCodeWithoutGuest"));
  await assert.rejects(api["reservation/update"].fn({ dtoIn: { id: ID, keyCode: "12" }, identity: ADMIN }), (e) => fieldCodes(e).includes("invalidKeyCode"));
});
