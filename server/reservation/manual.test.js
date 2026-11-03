// Manual reservation from the admin (`reservation/createManual`), above all a reservation on
// behalf of a guest (`reason: "onBehalf"`): validation by the rules of the web, the three starting
// states and the email each of them sends.
//
// Without a database: the use case is called directly, and either `crud.createManual` (validation)
// or the dao methods it uses (states, emails) are replaced on the instances.
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

let api;
let crud;
let dao;
let allowedActions;

// Emails must never leave a test: the SMTP of the env files would otherwise apply. A port nobody
// listens on makes every send end as `failed` right away -- the record still carries the template.
before(async () => {
  Object.assign(process.env, { SMTP_HOST: "127.0.0.1", SMTP_PORT: "2599", SMTP_USER: "u", SMTP_PASSWORD: "p", MAIL_FROM: "noreply@roubenyraj.test" });
  api = (await import("./api.js")).default;
  crud = (await import("./crud.js")).default;
  dao = (await import("./dao.js")).default;
  ({ allowedActions } = await import("./states.js"));
});

// A stay that keeps every rule of the web (2+ nights, not in summer or over Christmas), always in the future.
const YEAR = new Date().getUTCFullYear() + 1;
const STAY = { dateFrom: `${YEAR}-10-05`, dateTo: `${YEAR}-10-08` };
const CONTACT = { contactName: "Jan Novák", contactEmail: "jan.novak@seznam.cz", contactPhone: "+420 777 123 456" };
const ADMIN = { identity: "1-2-3", name: "Ondřej" };
const onBehalf = (extra = {}) => ({ ...STAY, ...CONTACT, guestCount: 4, reason: "onBehalf", sendEmail: false, ...extra });

const createManual = (dtoIn) => api["reservation/createManual"].fn({ dtoIn, identity: ADMIN });

/** Fields of a form error: `{ missingKeyMap: { contactName: "<field code>" }, invalidValueKeyMap: … }`. */
function fieldsOf(error) {
  return Object.fromEntries(
    Object.entries(error.paramMap ?? {}).map(([kind, map]) => [kind, Object.fromEntries(Object.entries(map).map(([key, codes]) => [key.slice(2), Object.keys(codes)[0]]))]),
  );
}

async function rejectsWith(promise, kind, field, code) {
  await assert.rejects(promise, (e) => {
    assert.equal(fieldsOf(e)[kind]?.[field], code, JSON.stringify(e.paramMap));
    return true;
  });
}

// ---------------------------------------------------------------------------------------
// Validation (api.js) -- crud.createManual is replaced by a function returning its arguments.
// ---------------------------------------------------------------------------------------

function captureCreate() {
  const original = crud.createManual;
  crud.createManual = async (args) => args;
  return () => {
    crud.createManual = original;
  };
}

test("onBehalf: the whole contact is required, as on the web, reported at the admin fields", async () => {
  const restore = captureCreate();
  try {
    await rejectsWith(createManual(onBehalf({ contactName: "", contactEmail: "", contactPhone: "" })), "missingKeyMap", "contactName", "caio-propertyman/reservation/contactMissing");
    await rejectsWith(createManual(onBehalf({ contactPhone: undefined })), "missingKeyMap", "contactPhone", "caio-propertyman/reservation/contactMissing");
    await rejectsWith(createManual(onBehalf({ contactPhone: "12" })), "invalidValueKeyMap", "contactPhone", "caio-propertyman/reservation/invalidContact");
  } finally {
    restore();
  }
});

test("onBehalf: the guest count is required", async () => {
  const restore = captureCreate();
  try {
    await rejectsWith(createManual(onBehalf({ guestCount: undefined })), "invalidValueKeyMap", "guestCount", "caio-propertyman/reservation/guestCountOutOfRange");
    // Over the capacity it is caught already by the admin reader (same limit, generic field code).
    await rejectsWith(createManual(onBehalf({ guestCount: 11 })), "invalidValueKeyMap", "guestCount", "caio-propertyman/reservation/invalidValue");
  } finally {
    restore();
  }
});

test("onBehalf: the stay rules of the web apply and force does not override them", async () => {
  const restore = captureCreate();
  try {
    const oneNight = { dateFrom: `${YEAR}-10-05`, dateTo: `${YEAR}-10-06` };
    await rejectsWith(createManual(onBehalf({ ...oneNight, force: true })), "invalidValueKeyMap", "dateTo", "caio-propertyman/reservation/stayTooShort");
    await rejectsWith(createManual(onBehalf({ dateFrom: "2020-01-10", dateTo: "2020-01-13", force: true })), "invalidValueKeyMap", "dateFrom", "caio-propertyman/reservation/arrivalInPast");
    const summer = { dateFrom: `${YEAR}-07-10`, dateTo: `${YEAR}-07-13` };
    await assert.rejects(createManual(onBehalf({ ...summer, force: true })), { code: "caio-propertyman/stay/summerWeekOnly" });
  } finally {
    restore();
  }
});

test("onBehalf: initialState defaults to requested and replaces asConfirmed", async () => {
  const restore = captureCreate();
  try {
    const args = await createManual(onBehalf({ contactName: "  Jan Novák  " }));
    assert.equal(args.initialState, "requested");
    assert.equal(args.data.reason, "onBehalf");
    assert.equal(args.data.guestCount, 4);
    // Read the way the web reads it (trimmed).
    assert.deepEqual(args.data.contact, { name: "Jan Novák", email: "jan.novak@seznam.cz", phone: "+420 777 123 456" });

    for (const initialState of ["awaitingDeposit", "confirmed"]) {
      assert.equal((await createManual(onBehalf({ initialState }))).initialState, initialState);
    }
    await rejectsWith(createManual(onBehalf({ initialState: "cancelled" })), "invalidValueKeyMap", "initialState", "caio-propertyman/reservation/invalidValue");
    await rejectsWith(createManual(onBehalf({ asConfirmed: true })), "invalidValueKeyMap", "asConfirmed", "caio-propertyman/reservation/invalidValue");
    // H1 has no place for the owner's message.
    await rejectsWith(createManual(onBehalf({ message: "Těšíme se" })), "invalidValueKeyMap", "message", "caio-propertyman/reservation/invalidValue");
    assert.equal((await createManual(onBehalf({ initialState: "awaitingDeposit", message: "Těšíme se" }))).message, "Těšíme se");
  } finally {
    restore();
  }
});

test("without onBehalf: initialState is refused, the admin exceptions from the web rules stay", async () => {
  const restore = captureCreate();
  try {
    await rejectsWith(createManual({ ...STAY, ...CONTACT, initialState: "requested" }), "invalidValueKeyMap", "initialState", "caio-propertyman/reservation/invalidValue");
    // A one-night block in the past and a guest without a phone -- as before.
    const block = await createManual({ dateFrom: "2020-01-10", dateTo: "2020-01-11", reason: "maintenance" });
    assert.equal(block.data.contact, null);
    assert.equal(block.initialState, undefined);
    const guest = await createManual({ dateFrom: "2020-01-10", dateTo: "2020-01-11", contactName: "Jan", asConfirmed: false });
    assert.equal(guest.asConfirmed, false);
  } finally {
    restore();
  }
});

test("update cannot turn a record into onBehalf", async () => {
  const original = crud.updateOwn;
  crud.updateOwn = async (args) => args;
  try {
    const fn = api["reservation/update"].fn;
    await rejectsWith(fn({ dtoIn: { id: "6710c0ffee00000000000001", reason: "onBehalf" }, identity: ADMIN }), "invalidValueKeyMap", "reason", "caio-propertyman/reservation/invalidValue");
    assert.equal((await fn({ dtoIn: { id: "6710c0ffee00000000000001", reason: "owner" }, identity: ADMIN })).changes.reason, "owner");
  } finally {
    crud.updateOwn = original;
  }
});

// ---------------------------------------------------------------------------------------
// The three starting states (crud.js) -- the dao is replaced by an in-memory one.
// ---------------------------------------------------------------------------------------

const ID = "6710c0ffee0000000000000a";
let stored;
let emailCalls;
const daoOriginals = {};

beforeEach(() => {
  stored = null;
  emailCalls = [];
});

function stubDao() {
  const stubs = {
    findOverlapping: async () => [],
    findVariableSymbolsWithPrefix: async () => [],
    create: async (doc) => (stored = { ...doc, id: ID, sys: { mts: "t" } }),
    get: async () => stored,
    setEventEmails: async (id, at, emailList) => emailCalls.push({ id, at, emailList }),
  };
  for (const [name, fn] of Object.entries(stubs)) {
    daoOriginals[name] = dao[name];
    dao[name] = fn;
  }
}

function restoreDao() {
  for (const [name, fn] of Object.entries(daoOriginals)) dao[name] = fn;
}

test("requested: a request like one from the web, H1 to the guest and nothing to the owner", async () => {
  stubDao();
  try {
    const dto = await createManual(onBehalf({ sendEmail: true }));
    assert.equal(dto.state, "requested");
    assert.equal(stored.source, "manual");
    assert.equal(stored.reason, "onBehalf");
    assert.equal(stored.icalFeedCode, null);
    // Price by the price list, no payment plan and no VS until approval -- as from the web.
    assert.ok(stored.payment.totalPrice > 0);
    assert.deepEqual({ ...stored.payment, totalPrice: 0 }, { totalPrice: 0, variableSymbol: null, deposit: null, balance: null });
    const [created] = stored.eventList;
    assert.equal(created.type, "created");
    assert.equal(created.to, "requested");
    assert.deepEqual(created.by, ADMIN);
    assert.deepEqual(emailCalls.flatMap((c) => c.emailList.map((m) => m.template)), ["requestReceived"]);
    // Next steps are those of a request from the web.
    assert.deepEqual(dto.actionList, ["approve", "reject"]);
    assert.deepEqual(allowedActions(stored, { today: "2026-11-02" }), ["approve", "reject"]);
  } finally {
    restoreDao();
  }
});

test("awaitingDeposit: payment plan and VS, H2 to the guest", async () => {
  stubDao();
  try {
    const dto = await createManual(onBehalf({ initialState: "awaitingDeposit", sendEmail: true }));
    assert.equal(dto.state, "awaitingDeposit");
    assert.ok(stored.payment.deposit.amount > 0 && stored.payment.deposit.dueDate);
    assert.match(stored.payment.variableSymbol, /^\d{8}$/);
    assert.equal(stored.eventList[0].to, "awaitingDeposit");
    assert.deepEqual(emailCalls.flatMap((c) => c.emailList.map((m) => m.template)), ["depositRequested"]);
  } finally {
    restoreDao();
  }
});

test("confirmed: no plan, H5 to the guest", async () => {
  stubDao();
  try {
    const dto = await createManual(onBehalf({ initialState: "confirmed", sendEmail: true }));
    assert.equal(dto.state, "confirmed");
    assert.equal(stored.payment.deposit, null);
    assert.deepEqual(emailCalls.flatMap((c) => c.emailList.map((m) => m.template)), ["reservationConfirmed"]);
  } finally {
    restoreDao();
  }
});

test("sendEmail: false sends nothing in any state", async () => {
  stubDao();
  try {
    for (const initialState of ["requested", "awaitingDeposit", "confirmed"]) {
      await createManual(onBehalf({ initialState, sendEmail: false }));
      assert.equal(stored.eventList[0].sendEmail, false);
    }
    assert.deepEqual(emailCalls, []);
  } finally {
    restoreDao();
  }
});

test("preview of a requested reservation is H1", async () => {
  stubDao();
  try {
    const { email } = await api["reservation/createEmailPreview"].fn({ dtoIn: onBehalf({ sendEmail: true }) });
    assert.equal(email.template, "requestReceived");
    assert.equal(email.to, "jan.novak@seznam.cz");
    assert.equal(stored, null, "a preview writes nothing");
  } finally {
    restoreDao();
  }
});

after(() => restoreDao());
