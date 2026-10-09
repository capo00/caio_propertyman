// Stavební kameny e-mailů. Šablona vrací seznam bloků; z nich `render.js` vyrobí textovou
// i HTML verzi, takže se nemůžou rozejít. Falsy položky (podmíněné řádky `cond && blok`)
// renderer vynechá.

/** Odstavec. */
export const p = (text) => ({ type: "p", text });

/** Dvojice popisek – hodnota (tabulka). Falsy řádky se vynechají. */
export const facts = (rows) => ({ type: "facts", rows: rows.filter(Boolean) });

/** Zpráva od vlastníka („Zpráva hostovi“ z modálu). */
export const quote = (text) => (text ? { type: "quote", text } : null);

/** Odrážkový seznam (např. změny rezervace). */
export const list = (items) => ({ type: "list", items: items.filter(Boolean) });

/** Odkaz. V textu „popisek: url“. */
export const link = (label, url) => ({ type: "link", label, url });

/**
 * Platební údaje + QR platba.
 * @param {"deposit"|"balance"|"full"} kind  co se platí (popisek a název QR přílohy)
 */
export const payment = ({ kind, amount, dueDate, variableSymbol, qrMessage }) =>
  amount > 0 ? { type: "payment", kind, amount, dueDate, variableSymbol, qrMessage } : null;

/** Podpis. */
export const signature = () => ({ type: "signature" });
