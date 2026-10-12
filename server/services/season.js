import config from "../config.js";

// Letní sezóna (config.summerWeekOnly): v ní se pronajímá jen na týden (stay-rules.js)
// a za svátky se nepřiráží (price.js). Noc patří dni, NA který připadá.

/** Je den ("YYYY-MM-DD") v letní sezóně? */
export function isSummerDay(day) {
  const { from, to } = config.summerWeekOnly;
  const monthDay = day.slice(5);
  return monthDay >= from && monthDay <= to;
}

/** Je pobyt letní? Stačí jedna noc v sezóně -- i týden přes 1. 7. nebo přes konec srpna. */
export function isSummerStay(days) {
  return days.some(isSummerDay);
}
