import { Error as AppError } from "caio-server";
import config from "../config.js";
import { formatter } from "../email/format.js";
import { paidAmount } from "../reservation/payment.js";

// Pure functions around the invoice: number, supplier from the config, prefill from the reservation
// (docs/proposal-invoice-pdf.md § 1–2). Without the database, so they can be tested on their own.

const PLACEHOLDER = "DOPLNIT";
const SUPPLIER_KEYS = ["name", "address", "ico", "registry"];

/** Year of the series by the issue date. */
export function invoiceYear(issuedDate) {
  return issuedDate.slice(0, 4);
}

/**
 * Next number in the yearly series: `2026-0001`. `lastNumber` is the highest number already used
 * that year (including cancelled invoices -- the series must have no gaps and no repeats).
 */
export function nextInvoiceNumber(year, lastNumber) {
  const seq = lastNumber ? Number(lastNumber.slice(year.length + 1)) + 1 : 1;
  return `${year}-${String(seq).padStart(4, "0")}`;
}

/** Which supplier details are missing in the config. */
export function missingSupplierFields(supplier = config.invoice.supplier) {
  return SUPPLIER_KEYS.filter((key) => !supplier?.[key]);
}

/**
 * Without supplier details no invoice is created -- in production. In development "DOPLNIT" is
 * printed instead, so the admin can be built before the owner supplies the details (same as
 * unapproved pricing).
 */
export function assertSupplierConfigured() {
  const missing = missingSupplierFields();
  if (missing.length && process.env.NODE_ENV === "production") {
    throw new AppError.Failed(`Invoice supplier details are missing in server/config.js (${missing.join(", ")}).`, {
      status: 503,
      code: "caio-propertyman/invoice/supplierNotConfigured",
    });
  }
}

/** Supplier snapshot stored in the invoice -- a later config change does not overwrite it. */
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

/** Date of the last payment (deposit or balance), or null. */
function lastPaidDate(payment) {
  const dateList = [payment?.deposit?.paidDate, payment?.balance?.paidDate].filter(Boolean).sort();
  return dateList.at(-1) ?? null;
}

/** The nearest unpaid due date: deposit, then balance. */
function nextDueDate(payment) {
  if (payment?.deposit && !payment.deposit.paidDate) return payment.deposit.dueDate ?? null;
  if (payment?.balance && !payment.balance.paidDate) return payment.balance.dueDate ?? null;
  return null;
}

/**
 * Prefilled invoice form from the reservation. The owner still edits everything except the supplier
 * in the modal, so this is only about a sensible default.
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

/** File name for the download. */
export function invoiceFilename(number) {
  return `faktura-${number}.pdf`;
}
