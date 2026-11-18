// Stavební kameny e-mailů. Šablona vrací seznam bloků; z nich `render.js` vyrobí textovou
// i HTML verzi, takže se nemůžou rozejít. Falsy položky (podmíněné řádky `cond && blok`)
// renderer vynechá.

/** Odstavec. */
export const p = (text) => ({ type: "p", text });

/**
 * Dvojice popisek – hodnota (tabulka). Falsy řádky se vynechají. Hodnota může být odkaz
 * `{ text, url }` (např. adresa na mapu).
 */
export const facts = (rows) => ({ type: "facts", rows: rows.filter(Boolean) });

/** Zpráva od vlastníka („Zpráva hostovi“ z modálu). */
export const quote = (text) => (text ? { type: "quote", text } : null);

/** Nadpis oddílu (např. „🚗 Parkování“ v e-mailu k příjezdu). */
export const heading = (text) => ({ type: "heading", text });

/** Odrážkový seznam (např. změny rezervace). */
export const list = (items) => ({ type: "list", items: items.filter(Boolean) });

/** Číslovaný seznam (postup krok za krokem). */
export const steps = (items) => ({ type: "list", ordered: true, items: items.filter(Boolean) });

/**
 * Wi-Fi: název sítě, heslo a QR kód pro připojení. Bez názvu sítě nic (`null`).
 * @param {{ name, password, labels: { network, password, caption, file } }} wifi  labels = popisky v jazyce e-mailu
 */
export const wifi = ({ name, password, labels }) => (name ? { type: "wifi", name, password, labels } : null);

/** Výrazně zvýrazněná hodnota v rámečku (kód ke schránce na klíče). */
export const highlight = (label, value) => ({ type: "highlight", label, value });

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
