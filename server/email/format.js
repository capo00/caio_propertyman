// Formátování hodnot v e-mailech podle jazyka. Jazyky webu jsou připravené všechny, i když
// šablony jsou zatím jen česky -- přidání překladu pak nesahá sem.

import { nightsBetween } from "../services/dates.js";

const LOCALE = { cs: "cs-CZ", en: "en-GB", de: "de-DE", pl: "pl-PL", sk: "sk-SK" };

// Počet nocí: čeština a slovenština mají tři tvary (1 / 2–4 / 5+), polština taky, ale „noce“
// i pro 22–24 atd. (12–14 jsou „nocy“); angličtina a němčina dva.
const NIGHTS = {
  cs: (n) => (n === 1 ? "noc" : n >= 2 && n <= 4 ? "noci" : "nocí"),
  sk: (n) => (n === 1 ? "noc" : n >= 2 && n <= 4 ? "noci" : "nocí"),
  en: (n) => (n === 1 ? "night" : "nights"),
  de: (n) => (n === 1 ? "Nacht" : "Nächte"),
  pl: (n) => (n === 1 ? "noc" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "noce" : "nocy"),
};

/** Formátovač pro jeden jazyk. Datum je ISO řetězec bez času, takže se formátuje v UTC. */
export function formatter(lang = "cs") {
  const locale = LOCALE[lang] ?? LOCALE.cs;
  const dateFormat = new Intl.DateTimeFormat(locale, lang === "en" ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
  const priceFormat = new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

  const f = {
    lang,
    date: (iso) => (iso ? dateFormat.format(new Date(`${iso}T00:00:00Z`)) : ""),
    price: (value) => (value == null ? "" : priceFormat.format(value)),
    nights: (n) => `${n} ${(NIGHTS[lang] ?? NIGHTS.cs)(n)}`,
    /** „7. 11. 2026 – 9. 11. 2026 (2 noci)“ */
    stay: (r) => `${f.date(r.dateFrom)} – ${f.date(r.dateTo)} (${f.nights(nightsBetween(r.dateFrom, r.dateTo))})`,
  };
  return f;
}
