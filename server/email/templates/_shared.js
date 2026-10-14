// Společné kusy šablon: platby, řádky pobytu, storno. Šablona dostane kontext `c`
// (viz send.js → buildContext): c.r = rezervace z DB, c.f = formátovač, c.message, …

import config from "../../config.js";
import { p, payment } from "../blocks.js";
import { cancellationPolicyText } from "../../reservation/cancellation.js";
import { formatter } from "../format.js";

const QR_DATE = formatter("cs");

/**
 * Popisek pro QR zprávu: bez diakritiky, krátký (render ji ořízne na 60 znaků). Česky ve všech
 * jazycích (QR je pro všechny jazyky stejný, rozhodnutí 2026-10-08) -- čte ho vlastník ve
 * výpisu z účtu, ne host.
 */
function qrMessage(c, what) {
  return `${config.email.propertyName} ${what} ${QR_DATE.date(c.r.dateFrom)}`;
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

const CANCELLATION_LABEL = { cs: "Storno podmínky", en: "Cancellation policy", de: "Stornobedingungen", pl: "Warunki rezygnacji", sk: "Storno podmienky" };

/** Storno podmínky z `config.reservation.cancellationPolicy` (reservation/cancellation.js) v jazyce e-mailu. */
export function cancellation(c) {
  const label = CANCELLATION_LABEL[c.lang] ?? CANCELLATION_LABEL.cs;
  return p(`${label}: ${cancellationPolicyText(undefined, c.lang)}`);
}
