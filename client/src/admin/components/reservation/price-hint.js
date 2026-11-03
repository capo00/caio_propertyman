// Price hint in the new-reservation form: the "Price" field shows as its placeholder the price the
// server would store if the field stays empty. `crud.createManual` computes it only for a guest --
// a contact and a guest count (`contact && guestCount`); a block without a guest gets no price,
// so it gets no hint either. The value comes from `price/calculate` (use-price-hint.js).

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CONTACT_FIELD_LIST = ["contactName", "contactEmail", "contactPhone"];

/**
 * `{ dateFrom, dateTo }` to ask `price/calculate` with, or `null` when the server would not compute a
 * price for this form value (or the range is not complete yet -- FormDateRange gives
 * `[from, undefined]` while picking).
 */
export function priceHintQuery(value) {
  const [dateFrom, dateTo] = Array.isArray(value?.dateRange) ? value.dateRange : [];
  if (!ISO_DATE.test(dateFrom ?? "") || !ISO_DATE.test(dateTo ?? "") || dateFrom >= dateTo) return null;
  if (!(Number(value.guestCount) > 0)) return null;
  const hasContact = CONTACT_FIELD_LIST.some((name) => typeof value[name] === "string" && value[name].trim() !== "");
  return hasContact ? { dateFrom, dateTo } : null;
}

/**
 * Price as text for a placeholder, formatted like `Price` (Uu5Elements.Number with `currency="CZK"`,
 * `currencyFormat="symbol"`, no decimals) -- a placeholder takes a string, not a component.
 */
export function formatPrice(totalPrice, language) {
  return new Intl.NumberFormat(language, { style: "currency", currency: "CZK", currencyDisplay: "symbol", maximumFractionDigits: 0 }).format(totalPrice);
}
