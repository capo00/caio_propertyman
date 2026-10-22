// Shared pieces of the templates: payments, stay rows, cancellation. A template gets the context `c`
// (see send.js → buildContext): c.r = the reservation from the DB, c.f = the formatter, c.message, …

import config from "../../config.js";
import { p, payment } from "../blocks.js";
import { cancellationPolicyText } from "../../reservation/cancellation.js";
import { formatter } from "../format.js";

const QR_DATE = formatter("cs");

/**
 * Caption for the QR message: no diacritics, short (render cuts it to 60 characters). Czech in
 * every language (the QR code is the same for all languages, decision 2026-10-08) -- the owner
 * reads it in the bank statement, not the guest.
 */
function qrMessage(c, what) {
  return `${config.email.propertyName} ${what} ${QR_DATE.date(c.r.dateFrom)}`;
}

/** Is there an unpaid balance worth asking for? */
export function hasUnpaidBalance(c) {
  return Boolean(c.r.payment?.balance && !c.r.payment.balance.paidDate && c.balanceAmount > 0);
}

/** Is the full amount paid at once (accepted 14 or fewer days before arrival, or deposit = price)? */
export function isFullPayment(c) {
  return Boolean(c.r.payment?.deposit) && !c.r.payment.balance;
}

/** Payment block for the deposit (or the full amount). */
export function depositPayment(c) {
  const pay = c.r.payment;
  return payment({
    kind: isFullPayment(c) ? "full" : "deposit",
    amount: pay.deposit.amount,
    dueDate: pay.deposit.dueDate,
    variableSymbol: pay.variableSymbol,
    qrMessage: qrMessage(c, isFullPayment(c) ? "pobyt" : "zaloha"),
  });
}

/** Blok platby doplatku. */
export function balancePayment(c) {
  return payment({
    kind: "balance",
    amount: c.balanceAmount,
    dueDate: c.r.payment.balance.dueDate,
    variableSymbol: c.r.payment.variableSymbol,
    qrMessage: qrMessage(c, "doplatek"),
  });
}

const CANCELLATION_LABEL = { cs: "Storno podmínky", en: "Cancellation policy", de: "Stornobedingungen", pl: "Warunki rezygnacji", sk: "Stornovacie podmienky" };

/** The cancellation policy from `config.reservation.cancellationPolicy` (reservation/cancellation.js) in the email's language. */
export function cancellation(c) {
  const label = CANCELLATION_LABEL[c.lang] ?? CANCELLATION_LABEL.cs;
  return p(`${label}: ${cancellationPolicyText(undefined, c.lang)}`);
}
