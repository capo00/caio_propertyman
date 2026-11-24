// Stavový automat rezervace (docs/proposal-reservation-flow.md § 2–3).
//
// Stav mění JEN člověk akcí v adminu (rozhodnutí majitele 2026-10-08) -- výjimkou je vznik
// žádosti z webu. Žádný cron stav nemění. Server je tady autoritativní: admin si povolené
// akce bere z `actionList` v odpovědi, nemá vlastní kopii téhle tabulky.

import { balanceAmount } from "./payment.js";
import { addDays, nightsBetween } from "../services/dates.js";

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
    // H11: the guest learns the stay is paid in full (the owner may leave the e-mail off).
    template: "balanceReceived",
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

// ---------------------------------------------------------------------------------------------
// E-maily, které majitelka posílá ručně z adminu (docs/proposal-admin-emails.md). Stav nemění.
// Server je autoritativní stejně jako u přechodů: admin bere dostupné e-maily z `emailActionList`
// a výrazné z `emailHighlight`.
// ---------------------------------------------------------------------------------------------

/**
 * Kolik dní předem je akce výrazná (v řádku seznamu a v hlavičce detailu). Navazuje na původně
 * plánovaný cron: připomínka zálohy 24 h před splatností, doplatku 3 dny před splatností.
 * `arrivalInfoUrgent` = od kolika dní před příjezdem jsou informace `positive` místo `building`.
 */
export const EMAIL_WINDOW = Object.freeze({ depositReminder: 1, balanceReminder: 3, arrivalInfo: 3, arrivalInfoUrgent: 2 });

/** Připomínky platby -- u nich je tlačítko „… přijata“ jen ikona (rozhodnutí majitelky 2026-11-19). */
export const PAYMENT_REMINDER_LIST = ["depositReminder", "balanceReminder"];

/** Pole v `reminder`, kam se zapíše čas posledního odeslání. */
export const REMINDER_FIELD = Object.freeze({
  depositReminder: "depositSentAt",
  balanceReminder: "balanceSentAt",
  arrivalInfo: "arrivalInfoSentAt",
});

function unpaidDeposit(item) {
  return Boolean(item.payment?.deposit && !item.payment.deposit.paidDate);
}

function unpaidBalance(item) {
  return Boolean(item.payment?.balance && !item.payment.balance.paidDate && balanceAmount(item.payment) > 0);
}

/** Je všechno zaplaceno? Potvrzená rezervace bez platebního plánu (ruční „potvrzená“) taky. */
export function isFullyPaid(item) {
  return !unpaidDeposit(item) && !unpaidBalance(item);
}

const EMAIL_ACTIONS = Object.freeze({
  depositReminder: {
    from: [STATE.AWAITING_DEPOSIT],
    guard: (item) => (unpaidDeposit(item) && item.payment.deposit.dueDate ? null : "noDepositDue"),
  },
  balanceReminder: {
    from: [STATE.CONFIRMED],
    guard: (item) => (unpaidBalance(item) ? null : "noBalanceDue"),
  },
  arrivalInfo: {
    from: [STATE.CONFIRMED],
    guard: (item, { today }) => {
      if (item.dateTo <= today) return "stayFinished";
      // Dřív než 3 dny před příjezdem jen u plně zaplacené rezervace (majitelka 2026-11-19).
      if (!isFullyPaid(item) && nightsBetween(today, item.dateFrom) > EMAIL_WINDOW.arrivalInfo) return "notFullyPaid";
      return null;
    },
  },
});

export const EMAIL_ACTION_LIST = Object.keys(EMAIL_ACTIONS);

/** Proč e-mail nejde poslat, nebo null. */
export function emailProblem(item, email, ctx) {
  const def = EMAIL_ACTIONS[email];
  if (!def) return "unknownEmail";
  if (!isGuestReservation(item)) return "emailNoGuest";
  if (!item.contact?.email) return "noGuestEmail";
  if (!def.from.includes(item.state)) return "invalidEmailState";
  return def.guard(item, ctx) ?? null;
}

/** E-maily, které admin smí nabídnout (v menu). Pořadí = pořadí v EMAIL_ACTIONS. */
export function allowedEmails(item, ctx) {
  return EMAIL_ACTION_LIST.filter((email) => emailProblem(item, email, ctx) === null);
}

/**
 * Fáze připomínky platby -- podle ní šablona volí text (proposal § 4):
 * - `beforeDue`: splatnost ještě nenastala (nebo je dnes);
 * - `overdue`: po splatnosti;
 * - `fullDue` (jen záloha s doplatkem): záloha je po splatnosti a do splatnosti doplatku zbývají
 *   3 dny a méně -- e-mail žádá celou částku.
 * null pro e-mail, který fáze nemá.
 */
export function reminderPhase(item, email, { today }) {
  const pay = item.payment;
  if (email === "depositReminder") {
    if (today <= pay.deposit.dueDate) return "beforeDue";
    if (unpaidBalance(item) && today >= addDays(pay.balance.dueDate, -EMAIL_WINDOW.balanceReminder)) return "fullDue";
    return "overdue";
  }
  if (email === "balanceReminder") return today <= pay.balance.dueDate ? "beforeDue" : "overdue";
  return null;
}

/**
 * Výrazné e-mailové akce v pořadí, v jakém je admin ukáže na prvních místech (proposal § 3):
 * informace k příjezdu, pak připomínka platby. `[{ email, colorScheme }]`.
 *
 * - Informace k příjezdu: 3 dny před příjezdem `building`, od 2 dnů do dne příjezdu `positive`
 *   (uuGDS název pro „success“);
 *   po odeslání už ne.
 * - Připomínka zálohy od 1 dne, doplatku od 3 dnů před splatností, `warning`, dokud se nezaplatí
 *   (odeslání na tom nic nemění).
 */
export function emailHighlight(item, ctx) {
  const allowed = allowedEmails(item, ctx);
  const list = [];
  if (allowed.includes("arrivalInfo") && !item.reminder?.arrivalInfoSentAt) {
    const days = nightsBetween(ctx.today, item.dateFrom);
    if (days >= 0 && days <= EMAIL_WINDOW.arrivalInfo) {
      list.push({ email: "arrivalInfo", colorScheme: days <= EMAIL_WINDOW.arrivalInfoUrgent ? "positive" : "building" });
    }
  }
  if (allowed.includes("depositReminder") && ctx.today >= addDays(item.payment.deposit.dueDate, -EMAIL_WINDOW.depositReminder)) {
    list.push({ email: "depositReminder", colorScheme: "warning" });
  }
  if (allowed.includes("balanceReminder") && ctx.today >= addDays(item.payment.balance.dueDate, -EMAIL_WINDOW.balanceReminder)) {
    list.push({ email: "balanceReminder", colorScheme: "warning" });
  }
  return list;
}
