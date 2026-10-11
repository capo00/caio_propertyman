import config from "../config.js";
import { addDays, toUtcDate } from "./dates.js";

// Svátky pro ceník: pevné dny z config.pricing.holidays ("MM-DD") a k nim Velký pátek
// a Velikonoční pondělí, které se každý rok posouvají.

/** Velikonoční neděle (gregoriánský kalendář, anonymní algoritmus Meeus/Jones/Butcher). */
export function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Je ISO datum svátek? */
export function isHoliday(iso) {
  if (config.pricing.holidays.includes(iso.slice(5))) return true;
  if (!config.pricing.easterHolidays) return false;

  const sunday = easterSunday(Number(iso.slice(0, 4)));
  return iso === addDays(sunday, -2) || iso === addDays(sunday, 1);
}

/** Sobota nebo neděle. Přes UTC, ať den v týdnu nezávisí na časové zóně serveru. */
export function isWeekend(iso) {
  const day = toUtcDate(iso).getUTCDay();
  return day === 0 || day === 6;
}
