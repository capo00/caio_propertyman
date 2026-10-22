import { randomUUID } from "crypto";
import { Crud, Error as AppError } from "caio-server";
import config from "../config.js";
import dao from "./dao.js";
import { isFree } from "../services/availability.js";
import { assertPricingApproved, calculatePrice } from "../services/price.js";
import { addDays, nightsBetween, todayIn } from "../services/dates.js";
import { scopeQuery, scopeOf } from "./scope.js";
import { computeCancellation } from "./cancellation.js";
import { STATE, TRANSITIONS, RELEASED_STATE_LIST, transitionProblem, allowedActions, nextAction, isGuestReservation } from "./states.js";
import { createPaymentPlan, balanceAmount, nextVariableSymbol, variableSymbolPrefix, planProblems } from "./payment.js";
import { actorOf, createEvent, diff } from "./history.js";
import { sendEmail, renderEmail, emailLanguages, htmlForBrowser } from "../email/send.js";
import { formParamMap, invalidDtoIn } from "../services/dto.js";

const CODE = "caio-propertyman/reservation";

/** Today in the operation's time zone -- the basis of all due dates. */
function today() {
  return todayIn(config.reservation.timeZone);
}

/**
 * `extra.paramMap` is written simply here (`{ invalidValueKeyMap: { dateTo: true } }`) and is
 * converted to the shape that uu5g05-forms assigns to fields (`formParamMap` in server/services/dto.js).
 */
function failed(code, message, status, extra) {
  const paramMap = extra?.paramMap && Object.assign({}, ...Object.entries(extra.paramMap).map(([kind, keyMap]) => formParamMap(keyMap, message, kind, `${CODE}/${code}`)));
  return new AppError.Failed(message, { status, code: `${CODE}/${code}`, ...extra, paramMap: paramMap || undefined });
}

/** Why an action is not possible → error for the API. The codes match `transitionProblem` in states.js. */
const TRANSITION_PROBLEM = {
  unknownAction: [400, "Unknown action."],
  notGuestReservation: [400, "An import or a date block has no state that can be moved."],
  invalidTransition: [409, "This action is not possible in the current reservation state."],
  noBalanceDue: [409, "The reservation has no unpaid balance."],
  stayNotFinished: [409, "The stay has not finished yet."],
  notOverdue: [409, "The deposit is not overdue yet -- the reservation can be cancelled instead."],
};

/** Fields whose change the guest sees -- only then does the "reservation changed" email make sense (H9). */
const GUEST_VISIBLE_FIELDS = [
  "dateFrom", "dateTo", "guestCount",
  "payment.totalPrice", "payment.deposit.amount", "payment.deposit.dueDate", "payment.balance.dueDate",
];

/** All fields that are written to the history as `changes` on an update. */
const TRACKED_FIELDS = [
  ...GUEST_VISIBLE_FIELDS,
  "contact.name", "contact.email", "contact.phone", "note", "desc", "reason", "lang",
  "payment.deposit.paidDate", "payment.balance.paidDate",
];

/**
 * The shape in which a reservation goes to the admin.
 *
 * Flat (`contactName`, `depositDueDate`, …), even though `contact` and `payment` are nested in
 * the database: the form modal of `UiElements.Crud` works with first-level keys (`initialValue`
 * and the diff of changes). Derived values (`nights`, `balanceAmount`) are computed here, not stored in the DB.
 *
 * `actionList` and `nextAction` say what the admin may offer -- only the server has the transition table.
 * `clientIp` is never returned, `eventList` only in the detail.
 */
function toAdminDto(item, { withEvents = false, today: day = today() } = {}) {
  if (!item) return item;
  const { clientIp, contact, payment, eventList, ...rest } = item;
  const ctx = { today: day };
  return {
    ...rest,
    nights: nightsBetween(item.dateFrom, item.dateTo),
    contactName: contact?.name ?? null,
    contactEmail: contact?.email ?? null,
    contactPhone: contact?.phone ?? null,
    totalPrice: payment?.totalPrice ?? null,
    variableSymbol: payment?.variableSymbol ?? null,
    depositAmount: payment?.deposit?.amount ?? null,
    depositDueDate: payment?.deposit?.dueDate ?? null,
    depositPaidDate: payment?.deposit?.paidDate ?? null,
    balanceAmount: balanceAmount(payment),
    balanceDueDate: payment?.balance?.dueDate ?? null,
    balancePaidDate: payment?.balance?.paidDate ?? null,
    actionList: allowedActions(item, ctx),
    nextAction: nextAction(item, ctx),
    scope: scopeOf(item, ctx.today),
    // Cancellation: written on cancel; for a reservation that can be cancelled, a preview as of today (modal).
    cancellation: item.cancellation ?? (allowedActions(item, ctx).includes("cancel") ? computeCancellation(item, ctx.today) : null),
    ...(withEvents ? { eventList: eventList ?? [] } : null),
  };
}

/**
 * A record from an import must not be edited by hand: the next `calendar/sync` overwrites
 * or deletes it by UID, so the change would silently disappear. Whoever wants to cancel
 * occupancy from a portal cancels it on the portal (design-v2.md § 6).
 */
function assertEditable(item) {
  if (item.icalFeedCode == null) return;
  throw failed(
    "importedRecord",
    `The record comes from an import (${item.icalFeedCode}) and cannot be changed in the app -- the next sync would overwrite the change.`,
    400,
  );
}

/**
 * Emails for an event; null (guest without an email) is skipped. Never throws: the write the
 * email belongs to has already happened and is the valuable part. A sending exception is
 * recorded as `failed`.
 */
/** Email preview for the admin: HTML with the QR as a data URI (shown in an iframe as the guest will see it). */
function emailPreviewDto(mail) {
  return { template: mail.template, lang: mail.lang, to: mail.to, subject: mail.subject, text: mail.text, html: htmlForBrowser(mail) };
}

async function sendAll(codeList, reservation, options) {
  // Concurrently: for a request from the web the form's request waits for the emails, two in a
  // row would double the wait. The order in the history stays by `codeList`.
  const result = await Promise.all(codeList.map(async (code) => {
    try {
      return await sendEmail(code, reservation, options);
    } catch (e) {
      console.error(`[reservation] email ${code} failed:`, e?.message ?? e);
      return { template: code, lang: null, to: null, subject: null, text: null, status: "failed", reason: null, error: String(e?.message ?? e), sentAt: null };
    }
  }));
  return result.filter(Boolean);
}

/**
 * A step after a successful write (history, emails). Its failure is logged but returns no error:
 * the state has already changed, and a 500 would make the admin (or the guest) repeat the action
 * against an already finished state.
 */
async function afterWrite(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.error(`[reservation] failed to finish ${label}:`, e?.message ?? e);
  }
}

/** The optimistic lock failed -- someone changed the record in the meantime. */
function concurrentChange() {
  return failed("concurrentChange", "The reservation was changed by someone else in the meantime. Reload it.", 409);
}

function assertPlan(doc) {
  const bad = planProblems(doc);
  if (!Object.keys(bad).length) return;
  throw failed(
    "invalidPaymentPlan",
    "Invalid payment plan: the deposit must be positive and less than the price (equal to the price for a full payment), due no later than the balance, and the balance due before arrival.",
    400,
    { paramMap: { invalidValueKeyMap: bad } },
  );
}

/** Reminders that have to be sent again after a change of a due date or arrival (once there is a cron). */
function reminderResets(changeList) {
  const fields = new Set(changeList.map(({ field }) => field));
  const set = {};
  if (fields.has("payment.deposit.dueDate")) {
    set["reminder.depositSentAt"] = null;
    set["reminder.depositOverdueSentAt"] = null;
  }
  if (fields.has("payment.balance.dueDate")) set["reminder.balanceSentAt"] = null;
  if (fields.has("dateFrom")) set["reminder.arrivalInfoSentAt"] = null;
  return set;
}

function isUniqueViolation(e) {
  return e?.code === 11000;
}

function emptyReminder() {
  return { depositSentAt: null, balanceSentAt: null, arrivalInfoSentAt: null, depositOverdueSentAt: null };
}

class ReservationCrud extends Crud {
  constructor() {
    super("reservation", dao);
  }

  /**
   * A request from the public web. It is created as `requested` and tentatively blocks the dates;
   * the owner approves it in the admin (docs/proposal-reservation-flow.md). The guest gets H1, the owner V1.
   *
   * At this point the dtoIn has already been validated and type-cast in api.js.
   */
  async createFromWeb({ dateFrom, dateTo, guestCount, contact, note, clientIp, lang }) {
    // The very first step, even before DB queries: without approved pricing no reservation is
    // created in production. If it were only at the price calculation, the response would differ
    // depending on whether Mongo happens to be available.
    assertPricingApproved();

    // Collision check against ALL blocking records -- our own and imported.
    //
    // A race condition remains: two simultaneous requests for the same dates both pass. It is
    // solved by a human approving the request and rejecting the other one (design-v1.md § 6).
    if (!(await isFree(dateFrom, dateTo))) {
      throw failed("dateOccupied", "The dates are already occupied.", 409, {
        paramMap: { invalidValueKeyMap: { dateFrom: true, dateTo: true } },
      });
    }

    const { nights, totalPrice } = calculatePrice(dateFrom, dateTo);
    const created = createEvent("created", { by: null });

    const item = await dao.create({
      propertyId: config.propertyId,
      source: "web",
      // We generate the UID up front, not from the Mongo id -- otherwise a second write would have
      // to follow and in between the export feed would contain a record without a UID.
      icalUid: `res-${randomUUID()}@caio-propertyman`,
      // null = created by us -> belongs to the export and the import must not touch it.
      icalFeedCode: null,
      state: STATE.REQUESTED,
      lang,
      dateFrom,
      dateTo,
      guestCount,
      reason: null,
      contact,
      note: note ?? null,
      desc: null,
      payment: { totalPrice, variableSymbol: null, deposit: null, balance: null },
      reminder: emptyReminder(),
      eventList: [created],
      // Only for the rate limit (§ rateLimit in config.js). Personal data -- never returned
      // from the API and deleted first when old reservations are cleaned up.
      clientIp: clientIp ?? null,
    });

    // The owner first: it matters more that the request is not lost than that the guest gets a confirmation.
    await afterWrite("request emails", async () => {
      const emailList = await sendAll(["ownerNewRequest", "requestReceived"], item, { lang });
      await dao.setEventEmails(item.id, created.at, emailList);
    });

    return { id: String(item.id), state: item.state, nights, totalPrice };
  }

  // ---------------------------------------------------------------------------------------
  // Admin
  // ---------------------------------------------------------------------------------------

  /**
   * List for the admin table. Returns `{ itemList, pageInfo }`, which is the shape that
   * `useDataList` in `UiElements.Crud` expects.
   *
   * - `scope`: `active` (waiting for a step or for the stay) / `archive` (finished), see scope.js.
   * - `year`: year of arrival, required for the archive (validated by the API).
   * - `stateList`, `source`, `arrivalFrom` / `arrivalTo` (arrival day inclusive): filters from the FilterBar.
   *
   * Active from the nearest arrival, archive from the latest.
   */
  async listForAdmin({ scope = "active", year, stateList, source, arrivalFrom, arrivalTo, pageInfo } = {}) {
    // One "today" for the query and for `scope` in the DTO -- a request over midnight would split them otherwise.
    const day = today();
    const and = [scopeQuery(scope, day)];
    if (year) and.push({ dateFrom: { $gte: `${year}-01-01`, $lt: `${year + 1}-01-01` } });
    if (stateList?.length) and.push({ state: { $in: stateList } });
    if (source) and.push({ source });
    if (arrivalFrom || arrivalTo) {
      and.push({ dateFrom: { ...(arrivalFrom ? { $gte: arrivalFrom } : null), ...(arrivalTo ? { $lte: arrivalTo } : null) } });
    }

    const result = await dao.findPageBy({ $and: and }, pageInfo, { dateFrom: scope === "archive" ? -1 : 1 });
    return { ...result, itemList: result.itemList.map((item) => toAdminDto(item, { today: day })) };
  }

  /** Detail incl. the history and the languages in which the guest can be emailed (choice in the modal). */
  async getForAdmin(id) {
    return { ...toAdminDto(await this._get(id), { withEvents: true }), emailLanguageList: emailLanguages() };
  }

  /**
   * Manual reservation or date block (`source: "manual"`).
   *
   * - A block (without contact, with `reason`) is always `confirmed`, without a price and without an email.
   * - A reservation with a guest is `confirmed` by default (`asConfirmed`); unchecked, it is created
   *   as `awaitingDeposit` with a payment plan and the guest gets a payment request (H2).
   *
   * Both have `icalFeedCode: null`, so they are exported to our feed and the portals close the dates.
   */
  /**
   * @param preview  true = write and send nothing, only return the email that would go out
   *                 (`{ email }`, `email: null` = no email). Same calculation and validation as the write.
   */
  async createManual({ data, asConfirmed = true, sendEmail: shouldSend = true, message, force, identity, preview = false }) {
    const { dateFrom, dateTo, guestCount, contact, reason, note, desc, lang, totalPrice, plan: planOverride } = data;
    await this._assertFree(dateFrom, dateTo, { force });

    // The price is calculated only when the owner did not enter it and it is a paying guest. Without
    // this condition a manual write would hit unapproved pricing even where the amount is known.
    const price = totalPrice != null ? totalPrice : contact && guestCount ? calculatePrice(dateFrom, dateTo).totalPrice : null;
    const awaiting = Boolean(contact) && !asConfirmed;
    if (awaiting && price == null) {
      throw failed("priceMissing", "A deposit cannot be requested without a price.", 400, { paramMap: { missingKeyMap: { totalPrice: true } } });
    }

    const state = awaiting ? STATE.AWAITING_DEPOSIT : STATE.CONFIRMED;
    const created = createEvent("created", { by: actorOf(identity), to: state, message: message || undefined, sendEmail: contact ? shouldSend : undefined });
    const base = {
      propertyId: config.propertyId,
      source: "manual",
      icalFeedCode: null,
      state,
      lang: lang ?? "cs",
      dateFrom,
      dateTo,
      guestCount: guestCount ?? null,
      reason: reason ?? null,
      contact: contact ?? null,
      note: note ?? null,
      desc: desc ?? null,
      payment: contact ? { totalPrice: price, variableSymbol: null, deposit: null, balance: null } : null,
      reminder: emptyReminder(),
      eventList: [created],
      clientIp: null,
    };
    if (awaiting) {
      base.payment = { ...base.payment, ...applyPlanOverride(createPaymentPlan({ totalPrice: price, dateFrom, today: today() }), planOverride, price) };
      assertPlan(base);
    }

    if (preview) {
      if (!contact) return { email: null };
      if (awaiting) base.payment.variableSymbol = await this._nextVariableSymbol(dateFrom);
      const mail = await renderEmail(awaiting ? "depositRequested" : "reservationConfirmed", base, { lang: base.lang, message });
      return { email: emailPreviewDto(mail) };
    }

    // The VS is chosen before the write; a concurrent creation with the same arrival day hits the unique
    // index and tries the next number (at most three times), the same as approval.
    let item;
    for (let attempt = 0; !item; attempt++) {
      if (awaiting) base.payment.variableSymbol = await this._nextVariableSymbol(dateFrom);
      try {
        item = await dao.create({ ...base, icalUid: `res-${randomUUID()}@caio-propertyman` });
      } catch (e) {
        if (!awaiting || !isUniqueViolation(e) || attempt >= 2) throw isUniqueViolation(e) ? failed("variableSymbolConflict", "Failed to assign a variable symbol, try again.", 409) : e;
      }
    }

    if (contact && shouldSend) {
      await afterWrite("manual reservation email", async () => {
        const template = awaiting ? "depositRequested" : "reservationConfirmed";
        const emailList = await sendAll([template], item, { lang: item.lang, message });
        await dao.setEventEmails(item.id, created.at, emailList);
      });
    }

    return toAdminDto(await this._get(item.id));
  }

  /**
   * Update of our own record: stay, contact, notes, price, deposit and due dates.
   * An imported one is refused (the next sync would overwrite it). The history gets an `update` event
   * with the list of changes; the guest gets H9 only when something they see changed and the
   * reservation is already approved.
   *
   * `changes` is in the document shape (nested `contact`, `payment.*` as dot paths).
   * The write is conditional (optimistic lock), so a concurrent transition or update overwrites nothing.
   */
  /** @param preview  as in `createManual`: only the change email (H9) that the update would send. */
  async updateOwn({ id, changes, sendEmail: shouldSend = true, message, force, identity, preview = false }) {
    const current = await this._get(id);
    assertEditable(current);

    const set = {};
    for (const [key, value] of Object.entries(changes)) {
      if (key.startsWith("payment.") || key === "contact") continue;
      set[key] = value;
    }

    // The contact is put back into the nested shape. A reservation with a guest and a block are not
    // converted into each other by an update: an emptied request would become a block without actions (it
    // could not even be rejected) and a block with an added contact would have no payments.
    if (changes.contact !== undefined) {
      const merged = { ...(current.contact ?? {}), ...changes.contact };
      const hasContact = Boolean(merged.name || merged.email || merged.phone);
      if (hasContact !== (current.contact != null)) {
        throw failed("contactChangeNotAllowed", current.contact ? "A reservation with a guest must have a contact. Create a date block separately." : "A date block cannot be converted to a reservation -- create a new one.", 400, {
          paramMap: { invalidValueKeyMap: { contactName: true, contactEmail: true, contactPhone: true } },
        });
      }
      if (hasContact) set.contact = { name: merged.name ?? null, email: merged.email ?? null, phone: merged.phone ?? null };
    }

    const paymentChanges = Object.entries(changes).filter(([key]) => key.startsWith("payment."));
    if (paymentChanges.length) set.payment = applyPaymentChanges(current, paymentChanges);

    const next = { ...current, ...set };
    if (set.dateFrom || set.dateTo) {
      if (next.dateFrom >= next.dateTo) {
        throw invalidDtoIn(CODE, "departureNotAfterArrival", "Departure must be after arrival.", { dateTo: true });
      }
      // A released record (rejected, cancelled, expired) does not block the dates, so it cannot collide either.
      if (!RELEASED_STATE_LIST.includes(next.state)) {
        await this._assertFree(next.dateFrom, next.dateTo, { force, exceptId: id });
      }
    }
    assertPlan(next);

    const changeList = diff(current, next, TRACKED_FIELDS);
    if (preview) {
      const visible = changeList.some(({ field }) => GUEST_VISIBLE_FIELDS.includes(field));
      const emailable = isGuestReservation(next) && [STATE.AWAITING_DEPOSIT, STATE.CONFIRMED].includes(next.state) && visible;
      if (!emailable) return { email: null };
      const mail = await renderEmail("reservationChanged", next, { lang: next.lang, message, changes: changeList });
      return { email: emailPreviewDto(mail) };
    }
    if (!changeList.length) return toAdminDto(current);

    if (!(await dao.updateIfCurrent(id, current, { ...set, ...reminderResets(changeList) }))) throw concurrentChange();
    const updated = await this._get(id);

    const guestVisible = changeList.some(({ field }) => GUEST_VISIBLE_FIELDS.includes(field));
    const emailable = isGuestReservation(updated) && [STATE.AWAITING_DEPOSIT, STATE.CONFIRMED].includes(updated.state) && guestVisible;

    await afterWrite("update history", async () => {
      const emailList = emailable && shouldSend ? await sendAll(["reservationChanged"], updated, { lang: updated.lang, message, changes: changeList }) : [];
      await dao.pushEvent(id, createEvent("update", {
        by: actorOf(identity),
        changes: changeList,
        message: message || undefined,
        sendEmail: emailable ? shouldSend : undefined,
        emailList,
      }));
    });

    return toAdminDto(await this._get(id));
  }

  async deleteOwn(id) {
    assertEditable(await this._get(id));
    await this.delete(id);
    return {};
  }

  /**
   * State change by an action from the admin (docs/proposal-reservation-flow.md § 3). Checks the
   * transition, performs it conditionally (optimistic lock: neither the state nor `sys.mts` changed
   * since the read), sends an email and records the event.
   */
  async transition({ id, action, sendEmail: shouldSend = true, message, paidDate, lang, identity }) {
    const current = await this._get(id);
    const ctx = { today: today() };
    const problem = transitionProblem(current, action, ctx);
    if (problem) {
      const [status, text] = TRANSITION_PROBLEM[problem];
      throw failed(problem, text, status, { dtoOut: { state: current.state, actionList: allowedActions(current, ctx) } });
    }
    const def = TRANSITIONS[action];
    const set = await this._transitionSet(current, action, ctx, { paidDate, lang });

    const applied = action === "approve"
      ? await this._approveWithVariableSymbol(id, current, set)
      : await dao.updateIfCurrent(id, current, set);
    if (!applied) throw concurrentChange();

    const updated = await this._get(id);
    await afterWrite("transition history", async () => {
      const emailList = def.template && shouldSend ? await sendAll([def.template], updated, { lang: updated.lang, message }) : [];
      await dao.pushEvent(id, createEvent("transition", {
        by: actorOf(identity),
        action,
        // Full-payment plan at the moment of the transition: by it the admin names the action
        // ("Payment received") and the state ("Awaiting payment") in the history as they were named
        // then -- the plan may change later.
        fullPayment: updated.payment?.deposit != null && updated.payment?.balance == null ? true : undefined,
        from: current.state,
        to: def.to,
        message: message || undefined,
        sendEmail: def.template ? shouldSend : undefined,
        emailList,
      }));
    });

    return toAdminDto(await this._get(id), { withEvents: true });
  }

  /**
   * What the transition writes into the record (`$set`, including dot paths). Shared by the
   * transition and the email preview, so the preview shows exactly what goes out after the transition.
   */
  async _transitionSet(current, action, ctx, { paidDate, lang } = {}) {
    if (paidDate && paidDate > ctx.today) {
      throw invalidDtoIn(CODE, "paidDateInFuture", "The payment date cannot be in the future.", { paidDate: true });
    }
    const def = TRANSITIONS[action];
    const set = { state: def.to };
    if (lang) set.lang = lang;

    switch (action) {
      case "approve":
      case "reopen": {
        // A zero price would give a deposit of 0 CZK -- the same as a missing price.
        if (!(current.payment?.totalPrice > 0)) throw failed("priceMissing", "A request cannot be approved without a price -- add it by an update.", 400);
        // Two requests for the same dates can be created concurrently (a known race on the web) --
        // but only one can be approved: another NOT APPROVED request does not prevent approval (the
        // owner picks which one to approve and rejects the other), an approved or confirmed one does.
        // The same applies to reopening an expired one.
        await this._assertFree(current.dateFrom, current.dateTo, { exceptId: current.id, ignoreStates: [STATE.REQUESTED] });
        // The plan is calculated from today: on reopening there may be ≤ 14 days left until arrival
        // (full amount) and the original due dates may be in the past. The VS stays (reopen) -- the
        // guest already has it.
        const plan = createPaymentPlan({ totalPrice: current.payment.totalPrice, dateFrom: current.dateFrom, today: ctx.today });
        set.payment = { ...current.payment, ...plan };
        Object.assign(set, { "reminder.depositSentAt": null, "reminder.depositOverdueSentAt": null, "reminder.balanceSentAt": null });
        break;
      }
      case "markDepositPaid":
        set["payment.deposit.paidDate"] = paidDate ?? ctx.today;
        break;
      case "markBalancePaid":
        set["payment.balance.paidDate"] = paidDate ?? ctx.today;
        break;
      case "cancel":
        // Cancellation fee and refund as of the cancellation day -- they stay in the reservation so
        // the owner sees them later too (the terms in the config may change).
        set.cancellation = computeCancellation(current, ctx.today);
        break;
      default:
        break;
    }
    return set;
  }

  /**
   * Preview of the email the transition sends -- without a write. For the state change modal in
   * the admin. Returns null when the action has no email or the guest has no email. For approval
   * it shows the VS the reservation would get if approved now (the real one is assigned only on approval).
   */
  async previewTransitionEmail({ id, action, lang, message, paidDate }) {
    const current = await this._get(id);
    const ctx = { today: today() };
    const problem = transitionProblem(current, action, ctx);
    if (problem) {
      const [status, text] = TRANSITION_PROBLEM[problem];
      throw failed(problem, text, status);
    }
    const def = TRANSITIONS[action];
    if (!def.template || !current.contact?.email) return { email: null };

    const set = await this._transitionSet(current, action, ctx, { paidDate, lang });
    if (action === "approve") set.payment.variableSymbol = await this._nextVariableSymbol(current.dateFrom);
    const next = applySet(current, set);
    const mail = await renderEmail(def.template, next, { lang: next.lang, message });
    return { email: emailPreviewDto(mail) };
  }

  /**
   * Approval with VS assignment. `nextVariableSymbol` picks the candidate, the index guards uniqueness:
   * when two people approve reservations with the same arrival day at once, the second hits E11000
   * and tries the next number (at most three times).
   */
  async _approveWithVariableSymbol(id, current, set) {
    for (let attempt = 0; attempt < 3; attempt++) {
      set.payment.variableSymbol = await this._nextVariableSymbol(current.dateFrom);
      try {
        return await dao.updateIfCurrent(id, current, set);
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
    throw failed("variableSymbolConflict", "Failed to assign a variable symbol, try again.", 409);
  }

  async _nextVariableSymbol(dateFrom) {
    const existing = await dao.findVariableSymbolsWithPrefix(variableSymbolPrefix(dateFrom));
    const vs = nextVariableSymbol(dateFrom, existing);
    if (!vs) throw failed("variableSymbolExhausted", "No variable symbols left for this arrival day.", 409);
    return vs;
  }

  /** Collision check that the owner may knowingly override (`force`). */
  async _assertFree(dateFrom, dateTo, { force, exceptId, ignoreStates = [] } = {}) {
    if (force) return;
    const colliding = (await dao.findOverlapping(dateFrom, dateTo)).filter((item) => item.id !== exceptId && !ignoreStates.includes(item.state));
    if (colliding.length === 0) return;

    throw failed("dateOccupied", "The dates overlap with another record.", 409, {
      paramMap: { invalidValueKeyMap: { dateFrom: true, dateTo: true } },
      // Unlike the guest, the owner may override the collision, so let them know with what.
      dtoOut: { collidingList: colliding.map(({ id, dateFrom, dateTo, source, state }) => ({ id, dateFrom, dateTo, source, state })) },
    });
  }

  /** How many reservations have come from this IP today -- the cap is in config.rateLimit. */
  async countRecentFromIp(clientIp) {
    if (!clientIp) return 0;
    const since = `${addDays(new Date().toISOString().slice(0, 10), -1)}T00:00:00.000Z`;
    return (await dao.countByIpSince(clientIp, since)).length;
  }

  /**
   * Projection of one iCal feed into the collection (stage 6).
   *
   * EVERY query is filtered on the `icalFeedCode` of that one feed. Without it the delete step
   * would touch our own reservations (icalFeedCode: null) or records of the other portal -- it is
   * the most important thing not to break in the import (design-v1.md § 7).
   *
   * It is idempotent: running it again over the same feed changes nothing.
   */
  async syncFeed(icalFeedCode, events) {
    const existing = await dao.findByFeed(icalFeedCode);
    const byUid = new Map(existing.map((r) => [r.icalUid, r]));
    const seen = new Set();

    let created = 0;
    let updated = 0;
    let deleted = 0;

    for (const { uid, dateFrom, dateTo } of events) {
      seen.add(uid);
      const current = byUid.get(uid);

      if (!current) {
        // Only the UID and the dates are taken from the VEVENT. SUMMARY/DESCRIPTION with the guest's
        // personal data (e-chalupy sends them in the "with details" export) is discarded, not stored.
        await dao.create({
          propertyId: config.propertyId,
          source: icalFeedCode,
          icalUid: uid,
          icalFeedCode,
          state: STATE.CONFIRMED,
          lang: null,
          dateFrom,
          dateTo,
          guestCount: null,
          reason: null,
          contact: null,
          note: null,
          desc: null,
          payment: null,
          reminder: emptyReminder(),
          eventList: [createEvent("created", { by: null })],
          clientIp: null,
        });
        created++;
      } else if (current.dateFrom !== dateFrom || current.dateTo !== dateTo) {
        await dao.update({ id: current.id, dateFrom, dateTo });
        updated++;
      }
    }

    // What disappeared from the feed disappears here too -- but only within this feed.
    for (const record of existing) {
      if (!seen.has(record.icalUid)) {
        await dao.delete(record.id);
        deleted++;
      }
    }

    return { created, updated, deleted, total: events.length };
  }
}

/** `$set` (also with dot paths) applied to a copy of the document -- for a preview without a write. */
function applySet(doc, set) {
  const next = structuredClone(doc);
  for (const [path, value] of Object.entries(set)) {
    const keys = path.split(".");
    let target = next;
    for (const key of keys.slice(0, -1)) {
      if (target[key] == null || typeof target[key] !== "object") target[key] = {};
      target = target[key];
    }
    target[keys.at(-1)] = value;
  }
  return next;
}

/**
 * Manual override of the default plan (deposit amount, due dates) on creation.
 * Balance due date: a date = plan with a deposit and a balance, an explicit null = full amount at once
 * (deposit = price, unless the owner entered something else).
 */
function applyPlanOverride(plan, override = {}, totalPrice) {
  const result = { deposit: { ...plan.deposit }, balance: plan.balance ? { ...plan.balance } : null };
  if (override.balanceDueDate === null) {
    result.balance = null;
    result.deposit.amount = totalPrice;
  } else if (override.balanceDueDate) {
    result.balance = { dueDate: override.balanceDueDate, paidDate: null };
  }
  if (override.depositAmount != null) result.deposit.amount = override.depositAmount;
  if (override.depositDueDate) result.deposit.dueDate = override.depositDueDate;
  return result;
}

/**
 * Money update. The price can always be changed for a reservation with a guest; the deposit and
 * balance only when the plan exists (after approval) -- otherwise there is nothing to update and
 * the request is an error.
 *
 * - Balance due date: a date on a plan without a balance **adds** the balance, null **removes** it
 *   (= full amount at once). A paid balance cannot be removed.
 * - For a full payment the unpaid deposit follows the price (higher price = higher payment), unless
 *   the owner entered the deposit amount explicitly. A paid deposit does not follow the price --
 *   the owner then has to collect the difference as a balance (`planProblems` forces them to).
 * - Payment dates can only be **corrected** by an update (a different date on an already paid
 *   payment). Marking as paid or cancelling a payment is only possible by an action -- otherwise
 *   the state (`awaitingDeposit`) and the payment (paid deposit) would each say something else.
 */
function applyPaymentChanges(current, paymentChanges) {
  if (!current.payment) {
    throw failed("noPayment", "A date block or an import has no payments.", 400);
  }
  const payment = {
    ...current.payment,
    deposit: current.payment.deposit ? { ...current.payment.deposit } : null,
    balance: current.payment.balance ? { ...current.payment.balance } : null,
  };
  const noPlan = {};
  const badPaid = {};
  let depositAmountGiven = false;
  for (const [path, value] of paymentChanges) {
    const [, part, field] = path.split(".");
    if (part === "totalPrice") {
      payment.totalPrice = value;
      continue;
    }
    const formKey = `${part}${field[0].toUpperCase()}${field.slice(1)}`;
    if (!payment.deposit) {
      noPlan[formKey] = true;
      continue;
    }
    if (part === "balance" && field === "dueDate") {
      if (value === null) {
        if (payment.balance?.paidDate) badPaid.balanceDueDate = true;
        else payment.balance = null;
      } else if (!payment.balance) {
        payment.balance = { dueDate: value, paidDate: null };
      } else {
        payment.balance.dueDate = value;
      }
      continue;
    }
    if (!payment[part]) {
      noPlan[formKey] = true;
      continue;
    }
    if (field === "paidDate" && (payment[part].paidDate == null || value == null)) {
      if (payment[part].paidDate !== value) badPaid[formKey] = true;
      continue;
    }
    if (part === "deposit" && field === "amount") depositAmountGiven = true;
    payment[part][field] = value;
  }
  if (Object.keys(noPlan).length) {
    throw failed("noPaymentPlan", "The deposit and balance can only be updated after the request is approved.", 400, { paramMap: { invalidValueKeyMap: noPlan } });
  }
  if (Object.keys(badPaid).length) {
    throw failed("paidDateNotEditable", "Payment is marked by the markDepositPaid / markBalancePaid action; an update can only correct the date. A paid balance cannot be removed.", 400, {
      paramMap: { invalidValueKeyMap: badPaid },
    });
  }
  // Full amount at once: the unpaid deposit follows the price.
  if (payment.deposit && !payment.balance && !payment.deposit.paidDate && !depositAmountGiven) {
    payment.deposit.amount = payment.totalPrice;
  }
  return payment;
}

export default new ReservationCrud();
