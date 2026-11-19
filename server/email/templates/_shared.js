// Shared pieces of the templates: payments, stay rows, cancellation. A template gets the context `c`
// (see send.js → buildContext): c.r = the reservation from the DB, c.f = the formatter, c.message, …

import { SITE } from "../site.js";
import { p, payment } from "../blocks.js";
import { cancellationPolicyText } from "../../reservation/cancellation.js";
import { formatter } from "../format.js";
import { reminderPhase } from "../../reservation/states.js";

const QR_DATE = formatter("cs");

/**
 * Caption for the QR message: no diacritics, short (render cuts it to 60 characters). Czech in
 * every language (the QR code is the same for all languages, decision 2026-10-08) -- the owner
 * reads it in the bank statement, not the guest.
 */
function qrMessage(c, what) {
  return `${SITE.name} ${what} ${QR_DATE.date(c.r.dateFrom)}`;
}

/** Is there an unpaid balance worth asking for? */
export function hasUnpaidBalance(c) {
  return Boolean(c.r.payment?.balance && !c.r.payment.balance.paidDate && c.balanceAmount > 0);
}

/** Is the full amount paid at once (accepted 18 or fewer days before arrival, or deposit = price; payment.js)? */
export function isFullPayment(c) {
  return Boolean(c.r.payment?.deposit) && !c.r.payment.balance;
}

/**
 * Phase of a payment reminder (`beforeDue` / `overdue` / `fullDue`, reservation/states.js): the
 * one the admin passed, otherwise computed from `c.today` (preview tool, tests).
 */
export function reminderPhaseOf(c, code) {
  return c.phase ?? reminderPhase(c.r, code, { today: c.today });
}

/**
 * Payment block for the deposit (or the full amount). `dueDate: null` = no due date in the block
 * and the QR code -- an overdue payment is to be paid as soon as possible.
 */
export function depositPayment(c, { dueDate = c.r.payment.deposit.dueDate } = {}) {
  const pay = c.r.payment;
  return payment({
    kind: isFullPayment(c) ? "full" : "deposit",
    amount: pay.deposit.amount,
    dueDate,
    variableSymbol: pay.variableSymbol,
    qrMessage: qrMessage(c, isFullPayment(c) ? "pobyt" : "zaloha"),
  });
}

/** Blok platby doplatku. `dueDate: null` = po splatnosti, bez data (jako u zálohy). */
export function balancePayment(c, { dueDate = c.r.payment.balance.dueDate } = {}) {
  return payment({
    kind: "balance",
    amount: c.balanceAmount,
    dueDate,
    variableSymbol: c.r.payment.variableSymbol,
    qrMessage: qrMessage(c, "doplatek"),
  });
}

/**
 * The whole price at once: the deposit is overdue and it is time for the balance too (deposit
 * reminder, phase `fullDue`). Nothing is paid yet, so the amount is the price.
 */
export function fullAmountPayment(c) {
  return payment({
    kind: "full",
    amount: c.r.payment.totalPrice,
    dueDate: fullAmountDueDate(c),
    variableSymbol: c.r.payment.variableSymbol,
    qrMessage: qrMessage(c, "pobyt"),
  });
}

/** Due date of the full amount: the balance's, or null (as soon as possible) once it has passed. */
export function fullAmountDueDate(c) {
  const due = c.r.payment.balance?.dueDate;
  return due && due >= c.today ? due : null;
}

const CANCELLATION_LABEL = { cs: "Storno podmínky", en: "Cancellation policy", de: "Stornobedingungen", pl: "Warunki rezygnacji", sk: "Stornovacie podmienky" };

/** The cancellation policy from server.config.js `reservation.cancellationPolicy` (reservation/cancellation.js) in the email's language. */
export function cancellation(c) {
  const label = CANCELLATION_LABEL[c.lang] ?? CANCELLATION_LABEL.cs;
  return p(`${label}: ${cancellationPolicyText(undefined, c.lang)}`);
}
