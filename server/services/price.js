import { Error as AppError } from "caio-server";
import config from "../config.js";
import { addDays, nightsBetween } from "./dates.js";
import { isHoliday, isWeekend } from "./holidays.js";
import { isSummerStay } from "./season.js";

// The price is ALWAYS calculated on the server -- a value from the client is ignored. The same
// function is used by price/calculate and reservation/create, so they cannot diverge (design-v1.md § 6).
//
// Rules and numbers are in config.pricing (the formula is there too). The guest only gets the
// final price for the stay; the breakdown into nights and cleaning is deliberately not returned.

const CODE = "caio-propertyman/price";

/**
 * Unapproved pricing must not reach the guest in production. In development it is calculated
 * anyway, so the frontend can be built -- see the box in config.js.
 *
 * Called as the very first step of every use case that touches prices -- before queries to
 * the DB. Otherwise the response would differ depending on whether Mongo happens to be available.
 */
export function assertPricingApproved() {
  if (!config.pricing.approved && process.env.NODE_ENV === "production") {
    throw new AppError.Failed("Pricing is not approved yet, the price cannot be calculated.", {
      status: 503,
      code: `${CODE}/notApproved`,
    });
  }
}

/** Base of the i-th night of the stay (from 0): first nights at `firstNights.price`, the rest at `nextNight`. */
function basePrice(index) {
  const { firstNights, nextNight } = config.pricing;
  return index < firstNights.count ? firstNights.price : nextNight;
}

/**
 * Final price from the percentage multiplier of each night. Everything in integers: the sum is
 * in hellers at 100 % (CZK × percent), divided only when rounding.
 */
function totalFromPercents(percents) {
  const { cleaning, roundTo } = config.pricing;
  const subtotal = percents.reduce((sum, percent, index) => sum + basePrice(index) * percent, 0);
  return Math.ceil((subtotal + cleaning * 100) / (roundTo * 100)) * roundTo;
}

/** Days ONTO which the stay's nights fall: the night from D-1 to D belongs to day D (departure is in the morning). */
export function nightDays(dateFrom, nights) {
  return Array.from({ length: nights }, (_, i) => addDays(dateFrom, i + 1));
}

/** Does the stay contain nights onto all days from the "MM-DD" list? The stay may span New Year. */
function containsNightsOnto(days, monthDays) {
  const onto = days.map((day) => day.slice(5));
  return monthDays.every((monthDay) => onto.includes(monthDay));
}

/** Kind of stay: Christmas takes precedence even over New Year's Eve (one set of guests, no cleaning in between). */
export function stayKind(days) {
  const { christmas, silvester } = config.pricing;
  if (containsNightsOnto(days, christmas.nightsOnto)) return "christmas";
  if (containsNightsOnto(days, silvester.nightsOnto)) return "silvester";
  return "standard";
}

/**
 * @param {string} dateFrom  ISO arrival date
 * @param {string} dateTo    ISO departure date (exclusive)
 * @returns {{ nights, kind, totalPrice, provisional }}
 *   `kind` is "standard" | "christmas" | "silvester" -- for the admin and tests, not shown to the guest.
 */
export function calculatePrice(dateFrom, dateTo) {
  assertPricingApproved();

  const { surchargePercent, weekendSurchargeMaxNights } = config.pricing;
  const nights = nightsBetween(dateFrom, dateTo);
  const days = nightDays(dateFrom, nights);
  const kind = stayKind(days);

  // Date restrictions (Christmas at least 3 nights, summer only by the week) are guarded by
  // stay-rules.js for the public reservation. Here the price of anything is calculated -- even of
  // dates the owner enters by hand.

  // A longer stay has the weekend at the regular price. A holiday has a surcharge -- except in the
  // summer season, where all weeks should cost the same (5 and 6 July would otherwise make the July
  // weeks more expensive).
  const weekendSurcharged = nights <= weekendSurchargeMaxNights;
  const holidaySurcharged = !isSummerStay(days);
  const isSurcharged = (day) => (holidaySurcharged && isHoliday(day)) || (weekendSurcharged && isWeekend(day));

  const percents =
    kind === "standard"
      ? days.map((day) => (isSurcharged(day) ? surchargePercent.holiday : 100))
      : days.map(() => surchargePercent[kind]);

  return {
    nights,
    kind,
    totalPrice: totalFromPercents(percents),
    // While pricing is not approved, let it show in the response too -- the frontend can then
    // mark the price as indicative.
    provisional: !config.pricing.approved,
  };
}

/**
 * Prices for the Pricing page: weekend and week, nothing more (owner, 2026-10-12). Calculated with
 * the same function as the reservation, so the web and the confirmation cannot diverge. A holiday
 * in the dates raises the price -- the form shows the exact amount for specific days.
 */
export function listPrices() {
  assertPricingApproved();

  const { surchargePercent } = config.pricing;
  const row = (nights, percent) => ({ nights, totalPrice: totalFromPercents(Array(nights).fill(percent)) });

  return {
    // Fri–Sun: both nights are weekend nights
    weekend: row(config.minNights, surchargePercent.holiday),
    // 7 nights have the weekend at the regular price (weekendSurchargeMaxNights)
    week: row(7, 100),
    provisional: !config.pricing.approved,
  };
}
