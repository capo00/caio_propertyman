// Stavový automat rezervace (docs/proposal-reservation-flow.md § 2–3).
//
// Stav mění JEN člověk akcí v adminu (rozhodnutí majitele 2026-10-08) -- výjimkou je vznik
// žádosti z webu. Žádný cron stav nemění. Server je tady autoritativní: admin si povolené
// akce bere z `actionList` v odpovědi, nemá vlastní kopii téhle tabulky.

import { balanceAmount } from "./payment.js";

export const STATE = Object.freeze({
  REQUESTED: "requested", // nová žádost z webu, termín předběžně blokovaný
  AWAITING_DEPOSIT: "awaitingDeposit", // přijato, čeká se na zálohu
  CONFIRMED: "confirmed", // záloha zaplacena / ruční záznam / import
  COMPLETED: "completed", // po pobytu
  REJECTED: "rejected", // zamítnutá žádost
  CANCELLED: "cancelled", // storno
  EXPIRED: "expired", // záloha nedorazila
});

export const STATE_LIST = Object.values(STATE);

/** Tyhle stavy termín uvolňují. Všechno ostatní blokuje -- i stav, který zatím neznáme. */
export const RELEASED_STATE_LIST = [STATE.REJECTED, STATE.CANCELLED, STATE.EXPIRED];

/** Filtr „Aktivní“ v adminu: to, co ještě čeká na nějaký krok nebo na pobyt. */
export const ACTIVE_STATE_LIST = [STATE.REQUESTED, STATE.AWAITING_DEPOSIT, STATE.CONFIRMED];

/** Konečné stavy -- rezervace hosta v nich patří do archivu (viz scope.js). */
export const ARCHIVED_STATE_LIST = [STATE.COMPLETED, ...RELEASED_STATE_LIST];

/**
 * Akce → z jakých stavů smí, do jakého vede a jaký e-mail k ní patří (§ 5 návrhu).
 * `guard` je doplňková podmínka nad záznamem; vrací kód důvodu, proč akce nejde, nebo null.
 */
export const TRANSITIONS = Object.freeze({
  approve: { from: [STATE.REQUESTED], to: STATE.AWAITING_DEPOSIT, template: "depositRequested" },
  reject: { from: [STATE.REQUESTED], to: STATE.REJECTED, template: "requestRejected" },
  markDepositPaid: { from: [STATE.AWAITING_DEPOSIT], to: STATE.CONFIRMED, template: "reservationConfirmed" },
  expire: {
    from: [STATE.AWAITING_DEPOSIT],
    to: STATE.EXPIRED,
    template: "reservationExpired",
    // „Propadlo“ až po splatnosti -- e-mail hostovi říká „do <splatnost> jsme neobdrželi zálohu“.
    // Ukončit dřív (host se ozval, že nepřijede) jde stornem.
    guard: (item, { today }) => (item.payment?.deposit?.dueDate && item.payment.deposit.dueDate < today ? null : "notOverdue"),
  },
  reopen: { from: [STATE.EXPIRED], to: STATE.AWAITING_DEPOSIT, template: "depositRequested" },
  cancel: { from: [STATE.AWAITING_DEPOSIT, STATE.CONFIRMED], to: STATE.CANCELLED, template: "reservationCancelled" },
  markBalancePaid: {
    from: [STATE.CONFIRMED],
    to: STATE.CONFIRMED,
    template: null,
    // Doplatek musí existovat, nebýt zaplacený a mít nenulovou částku (záloha upravená na celou
    // cenu = není co doplácet).
    guard: (item) => (item.payment?.balance && !item.payment.balance.paidDate && balanceAmount(item.payment) > 0 ? null : "noBalanceDue"),
  },
  complete: {
    from: [STATE.CONFIRMED],
    to: STATE.COMPLETED,
    template: "thankYou",
    // Pobyt musí skončit (den odjezdu už nastal) -- jinak by šlo „ukončit“ budoucí rezervaci.
    guard: (item, { today }) => (item.dateTo <= today ? null : "stayNotFinished"),
  },
});

export const ACTION_LIST = Object.keys(TRANSITIONS);

/**
 * Smí se se záznamem vůbec hýbat stavem? Import patří feedu (příští sync by změnu přepsal)
 * a blokace termínu nemá hosta, takže nemá kam postupovat.
 */
export function isGuestReservation(item) {
  return item.icalFeedCode == null && item.contact != null;
}

/** Proč akce nejde, nebo null. Pořadí důvodů je i pořadí, v jakém je hlásí API. */
export function transitionProblem(item, action, ctx) {
  const def = TRANSITIONS[action];
  if (!def) return "unknownAction";
  if (!isGuestReservation(item)) return "notGuestReservation";
  if (!def.from.includes(item.state)) return "invalidTransition";
  return def.guard?.(item, ctx) ?? null;
}

/** Akce, které admin smí nabídnout. Pořadí = pořadí v TRANSITIONS. */
export function allowedActions(item, ctx) {
  return ACTION_LIST.filter((action) => transitionProblem(item, action, ctx) === null);
}

/**
 * „Další krok“ -- akce, která se v seznamu ukáže přímo v řádku. Ostatní povolené jdou do menu.
 * null = v tomhle stavu není co posunout dopředu.
 */
export function nextAction(item, ctx) {
  const allowed = allowedActions(item, ctx);
  for (const candidate of ["approve", "markDepositPaid", "markBalancePaid", "complete"]) {
    if (allowed.includes(candidate)) return candidate;
  }
  return null;
}
