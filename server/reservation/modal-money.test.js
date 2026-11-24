// Money the state change and reminder modals change (owner's design 2026-11-24): the price on
// approval, the amount actually received for "… received", and the amount / due date of a payment
// reminder (also saved without the e-mail). In-memory dao as in emails.test.js; e-mails never leave
// (a port nobody listens on), so every send ends as `failed` -- the write is what is tested.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";

let api;
let crud;
let dao;
let STATE;
const ID = "6710c0ffee0000000000000c";
const ADMIN = { identity: "1-2-3", name: "Ondřej" };
const STUBBED = ["get", "pushEvent", "updateFields", "updateIfCurrent", "findOverlapping", "findVariableSymbolsWithPrefix"];
const originals = {};
let stored;

before(async () => {
  Object.assign(process.env, { SMTP_HOST: "127.0.0.1", SMTP_PORT: "2599", SMTP_USER: "u", SMTP_PASSWORD: "p", MAIL_FROM: "noreply@roubenyraj.test" });
  api = (await import("./api.js")).default;
  crud = (await import("./crud.js")).default;
  dao = (await import("./dao.js")).default;
  ({ STATE } = await import("./states.js"));
  for (const name of STUBBED) originals[name] = dao[name];
});

after(() => {
  for (const name of STUBBED) dao[name] = originals[name];
});

/** A date relative to today (Prague), so the rules hold whenever the test runs. */
function relative(days) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Prague" }).format(new Date(Date.now() + days * 86_400_000));
}

/** `$set` with dot paths applied to the stored document (as Mongo would). */
function applyTo(doc, set) {
  for (const [path, value] of Object.entries(set)) {
    const keys = path.split(".");
    let target = doc;
    for (const key of keys.slice(0, -1)) {
      if (target[key] == null) target[key] = {};
      target = target[key];
    }
    target[keys.at(-1)] = value;
  }
}

function stub(doc) {
  stored = structuredClone({ id: ID, sys: { mts: "t" }, lang: "cs", source: "web", eventList: [], reminder: {}, keyCode: null, icalFeedCode: null, guestCount: 2, ...doc });
  dao.get = async () => structuredClone(stored);
  dao.pushEvent = async (id, event) => {
    stored.eventList.push(event);
  };
  dao.updateFields = async (id, set) => applyTo(stored, set);
  dao.updateIfCurrent = async (id, current, set) => {
    applyTo(stored, set);
    return true;
  };
  dao.findOverlapping = async () => [];
  dao.findVariableSymbolsWithPrefix = async () => [];
}

const contact = { name: "Jana Nová", email: "jana.nova@seznam.cz", phone: "+420 777 123 456" };
const stay = (days) => ({ dateFrom: relative(days), dateTo: relative(days + 3) });

const transition = (dtoIn) => api["reservation/transition"].fn({ dtoIn: { id: ID, sendEmail: false, ...dtoIn }, identity: ADMIN });
const emailPreview = (dtoIn) => api["reservation/emailPreview"].fn({ dtoIn: { id: ID, ...dtoIn } });
const sendEmail = (dtoIn) => api["reservation/sendEmail"].fn({ dtoIn: { id: ID, ...dtoIn }, identity: ADMIN });
const fieldCodes = (e) => JSON.stringify(e.paramMap ?? {});

// ---------------------------------------------------------------------------------------
// Approval with a changed price
// ---------------------------------------------------------------------------------------

test("approve: a price from the modal makes the plan and is recorded as a change", async () => {
  stub({ state: STATE.REQUESTED, contact, ...stay(60), payment: { totalPrice: 9000, variableSymbol: null, deposit: null, balance: null } });
  const dto = await transition({ action: "approve", totalPrice: 8000 });
  assert.equal(dto.totalPrice, 8000);
  assert.equal(dto.depositAmount, 4000, "50 % of the new price");
  const event = stored.eventList.at(-1);
  assert.deepEqual(event.changes, [{ field: "payment.totalPrice", from: 9000, to: 8000 }]);
});

test("approve: without a stored price the price from the modal is enough; without both it is an error at the price", async () => {
  stub({ state: STATE.REQUESTED, contact, ...stay(60), payment: { totalPrice: null, variableSymbol: null, deposit: null, balance: null } });
  await assert.rejects(transition({ action: "approve" }), (e) => /priceMissing/.test(e.code) && fieldCodes(e).includes("totalPrice"));
  const dto = await transition({ action: "approve", totalPrice: 6000 });
  assert.equal(dto.state, STATE.AWAITING_DEPOSIT);
  assert.equal(dto.totalPrice, 6000);
});

test("the price belongs only to approval, the received amount only to '… received'", async () => {
  stub({ state: STATE.REQUESTED, contact, ...stay(60), payment: { totalPrice: 9000, variableSymbol: null, deposit: null, balance: null } });
  await assert.rejects(transition({ action: "reject", totalPrice: 8000 }), (e) => fieldCodes(e).includes("totalPriceNotAllowed"));
  await assert.rejects(transition({ action: "approve", paidAmount: 100 }), (e) => fieldCodes(e).includes("paidAmountNotAllowed"));
  await assert.rejects(emailPreview({ action: "reject", totalPrice: 8000 }), (e) => fieldCodes(e).includes("totalPriceNotAllowed"));
});

// ---------------------------------------------------------------------------------------
// "… received" with the amount that actually arrived
// ---------------------------------------------------------------------------------------

const awaiting = (payment) => ({ state: STATE.AWAITING_DEPOSIT, contact, ...stay(40), payment: { variableSymbol: "26110701", ...payment } });

test("deposit received: a different amount becomes the deposit, the balance follows", async () => {
  stub(awaiting({ totalPrice: 9000, deposit: { amount: 4500, dueDate: relative(-1), paidDate: null }, balance: { dueDate: relative(26), paidDate: null } }));
  const dto = await transition({ action: "markDepositPaid", paidAmount: 5000, paidDate: relative(0) });
  assert.equal(dto.state, STATE.CONFIRMED);
  assert.equal(dto.depositAmount, 5000);
  assert.equal(dto.balanceAmount, 4000);
  assert.equal(dto.totalPrice, 9000);
  assert.deepEqual(stored.eventList.at(-1).changes, [{ field: "payment.deposit.amount", from: 4500, to: 5000 }]);
});

test("deposit received: the whole price at once turns the plan into a full payment; above the price is an error", async () => {
  stub(awaiting({ totalPrice: 9000, deposit: { amount: 4500, dueDate: relative(-1), paidDate: null }, balance: { dueDate: relative(26), paidDate: null } }));
  await assert.rejects(transition({ action: "markDepositPaid", paidAmount: 9500 }), (e) => /invalidPaidAmount/.test(e.code) && fieldCodes(e).includes("paidAmount"));
  const dto = await transition({ action: "markDepositPaid", paidAmount: 9000 });
  assert.equal(dto.balanceDueDate, null);
  assert.equal(dto.balanceAmount, null);
  assert.equal(stored.eventList.at(-1).fullPayment, true);
});

test("payment received (full payment): the received amount is the price", async () => {
  stub(awaiting({ totalPrice: 6000, deposit: { amount: 6000, dueDate: relative(-1), paidDate: null }, balance: null }));
  const dto = await transition({ action: "markDepositPaid", paidAmount: 5800 });
  assert.equal(dto.depositAmount, 5800);
  assert.equal(dto.totalPrice, 5800);
});

test("balance received: a different balance changes the price", async () => {
  stub({
    state: STATE.CONFIRMED,
    contact,
    ...stay(20),
    payment: { totalPrice: 10000, variableSymbol: "26110701", deposit: { amount: 3000, dueDate: relative(-20), paidDate: relative(-21) }, balance: { dueDate: relative(6), paidDate: null } },
  });
  const dto = await transition({ action: "markBalancePaid", paidAmount: 7500 });
  assert.equal(dto.totalPrice, 10500);
  assert.equal(dto.balanceAmount, 7500);
  assert.ok(dto.balancePaidDate);
});

// ---------------------------------------------------------------------------------------
// Payment reminder with a changed amount / due date
// ---------------------------------------------------------------------------------------

test("deposit reminder: the new amount and due date are written first and the e-mail asks for them", async () => {
  stub(awaiting({ totalPrice: 9000, deposit: { amount: 4500, dueDate: relative(-2), paidDate: null }, balance: { dueDate: relative(26), paidDate: null } }));
  // (The preview of a payment e-mail needs the account from the Settings -- not in a test without a database.)
  const dto = await sendEmail({ email: "depositReminder", amount: 4000, dueDate: relative(3) });
  assert.equal(dto.depositAmount, 4000);
  assert.equal(dto.depositDueDate, relative(3));
  const [update, email] = stored.eventList.slice(-2);
  assert.equal(update.type, "update");
  assert.deepEqual(update.changes.map(({ field }) => field).sort(), ["payment.deposit.amount", "payment.deposit.dueDate"]);
  assert.equal(email.type, "email");
  assert.equal(email.phase, "beforeDue", "the moved due date is in the future: the e-mail is not an overdue one");
});

test("payment reminder without the e-mail only saves the change; a plan that does not hold is an error at the field", async () => {
  stub(awaiting({ totalPrice: 6000, deposit: { amount: 6000, dueDate: relative(-1), paidDate: null }, balance: null }));
  const dto = await sendEmail({ email: "depositReminder", sendEmail: false, amount: 6500 });
  assert.equal(dto.totalPrice, 6500, "a full payment: the price follows");
  assert.equal(dto.depositAmount, 6500);
  assert.deepEqual(stored.eventList.map(({ type }) => type), ["update"], "no e-mail event");

  await assert.rejects(sendEmail({ email: "depositReminder", dueDate: relative(41) }), (e) => /invalidPaymentPlan/.test(e.code) && fieldCodes(e).includes("dueDate"));
});

test("balance reminder: the amount moves the price, the date the balance due date; arrival information takes neither", async () => {
  stub({
    state: STATE.CONFIRMED,
    contact,
    ...stay(20),
    payment: { totalPrice: 9000, variableSymbol: "26110701", deposit: { amount: 2700, dueDate: relative(-20), paidDate: relative(-21) }, balance: { dueDate: relative(-2), paidDate: null } },
  });
  const dto = await sendEmail({ email: "balanceReminder", sendEmail: false, amount: 6000, dueDate: relative(5) });
  assert.equal(dto.totalPrice, 8700);
  assert.equal(dto.balanceAmount, 6000);
  assert.equal(dto.balanceDueDate, relative(5));

  stub({
    state: STATE.CONFIRMED,
    contact,
    ...stay(2),
    payment: { totalPrice: 9000, variableSymbol: "26110701", deposit: { amount: 9000, dueDate: relative(-20), paidDate: relative(-21) }, balance: null },
  });
  await assert.rejects(sendEmail({ email: "arrivalInfo", keyCode: "4821", amount: 100 }), (e) => fieldCodes(e).includes("notPaymentReminder"));
});

test("arrival information cannot go without the e-mail; a reminder without the e-mail and without a change writes nothing", async () => {
  stub({
    state: STATE.CONFIRMED,
    contact,
    ...stay(2),
    payment: { totalPrice: 9000, variableSymbol: "26110701", deposit: { amount: 9000, dueDate: relative(-20), paidDate: relative(-21) }, balance: null },
  });
  await assert.rejects(sendEmail({ email: "arrivalInfo", keyCode: "4821", sendEmail: false }), (e) => fieldCodes(e).includes("emailRequired"));
  assert.equal(stored.keyCode, null);
  assert.deepEqual(stored.eventList, []);

  stub(awaiting({ totalPrice: 9000, deposit: { amount: 4500, dueDate: relative(-2), paidDate: null }, balance: { dueDate: relative(26), paidDate: null } }));
  await sendEmail({ email: "depositReminder", sendEmail: false, amount: 4500 });
  assert.deepEqual(stored.eventList, [], "the same amount is no change");
});

// ---------------------------------------------------------------------------------------
// The previews are GET: the amounts arrive as strings
// ---------------------------------------------------------------------------------------

/** Replaces a crud method by one that returns its arguments (only the api.js reading is tested). */
function capture(name) {
  const original = crud[name];
  crud[name] = async (args) => args;
  return () => {
    crud[name] = original;
  };
}

test("GET previews read amounts from strings; a non-number is an error at the field", async () => {
  const restoreTransition = capture("previewTransitionEmail");
  const restoreEmail = capture("sendManualEmail");
  try {
    const transitionArgs = await emailPreview({ action: "markDepositPaid", paidAmount: "4500", paidDate: "2026-11-20" });
    assert.equal(transitionArgs.paidAmount, 4500);
    assert.equal(transitionArgs.totalPrice, undefined, "an absent amount is undefined, not 0");
    assert.equal((await emailPreview({ action: "approve", totalPrice: "8000" })).totalPrice, 8000);
    assert.equal((await emailPreview({ action: "approve", totalPrice: "" })).totalPrice, undefined, "an emptied field is no price");
    await assert.rejects(emailPreview({ action: "approve", totalPrice: "12a" }), (e) => fieldCodes(e).includes("totalPrice"));
    await assert.rejects(emailPreview({ action: "approve", totalPrice: "0" }), (e) => fieldCodes(e).includes("totalPrice"));

    const emailArgs = await api["reservation/sendEmailPreview"].fn({ dtoIn: { id: ID, email: "depositReminder", amount: "4000", dueDate: "2026-12-01", sendEmail: "false" } });
    assert.equal(emailArgs.amount, 4000);
    assert.equal(emailArgs.dueDate, "2026-12-01");
    assert.equal(emailArgs.sendEmail, false);
    await assert.rejects(api["reservation/sendEmailPreview"].fn({ dtoIn: { id: ID, email: "depositReminder", dueDate: "1.12.2026" } }), (e) => fieldCodes(e).includes("dueDate"));
  } finally {
    restoreTransition();
    restoreEmail();
  }
});

test("the preview validates the modal's input even when there is no e-mail to show", async () => {
  // A guest without an e-mail address: the preview used to answer `email: null` before reading the input.
  stub({
    state: STATE.CONFIRMED,
    contact: { ...contact, email: null },
    ...stay(20),
    payment: { totalPrice: 10000, variableSymbol: "26110701", deposit: { amount: 3000, dueDate: relative(-20), paidDate: relative(-21) }, balance: { dueDate: relative(6), paidDate: null } },
  });
  assert.deepEqual(await emailPreview({ action: "markBalancePaid", paidAmount: 7000 }), { email: null });
  await assert.rejects(emailPreview({ action: "markBalancePaid", totalPrice: 9000 }), (e) => fieldCodes(e).includes("totalPriceNotAllowed"));
  await assert.rejects(emailPreview({ action: "markBalancePaid", paidDate: relative(1) }), (e) => fieldCodes(e).includes("paidDateInFuture"));
});

test("balance received: the guest gets H11 unless the owner turns the e-mail off", async () => {
  stub({
    state: STATE.CONFIRMED,
    contact,
    ...stay(20),
    payment: { totalPrice: 10000, variableSymbol: "26110701", deposit: { amount: 3000, dueDate: relative(-20), paidDate: relative(-21) }, balance: { dueDate: relative(6), paidDate: null } },
  });
  const { email } = await emailPreview({ action: "markBalancePaid", paidAmount: 7000 });
  assert.equal(email.template, "balanceReceived");
  assert.match(email.subject, /Doplatek jsme přijali/);
  assert.match(email.text, /10\s000\sKč/, "paid in total");

  await transition({ action: "markBalancePaid", sendEmail: true });
  const event = stored.eventList.at(-1);
  assert.equal(event.sendEmail, true);
  assert.equal(event.emailList[0].template, "balanceReceived");

  stub({ ...stored, payment: { ...stored.payment, balance: { dueDate: relative(6), paidDate: null } }, eventList: [] });
  await transition({ action: "markBalancePaid", sendEmail: false });
  assert.deepEqual(stored.eventList.at(-1).emailList, []);
});
