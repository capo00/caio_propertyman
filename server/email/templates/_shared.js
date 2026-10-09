// Společné kusy šablon: platby, řádky pobytu, storno. Šablona dostane kontext `c`
// (viz send.js → buildContext): c.r = rezervace z DB, c.f = formátovač, c.message, …

import config from "../../config.js";
import { p, payment } from "../blocks.js";
import { cancellationPolicyText } from "../../reservation/cancellation.js";

/** Popisek pro QR zprávu: bez diakritiky, krátký (render ji ořízne na 60 znaků). */
function qrMessage(c, what) {
  return `${config.email.propertyName} ${what} ${c.f.date(c.r.dateFrom)}`;
}

/** Je nezaplacený doplatek, který má smysl chtít? */
export function hasUnpaidBalance(c) {
  return Boolean(c.r.payment?.balance && !c.r.payment.balance.paidDate && c.balanceAmount > 0);
}

/** Platí se celá částka najednou (přijetí 14 a méně dní před příjezdem, nebo záloha = cena)? */
export function isFullPayment(c) {
  return Boolean(c.r.payment?.deposit) && !c.r.payment.balance;
}

/** Blok platby zálohy (nebo celé částky). */
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

/** Storno podmínky z `config.reservation.cancellationPolicy` (reservation/cancellation.js). */
export function cancellation() {
  return p(`Storno podmínky: ${cancellationPolicyText()}`);
}
