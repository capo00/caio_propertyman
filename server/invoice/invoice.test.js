import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDraft, nextInvoiceNumber, invoiceYear } from "./draft.js";
import { renderInvoicePdf } from "./pdf.js";

const reservation = {
  id: "6710c0ffee00000000000001",
  dateFrom: "2026-11-07",
  dateTo: "2026-11-09",
  guestCount: 4,
  contact: { name: "Jan Novák", email: "jan@seznam.cz", phone: "+420 777 123 456" },
  payment: {
    totalPrice: 9000,
    variableSymbol: "26110701",
    deposit: { amount: 4500, dueDate: "2026-10-11", paidDate: "2026-10-10" },
    balance: { dueDate: "2026-10-24", paidDate: null },
  },
};

const invoice = {
  number: "2026-0001",
  variableSymbol: "26110701",
  issuedDate: "2026-10-24",
  paidAmount: 9000,
  paidDate: "2026-10-20",
  dueDate: null,
  supplier: { name: "Lenka Čápková", address: "Libošovice 6\n507 44 Libošovice", ico: "12345678", registry: "Zapsána v živnostenském rejstříku.", account: "6338724003/0800" },
  customer: { name: "Firma s.r.o.", address: "Dlouhá 1, Praha", ico: "87654321", dic: "CZ87654321" },
  lineList: [{ text: "Ubytování 7. 11. 2026 – 9. 11. 2026 (2 noci), 4 osoby", amount: 9000 }],
  total: 9000,
};

test("invoice number: yearly series with four digits", () => {
  assert.equal(nextInvoiceNumber("2026", null), "2026-0001");
  assert.equal(nextInvoiceNumber("2026", "2026-0009"), "2026-0010");
  assert.equal(invoiceYear("2027-01-02"), "2027");
});

test("draft: partially paid reservation carries paid amount, last payment and the balance due date", () => {
  const draft = buildDraft(reservation, { today: "2026-10-12" });
  assert.equal(draft.customerName, "Jan Novák");
  assert.equal(draft.issuedDate, "2026-10-12");
  assert.equal(draft.paidAmount, 4500);
  assert.equal(draft.paidDate, "2026-10-10");
  assert.equal(draft.dueDate, "2026-10-24");
  assert.deepEqual(draft.lineList, [{ text: "Ubytování 7. 11. 2026 – 9. 11. 2026 (2 noci), 4 osoby", amount: 9000 }]);
  assert.equal(draft.variableSymbol, "26110701");
});

test("draft: fully paid reservation has no due date", () => {
  const paid = { ...reservation, payment: { ...reservation.payment, balance: { dueDate: "2026-10-24", paidDate: "2026-10-20" } } };
  const draft = buildDraft(paid, { today: "2026-10-24" });
  assert.equal(draft.paidAmount, 9000);
  assert.equal(draft.paidDate, "2026-10-20");
  assert.equal(draft.dueDate, null);
});

test("draft: unpaid reservation without a price starts at zero", () => {
  const draft = buildDraft({ ...reservation, guestCount: 1, payment: null }, { today: "2026-10-12" });
  assert.equal(draft.paidAmount, 0);
  assert.equal(draft.lineList[0].amount, 0);
  assert.match(draft.lineList[0].text, /, 1 osoba$/);
});

test("pdf renders a PDF document", async () => {
  const pdf = await renderInvoicePdf(invoice);
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 1000);
});

test("pdf renders partially paid and unpaid invoices", async () => {
  await renderInvoicePdf({ ...invoice, paidAmount: 4500, dueDate: "2026-10-24" });
  await renderInvoicePdf({ ...invoice, paidAmount: 0, paidDate: null, dueDate: "2026-10-24", customer: { name: "Jan Novák", address: null, ico: null, dic: null } });
});
