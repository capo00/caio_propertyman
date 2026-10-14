import config from "../config.js";
import { nightsBetween } from "../services/dates.js";
import { paidAmount } from "./payment.js";

// Storno podmínky (majitel 2026-10-10). Poplatek je procento z celkové ceny pobytu podle počtu
// dní od storna do dne příjezdu:
//
//   0–14 dní   100 %
//   15–30 dní   50 %
//   31–60 dní   25 %
//   61 a víc     0 %
//
// Pásma jsou v `config.reservation.cancellationPolicy` (horní mez dní včetně → procento),
// co je nad poslední mezí, je zdarma. Jediné místo pravidla: e-maily (text podmínek, výpočet
// vratky), admin (náhled v modálu Stornovat, záznam v rezervaci) i web berou odsud.

/** Procento storno poplatku pro počet dní do příjezdu. */
export function cancellationPercent(daysToArrival, policy = config.reservation.cancellationPolicy) {
  const band = policy.find(({ maxDays }) => daysToArrival <= maxDays);
  return band ? band.percent : 0;
}

/**
 * Storno ke dni `today`: kolik dní zbývá do příjezdu, procento, poplatek z ceny a kolik
 * z už zaplaceného vrátit (nikdy záporně -- nedoplatek se po hostovi nevymáhá automaticky).
 *
 * @returns {{ date, daysToArrival, percent, fee, paid, refund }}
 */
export function computeCancellation(reservation, today) {
  // nightsBetween = rozdíl dní mezi dvěma ISO daty (přes UTC, bez posunu letního času).
  const daysToArrival = Math.max(0, nightsBetween(today, reservation.dateFrom));
  const percent = cancellationPercent(daysToArrival);
  const totalPrice = reservation.payment?.totalPrice ?? 0;
  const fee = Math.round((totalPrice * percent) / 100);
  const paid = paidAmount(reservation.payment);
  return { date: today, daysToArrival, percent, fee, paid, refund: Math.max(0, paid - fee) };
}

// Kusy věty o storno podmínkách pro každý jazyk e-mailů (server/email/templates).
const POLICY_PHRASES = {
  cs: { free: (d) => `${d} a více dní před příjezdem zdarma`, upTo: (d) => `${d} a méně dní`, range: (a, b) => `${a}–${b} dní`, fee: (pct) => `${pct} % ceny pobytu` },
  en: { free: (d) => `${d} or more days before arrival free of charge`, upTo: (d) => `${d} days or less`, range: (a, b) => `${a}–${b} days`, fee: (pct) => `${pct} % of the price of the stay` },
  de: { free: (d) => `${d} oder mehr Tage vor Anreise kostenlos`, upTo: (d) => `${d} oder weniger Tage`, range: (a, b) => `${a}–${b} Tage`, fee: (pct) => `${pct} % des Aufenthaltspreises` },
  pl: { free: (d) => `${d} lub więcej dni przed przyjazdem bezpłatnie`, upTo: (d) => `${d} lub mniej dni`, range: (a, b) => `${a}–${b} dni`, fee: (pct) => `${pct} % ceny pobytu` },
  sk: { free: (d) => `${d} a viac dní pred príchodom zadarmo`, upTo: (d) => `${d} a menej dní`, range: (a, b) => `${a}–${b} dní`, fee: (pct) => `${pct} % ceny pobytu` },
};

/** Podmínky jako věta pro e-mail ("61 a více dní před příjezdem zdarma; …"). */
export function cancellationPolicyText(policy = config.reservation.cancellationPolicy, lang = "cs") {
  const t = POLICY_PHRASES[lang] ?? POLICY_PHRASES.cs;
  const parts = [];
  const last = policy[policy.length - 1];
  parts.push(t.free(last.maxDays + 1));
  for (let i = policy.length - 1; i >= 0; i--) {
    const from = i === 0 ? 0 : policy[i - 1].maxDays + 1;
    const range = from === 0 ? t.upTo(policy[i].maxDays) : t.range(from, policy[i].maxDays);
    parts.push(`${range} ${t.fee(policy[i].percent)}`);
  }
  return parts.join("; ") + ".";
}
