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

// Faktura na žádost zákazníka (docs/proposal-invoice-pdf.md). Vlastník ji vygeneruje v adminu,
// stáhne PDF a pošle sám -- appka nic neposílá.

const CODE = "caio-propertyman/invoice";
const MAX_NUMBER_ATTEMPTS = 5;

function failed(code, message, status) {
  return new AppError.Failed(message, { status, code: `${CODE}/${code}` });
}

/** Faktura bez PDF -- tak chodí do adminu. */
function toDto(item) {
  if (!item) return item;
  const { pdf, ...rest } = item;
  return rest;
}

/** Binary z Monga (nebo Buffer rovnou po zápisu) → base64. */
function pdfBase64(pdf) {
  const bytes = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf.buffer ?? pdf);
  return bytes.toString("base64");
}

/** Záznam podle id; neplatné id je „neexistuje“, ne 500 z převodu na ObjectId. */
function getById(targetDao, id) {
  return ObjectId.isValid(id) ? targetDao.get(id) : null;
}

async function loadGuestReservation(reservationId) {
  const reservation = await getById(reservationDao, reservationId);
  if (!reservation) throw failed("reservationNotFound", "Rezervace neexistuje.", 404);
  if (!isGuestReservation(reservation)) {
    throw failed("notGuestReservation", "Fakturu jde vystavit jen k rezervaci s hostem, ne k importu ani blokaci.", 400);
  }
  return reservation;
}

export default {
  /** Předvyplněný formulář: dodavatel z configu, zákazník, položka a platby z rezervace. */
  async draft(reservationId) {
    const reservation = await loadGuestReservation(reservationId);
    return buildDraft(reservation, { today: todayIn(config.reservation.timeZone) });
  },

  listByReservation(reservationId) {
    return dao.listByReservation(reservationId).then((itemList) => ({ itemList: itemList.map(toDto) }));
  },

  /**
   * Vystaví fakturu: přidělí číslo, vyrenderuje PDF, uloží snímek i PDF a vrátí ho ke stažení.
   *
   * Číslo = nejvyšší v roce + 1. Řadu drží unikátní index na `number`: kdyby dva vystavovali
   * naráz, druhý narazí na E11000 a zkusí další číslo. Díra v řadě nevznikne, protože se nic
   * nezapisuje, dokud není PDF hotové (proto ne čítač, který by se zvedl i při chybě renderu).
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
    throw failed("numberConflict", "Číslo faktury se nepodařilo přidělit, zkuste to prosím znovu.", 409);
  },

  /** Uložené PDF -- přesně to, které dostal zákazník. Nic se negeneruje znovu. */
  async download(id) {
    const item = await getById(dao, id);
    if (!item) throw failed("notFound", "Faktura neexistuje.", 404);
    return { filename: invoiceFilename(item.number), pdfBase64: pdfBase64(item.pdf) };
  },

  async cancel(id, identity) {
    const done = ObjectId.isValid(id) && (await dao.markCancelled(id, actorOf(identity)));
    if (!done) throw failed("notCancellable", "Faktura neexistuje, nebo už je stornovaná.", 409);
    return toDto(await dao.get(id));
  },
};
