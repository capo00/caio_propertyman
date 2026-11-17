// Price hint in the new-reservation form: the "Price" field shows as its placeholder the price list
// price for the chosen dates, as soon as the dates are complete -- like the price on the public web,
// which needs nothing but the dates (no guest count, no name; the price does not depend on them).
// A block (`reason` maintenance / owner) has no price, so it gets no hint. The value comes from
// `price/calculate` (use-price-hint.js).
//
// Note: `crud.createManual` stores a price only for a guest (contact + guest count). The hint is
// the price list price; it is what gets stored once the record is a guest reservation.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const BLOCK_REASON_LIST = ["maintenance", "owner"];

/**
 * `{ dateFrom, dateTo }` to ask `price/calculate` with, or `null` when there is nothing to show
 * (the range is not complete yet -- FormDateRange gives `[from, undefined]` while picking -- or
 * the record is a block).
 */
export function priceHintQuery(value) {
  const [dateFrom, dateTo] = Array.isArray(value?.dateRange) ? value.dateRange : [];
  if (!ISO_DATE.test(dateFrom ?? "") || !ISO_DATE.test(dateTo ?? "") || dateFrom >= dateTo) return null;
  if (BLOCK_REASON_LIST.includes(value.reason)) return null;
  return { dateFrom, dateTo };
}

/**
 * Price as text for a placeholder, formatted like `Price` (Uu5Elements.Number with `currency="CZK"`,
 * `currencyFormat="symbol"`, no decimals) -- a placeholder takes a string, not a component.
 */
export function formatPrice(totalPrice, language) {
  return new Intl.NumberFormat(language, { style: "currency", currency: "CZK", currencyDisplay: "symbol", maximumFractionDigits: 0 }).format(totalPrice);
}
