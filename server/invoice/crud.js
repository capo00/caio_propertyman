import { Error as AppError } from "caio-server";
import { ObjectId } from "mongodb";
import config from "../config.js";
import dao from "./dao.js";
import reservationDao from "../reservation/dao.js";
import { isGuestReservation } from "../reservation/states.js";
import { actorOf } from "../reservation/history.js";
import { todayIn } from "../services/dates.js";
import { assertSupplierConfigured, buildDraft, invoiceFilename, invoiceYear, nextInvoiceNumber, supplierSnapshot } from "./draft.js";
import { renderInvoicePdf } from "./pdf.js";

// Invoice on the customer's request (docs/proposal-invoice-pdf.md). The owner generates it in the admin,
// downloads the PDF and sends it themselves -- the app sends nothing.

const CODE = "caio-propertyman/invoice";
const MAX_NUMBER_ATTEMPTS = 5;

function failed(code, message, status) {
  return new AppError.Failed(message, { status, code: `${CODE}/${code}` });
}

/** Invoice without the PDF -- that is how it goes to the admin. */
function toDto(item) {
  if (!item) return item;
  const { pdf, ...rest } = item;
  return rest;
}

/** Binary from Mongo (or a Buffer right after the write) → base64. */
function pdfBase64(pdf) {
  const bytes = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf.buffer ?? pdf);
  return bytes.toString("base64");
}

/** Record by id; an invalid id means "does not exist", not a 500 from the ObjectId conversion. */
function getById(targetDao, id) {
  return ObjectId.isValid(id) ? targetDao.get(id) : null;
}

async function loadGuestReservation(reservationId) {
  const reservation = await getById(reservationDao, reservationId);
  if (!reservation) throw failed("reservationNotFound", "The reservation does not exist.", 404);
  if (!isGuestReservation(reservation)) {
    throw failed("notGuestReservation", "An invoice can only be issued for a reservation with a guest, not for an import or a date block.", 400);
  }
  return reservation;
}

export default {
  /** Prefilled form: supplier from the config, customer, line item and payments from the reservation. */
  async draft(reservationId) {
    const reservation = await loadGuestReservation(reservationId);
    return buildDraft(reservation, { today: todayIn(config.reservation.timeZone) });
  },

  listByReservation(reservationId) {
    return dao.listByReservation(reservationId).then((itemList) => ({ itemList: itemList.map(toDto) }));
  },

  /**
   * Issues an invoice: assigns a number, renders the PDF, stores the snapshot and the PDF and returns
   * it for download.
   *
   * Number = highest in the year + 1. A unique index on `number` keeps the series: if two people issued
   * at once, the second hits E11000 and tries the next number. No gap appears in the series, because
   * nothing is written until the PDF is done (hence no counter, which would go up even on a render error).
   */
  async create({ reservationId, customer, lineList, issuedDate, paidAmount, paidDate, dueDate, identity }) {
    assertSupplierConfigured();
    const reservation = await loadGuestReservation(reservationId);
    const year = invoiceYear(issuedDate);
    const base = {
      reservationId,
      variableSymbol: reservation.payment?.variableSymbol ?? null,
      issuedDate,
      paidAmount,
      paidDate,
      dueDate,
      supplier: supplierSnapshot(),
      customer,
      lineList,
      total: lineList.reduce((sum, line) => sum + line.amount, 0),
      cancelled: false,
      createdBy: actorOf(identity),
    };

    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt++) {
      const number = nextInvoiceNumber(year, await dao.findLastNumber(year));
      const invoice = { ...base, number };
      const pdf = await renderInvoicePdf(invoice);
      try {
        const created = await dao.create({ ...invoice, pdf });
        return { invoice: toDto(created), filename: invoiceFilename(number), pdfBase64: pdf.toString("base64") };
      } catch (e) {
        if (e?.code !== 11000) throw e;
      }
    }
    throw failed("numberConflict", "Failed to assign an invoice number, try again.", 409);
  },

  /** The stored PDF -- exactly the one the customer got. Nothing is generated again. */
  async download(id) {
    const item = await getById(dao, id);
    if (!item) throw failed("notFound", "The invoice does not exist.", 404);
    return { filename: invoiceFilename(item.number), pdfBase64: pdfBase64(item.pdf) };
  },

  async cancel(id, identity) {
    const done = ObjectId.isValid(id) && (await dao.markCancelled(id, actorOf(identity)));
    if (!done) throw failed("notCancellable", "The invoice does not exist or is already cancelled.", 409);
    return toDto(await dao.get(id));
  },
};
