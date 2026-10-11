import crud from "./crud.js";
import { isIsoDate } from "../services/dates.js";
import { createValidator, readId } from "../services/dto.js";

const CODE = "caio-propertyman/invoice";
const ADMIN = ["authorities"];
const MAX_LINES = 10;
const MAX_AMOUNT = 10_000_000;

// Validace je ve `fn`, ne v poli `validator` -- důvod v server/services/dto.js.
//
// Odběratel přichází plochý (`customerName`, …) a položky jako `lineList`; klíče chyb
// (`customerIco`, `line0Amount`, …) jsou jména inputů v modálu, ať uu5g05-forms ukáže chybu
// přímo u pole (client/src/admin/components/invoice/invoice-modal.jsx).

function readDate(v, dtoIn, key, { required = false } = {}) {
  const value = dtoIn?.[key];
  if (value == null || value === "") {
    // Prázdný povinný řetězec = „chybí“ (missingKeyMap), ne „vadný“.
    v.string(null, key, { required });
    return null;
  }
  v.check(isIsoDate(value), key);
  return isIsoDate(value) ? value : null;
}

function readCustomer(v, dtoIn) {
  const ico = v.string(dtoIn?.customerIco, "customerIco", { maxLength: 8 });
  if (ico) v.check(/^\d{8}$/.test(ico), "customerIco");
  const dic = v.string(dtoIn?.customerDic, "customerDic", { maxLength: 20 })?.replace(/\s+/g, "").toUpperCase() ?? null;
  if (dic) v.check(/^[A-Z]{2}[0-9A-Z]{2,15}$/.test(dic), "customerDic");
  return {
    name: v.string(dtoIn?.customerName, "customerName", { required: true, maxLength: 200 }),
    address: v.string(dtoIn?.customerAddress, "customerAddress", { maxLength: 500 }),
    ico,
    dic,
  };
}

function readLineList(v, dtoIn) {
  const raw = Array.isArray(dtoIn?.lineList) ? dtoIn.lineList.slice(0, MAX_LINES) : [];
  v.check(raw.length > 0, "line0Text");
  return raw.map((line, i) => ({
    text: v.string(line?.text, `line${i}Text`, { required: true, maxLength: 200 }),
    amount: v.int(line?.amount, `line${i}Amount`, { required: true, min: -MAX_AMOUNT, max: MAX_AMOUNT }),
  }));
}

export default {
  /** Předvyplněný formulář k rezervaci. */
  "invoice/draft": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.draft(readId({ id: dtoIn?.reservationId }, CODE)),
  },

  "invoice/list": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.listByReservation(readId({ id: dtoIn?.reservationId }, CODE)),
  },

  /**
   * Vystaví fakturu a vrátí ji i s PDF (`pdfBase64`). PDF jde v JSONu, ne jako binární odpověď:
   * má desítky kB a klient z něj udělá stažení sám.
   *
   * `paidAmount` < celkem → musí být splatnost; `paidAmount` > 0 → musí být datum úhrady.
   */
  "invoice/create": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn, identity }) => {
      const reservationId = readId({ id: dtoIn?.reservationId }, CODE);
      const v = createValidator(CODE);
      const customer = readCustomer(v, dtoIn);
      const lineList = readLineList(v, dtoIn);
      const issuedDate = readDate(v, dtoIn, "issuedDate", { required: true });
      const total = lineList.reduce((sum, line) => sum + (line.amount ?? 0), 0);
      if (lineList.every((line) => line.amount != null)) v.check(total > 0, "line0Amount");
      // Vadná částka (víc než celkem) = null; povinnost data se pak nevyhodnocuje, ať se chyba
      // ukáže u částky, ne jako chybějící splatnost.
      const paidAmount = v.int(dtoIn?.paidAmount ?? 0, "paidAmount", { min: 0, max: Math.max(total, 0) });
      const paidDate = readDate(v, dtoIn, "paidDate", { required: paidAmount > 0 });
      const dueDate = readDate(v, dtoIn, "dueDate", { required: paidAmount != null && paidAmount < total });
      v.assert();
      return crud.create({ reservationId, customer, lineList, issuedDate, paidAmount, paidDate: paidAmount > 0 ? paidDate : null, dueDate: paidAmount < total ? dueDate : null, identity });
    },
  },

  /** Uložené PDF vystavené faktury. */
  "invoice/download": {
    method: "get",
    auth: ADMIN,
    fn: async ({ dtoIn }) => crud.download(readId(dtoIn, CODE)),
  },

  /** Označí fakturu jako stornovanou. Nemaže -- číslo v řadě zůstane obsazené. */
  "invoice/cancel": {
    method: "post",
    auth: ADMIN,
    fn: async ({ dtoIn, identity }) => crud.cancel(readId(dtoIn, CODE), identity),
  },
};
