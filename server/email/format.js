// Formatting of values in emails per language. All web languages are prepared here, so
// adding a template translation never has to touch this file.

import { nightsBetween } from "../services/dates.js";

const LOCALE = { cs: "cs-CZ", en: "en-GB", de: "de-DE", pl: "pl-PL", sk: "sk-SK" };

// Number of nights: Czech and Slovak have three forms (1 / 2–4 / 5+), Polish too, but "noce"
// also for 22–24 etc. (12–14 are "nocy"); English and German have two.
const NIGHTS = {
  cs: (n) => (n === 1 ? "noc" : n >= 2 && n <= 4 ? "noci" : "nocí"),
  sk: (n) => (n === 1 ? "noc" : n >= 2 && n <= 4 ? "noci" : "nocí"),
  en: (n) => (n === 1 ? "night" : "nights"),
  de: (n) => (n === 1 ? "Nacht" : "Nächte"),
  pl: (n) => (n === 1 ? "noc" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "noce" : "nocy"),
};

// Number of days ("… days before arrival"): Czech and Slovak three forms, Polish has "dni" for
// every plural, English and German two. 0 takes the plural ("0 dní", "0 days").
const DAYS = {
  cs: (n) => (n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní"),
  sk: (n) => (n === 1 ? "deň" : n >= 2 && n <= 4 ? "dni" : "dní"),
  en: (n) => (n === 1 ? "day" : "days"),
  de: (n) => (n === 1 ? "Tag" : "Tage"),
  pl: (n) => (n === 1 ? "dzień" : "dni"),
};

/** Formatter for one language. A date is an ISO string without time, so it is formatted in UTC. */
export function formatter(lang = "cs") {
  const locale = LOCALE[lang] ?? LOCALE.cs;
  const dateFormat = new Intl.DateTimeFormat(locale, lang === "en" ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });
  const priceFormat = new Intl.NumberFormat(locale, { style: "currency", currency: "CZK", maximumFractionDigits: 0 });

  const f = {
    lang,
    date: (iso) => (iso ? dateFormat.format(new Date(`${iso}T00:00:00Z`)) : ""),
    price: (value) => (value == null ? "" : priceFormat.format(value)),
    nights: (n) => `${n} ${(NIGHTS[lang] ?? NIGHTS.cs)(n)}`,
    days: (n) => `${n} ${(DAYS[lang] ?? DAYS.cs)(n)}`,
    /** "7. 11. 2026 – 9. 11. 2026 (2 noci)" */
    stay: (r) => `${f.date(r.dateFrom)} – ${f.date(r.dateTo)} (${f.nights(nightsBetween(r.dateFrom, r.dateTo))})`,
  };
  return f;
}
