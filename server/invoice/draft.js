import { Error as AppError } from "caio-server";
import config from "../config.js";
import { formatter } from "../email/format.js";
import { paidAmount } from "../reservation/payment.js";

// Čisté funkce kolem faktury: číslo, dodavatel z configu, předvyplnění z rezervace
// (docs/proposal-invoice-pdf.md § 1–2). Bez databáze, ať jdou testovat samostatně.

const PLACEHOLDER = "DOPLNIT";
const SUPPLIER_KEYS = ["name", "address", "ico", "registry"];

/** Rok řady podle data vystavení. */
export function invoiceYear(issuedDate) {
  return issuedDate.slice(0, 4);
}

/**
 * Další číslo v roční řadě: `2026-0001`. `lastNumber` je nejvyšší už použité číslo toho roku
 * (i stornované faktury -- řada nesmí mít díry ani se opakovat).
 */
export function nextInvoiceNumber(year, lastNumber) {
  const seq = lastNumber ? Number(lastNumber.slice(year.length + 1)) + 1 : 1;
  return `${year}-${String(seq).padStart(4, "0")}`;
}

/** Které údaje dodavatele v configu chybí. */
export function missingSupplierFields(supplier = config.invoice.supplier) {
  return SUPPLIER_KEYS.filter((key) => !supplier?.[key]);
}

/**
 * Bez údajů dodavatele faktura nevznikne -- v produkci. Ve vývoji se místo nich vytiskne
 * „DOPLNIT“, ať jde admin dělat dřív, než majitel údaje dodá (stejně jako neschválený ceník).
 */
export function assertSupplierConfigured() {
  const missing = missingSupplierFields();
  if (missing.length && process.env.NODE_ENV === "production") {
    throw new AppError.Failed(`Chybí údaje dodavatele pro fakturu (${missing.join(", ")}) v server/config.js.`, {
      status: 503,
      code: "caio-propertyman/invoice/supplierNotConfigured",
    });
  }
}

/** Snímek dodavatele, který se uloží do faktury -- pozdější změna configu ho nepřepíše. */
export function supplierSnapshot() {
  const supplier = config.invoice.supplier ?? {};
  return {
    ...Object.fromEntries(SUPPLIER_KEYS.map((key) => [key, supplier[key] || PLACEHOLDER])),
    account: config.bankAccount.number,
  };
}

function persons(count) {
  return `${count} ${count === 1 ? "osoba" : count >= 2 && count <= 4 ? "osoby" : "osob"}`;
}

/** Datum poslední platby (záloha nebo doplatek), nebo null. */
function lastPaidDate(payment) {
  const dateList = [payment?.deposit?.paidDate, payment?.balance?.paidDate].filter(Boolean).sort();
  return dateList.at(-1) ?? null;
}

/** Nejbližší nezaplacená splatnost: záloha, pak doplatek. */
function nextDueDate(payment) {
  if (payment?.deposit && !payment.deposit.paidDate) return payment.deposit.dueDate ?? null;
  if (payment?.balance && !payment.balance.paidDate) return payment.balance.dueDate ?? null;
  return null;
}

/**
 * Předvyplněný formulář faktury z rezervace. Všechno kromě dodavatele vlastník v modálu
 * ještě upraví, takže tady jde jen o rozumný výchozí stav.
 */
export function buildDraft(reservation, { today }) {
  const f = formatter("cs");
  const payment = reservation.payment;
  const total = payment?.totalPrice ?? 0;
  const paid = Math.min(paidAmount(payment), total);
  return {
    reservationId: reservation.id,
    supplier: supplierSnapshot(),
    supplierMissingList: missingSupplierFields(),
    variableSymbol: payment?.variableSymbol ?? null,
    customerName: reservation.contact?.name ?? null,
    customerAddress: null,
    customerIco: null,
    customerDic: null,
    lineList: [{ text: `Ubytování ${f.stay(reservation)}, ${persons(reservation.guestCount)}`, amount: total }],
    issuedDate: today,
    paidAmount: paid,
    paidDate: paid > 0 ? lastPaidDate(payment) : null,
    dueDate: paid < total ? nextDueDate(payment) : null,
  };
}

/** Jméno souboru ke stažení. */
export function invoiceFilename(number) {
  return `faktura-${number}.pdf`;
}
