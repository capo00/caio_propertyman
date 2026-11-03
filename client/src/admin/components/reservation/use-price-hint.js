import { useEffect, useLanguage, useState } from "uu5g05";
import { calculatePrice } from "../../calls.js";
import { priceHintQuery, formatPrice } from "./price-hint.js";

// Wait until the owner stops changing the form before asking the server.
const DEBOUNCE_MS = 300;

/**
 * Placeholder text for the "Price" field of the new-reservation form (price-hint.js), or
 * `undefined`. `value` is the current form value; `null` (edit form) = no hint.
 *
 * Only the answer for the current dates is shown: a late answer for dates the owner has already
 * changed is ignored. A failed calculation (pricing not approved, dates outside the stay rules)
 * means no hint -- it is only a hint, the server validates on save.
 */
export function usePriceHint(value) {
  const query = priceHintQuery(value);
  const key = query ? `${query.dateFrom}/${query.dateTo}` : null;
  const [language] = useLanguage();
  const [result, setResult] = useState(null); // { key, totalPrice }

  useEffect(() => {
    if (!key) return undefined;
    const [dateFrom, dateTo] = key.split("/");
    let cancelled = false;
    const timer = setTimeout(() => {
      calculatePrice(dateFrom, dateTo)
        .then((dtoOut) => !cancelled && setResult({ key, totalPrice: dtoOut?.totalPrice ?? null }))
        .catch(() => !cancelled && setResult({ key, totalPrice: null }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);

  return key && result?.key === key && result.totalPrice != null ? formatPrice(result.totalPrice, language) : undefined;
}
