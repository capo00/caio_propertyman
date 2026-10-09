import config from "../config.js";
import { addDays, nightsBetween } from "../services/dates.js";

// Platební plán rezervace: záloha, doplatek, splatnosti (docs/proposal-reservation-flow.md § 2.1).
//
// Ukládá se jen to, co je rozhodnutí (cena, částka zálohy, splatnosti, data zaplacení).
// Částka doplatku se vždy dopočítá (`balanceAmount`), aby se nemohla rozejít s cenou.

const rules = () => config.reservation;

function minIso(a, b) {
  return a <= b ? a : b;
}

function maxIso(a, b) {
  return a >= b ? a : b;
}

/**
 * Plán při přijetí žádosti (a při ruční rezervaci, která se nevytváří jako potvrzená).
 *
 * - 14 a méně dní do příjezdu: celá částka najednou, `balance: null`.
 * - Jinak záloha 50 % (zaokrouhleno na koruny) a doplatek splatný 14 dní před příjezdem.
 *
 * Splatnost zálohy je den přijetí + 3, ale nikdy později než splatnost doplatku: při 15–16
 * dnech do příjezdu by jinak záloha byla splatná až po doplatku. U platby celé částky nesmí být
 * splatnost po příjezdu (a nikdy před dneškem).
 */
export function createPaymentPlan({ totalPrice, dateFrom, today }) {
  const { depositPercent, depositDueDays, fullPaymentDaysBeforeArrival, balanceDueDaysBeforeArrival } = rules();
  const daysToArrival = nightsBetween(today, dateFrom);
  const defaultDue = addDays(today, depositDueDays);

  if (daysToArrival <= fullPaymentDaysBeforeArrival) {
    const dueDate = maxIso(today, minIso(defaultDue, addDays(dateFrom, -1)));
    return { deposit: { amount: totalPrice, dueDate, paidDate: null }, balance: null };
  }

  const balanceDueDate = addDays(dateFrom, -balanceDueDaysBeforeArrival);
  return {
    deposit: {
      amount: Math.round((totalPrice * depositPercent) / 100),
      dueDate: minIso(defaultDue, balanceDueDate),
      paidDate: null,
    },
    balance: { dueDate: balanceDueDate, paidDate: null },
  };
}

/**
 * Je platební plán konzistentní? Vrací mapu vadných polí formuláře (prázdná = v pořádku).
 * Kontroluje se po každé úpravě i při vytvoření -- i když se změnil třeba jen příjezd, protože
 * právě ten může splatnosti rozbít (doplatek po příjezdu).
 *
 * Dva tvary plánu a nic mezi nimi (oponentní review E2 -- jinak hostovi odcházelo „Doplatek
 * 0 Kč“ nebo „závazně potvrzeno“ s nedoplatkem):
 *   - záloha + doplatek: 0 < záloha < cena, doplatek = cena − záloha > 0;
 *   - celá částka najednou (`balance: null`): záloha = cena.
 *
 * VS se při změně příjezdu záměrně NEMĚNÍ: host ho už dostal v e-mailu a páruje se podle něj.
 */
export function planProblems(doc) {
  const payment = doc.payment;
  const bad = {};
  if (!payment?.deposit) return bad;
  const total = payment.totalPrice;
  const amount = payment.deposit.amount;
  if (total == null || total <= 0) bad.totalPrice = true;
  if (amount == null || amount <= 0) bad.depositAmount = true;
  else if (total != null && (payment.balance ? amount >= total : amount !== total)) bad.depositAmount = true;
  if (!payment.deposit.dueDate || payment.deposit.dueDate > doc.dateFrom) bad.depositDueDate = true;
  if (payment.balance) {
    if (!payment.balance.dueDate || payment.balance.dueDate >= doc.dateFrom) bad.balanceDueDate = true;
    else if (payment.deposit.dueDate && payment.deposit.dueDate > payment.balance.dueDate) bad.depositDueDate = true;
  }
  return bad;
}

/** Kolik host už zaplatil (záloha a doplatek, co mají datum zaplacení). */
export function paidAmount(payment) {
  if (!payment?.deposit) return 0;
  return (payment.deposit.paidDate ? payment.deposit.amount : 0) + (payment.balance?.paidDate ? balanceAmount(payment) ?? 0 : 0);
}

/** Kolik zbývá doplatit. null, když se platí celé najednou nebo plán ještě není. */
export function balanceAmount(payment) {
  if (!payment?.balance || payment.totalPrice == null || !payment.deposit) return null;
  return Math.max(0, payment.totalPrice - payment.deposit.amount);
}

/** Prefix variabilního symbolu: YYMMDD data příjezdu. */
export function variableSymbolPrefix(dateFrom) {
  return dateFrom.slice(2).replace(/-/g, "");
}

/**
 * Další volný VS pro daný příjezd: prefix + dvoumístné pořadí (01–99). `existing` jsou VS,
 * které už prefix mají. Unikátnost nakonec hlídá index v DB -- tohle jen vybírá kandidáta.
 */
export function nextVariableSymbol(dateFrom, existing) {
  const prefix = variableSymbolPrefix(dateFrom);
  const used = existing
    .filter((vs) => typeof vs === "string" && vs.startsWith(prefix) && vs.length === prefix.length + 2)
    .map((vs) => Number(vs.slice(prefix.length)))
    .filter(Number.isInteger);
  const next = (used.length ? Math.max(...used) : 0) + 1;
  if (next > 99) return null;
  return prefix + String(next).padStart(2, "0");
}
