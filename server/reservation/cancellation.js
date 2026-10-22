import config from "../config.js";
import { nightsBetween } from "../services/dates.js";
import { formatter } from "../email/format.js";
import { paidAmount } from "./payment.js";

// Cancellation policy (owner 2026-10-10). The fee is a percentage of the total price of the
// stay by the number of days from the cancellation to the day of arrival:
//
//   0–14 days   100 %
//   15–30 days   50 %
//   31–60 days   25 %
//   61 or more    0 %
//
// The bands are in `config.reservation.cancellationPolicy` (upper day limit inclusive →
// percentage); anything above the last limit is free. The only place of the rule: emails (policy
// text, refund calculation), the admin (preview in the Cancel modal, record in the reservation)
// and the web take it from here.

/** Cancellation fee percentage for a number of days before arrival. */
export function cancellationPercent(daysToArrival, policy = config.reservation.cancellationPolicy) {
  const band = policy.find(({ maxDays }) => daysToArrival <= maxDays);
  return band ? band.percent : 0;
}

/**
 * Cancellation as of `today`: how many days are left until arrival, the percentage, the fee
 * from the price and how much of what was paid to refund (never negative -- an underpayment
 * is not claimed from the guest automatically).
 *
 * @returns {{ date, daysToArrival, percent, fee, paid, refund }}
 */
export function computeCancellation(reservation, today) {
  // nightsBetween = difference in days between two ISO dates (via UTC, no daylight saving shift).
  const daysToArrival = Math.max(0, nightsBetween(today, reservation.dateFrom));
  const percent = cancellationPercent(daysToArrival);
  const totalPrice = reservation.payment?.totalPrice ?? 0;
  const fee = Math.round((totalPrice * percent) / 100);
  const paid = paidAmount(reservation.payment);
  return { date: today, daysToArrival, percent, fee, paid, refund: Math.max(0, paid - fee) };
}

// Pieces of the cancellation policy sentence for each email language (server/email/templates).
// `fee` gets the percentage already formatted for the language (`formatter().percent`).
const POLICY_PHRASES = {
  cs: { free: (d) => `${d} a více dní před příjezdem zdarma`, upTo: (d) => `${d} a méně dní`, range: (a, b) => `${a}–${b} dní`, fee: (pct) => `${pct} ceny pobytu` },
  en: { free: (d) => `${d} or more days before arrival free of charge`, upTo: (d) => `${d} days or fewer`, range: (a, b) => `${a}–${b} days`, fee: (pct) => `${pct} of the price of the stay` },
  de: { free: (d) => `${d} oder mehr Tage vor Anreise kostenlos`, upTo: (d) => `${d} oder weniger Tage`, range: (a, b) => `${a}–${b} Tage`, fee: (pct) => `${pct} des Aufenthaltspreises` },
  pl: { free: (d) => `${d} lub więcej dni przed przyjazdem bezpłatnie`, upTo: (d) => `${d} lub mniej dni`, range: (a, b) => `${a}–${b} dni`, fee: (pct) => `${pct} ceny pobytu` },
  sk: { free: (d) => `${d} a viac dní pred príchodom zadarmo`, upTo: (d) => `${d} a menej dní`, range: (a, b) => `${a}–${b} dní`, fee: (pct) => `${pct} ceny pobytu` },
};

/** The policy as a sentence for an email ("61 a více dní před příjezdem zdarma; …"). */
export function cancellationPolicyText(policy = config.reservation.cancellationPolicy, lang = "cs") {
  const t = POLICY_PHRASES[lang] ?? POLICY_PHRASES.cs;
  const { percent } = formatter(POLICY_PHRASES[lang] ? lang : "cs");
  const parts = [];
  const last = policy[policy.length - 1];
  parts.push(t.free(last.maxDays + 1));
  for (let i = policy.length - 1; i >= 0; i--) {
    const from = i === 0 ? 0 : policy[i - 1].maxDays + 1;
    const range = from === 0 ? t.upTo(policy[i].maxDays) : t.range(from, policy[i].maxDays);
    parts.push(`${range} ${t.fee(percent(policy[i].percent))}`);
  }
  return parts.join("; ") + ".";
}
