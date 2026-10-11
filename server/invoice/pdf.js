import path from "path";
import { createRequire } from "module";
import config from "../config.js";
import { formatter } from "../email/format.js";

// PDF faktury (docs/proposal-invoice-pdf.md § 4). pdfmake na serveru, písmo Roboto, které
// pdfmake přibaluje -- má českou diakritiku, standardní PDF písma ji nemají.
//
// Majitel není plátce DPH: žádné sazby ani rekapitulace, jen „Nejsem plátce DPH“.

const require = createRequire(import.meta.url);
const pdfmake = require("pdfmake");
const fonts = require("pdfmake/fonts/Roboto.js");

// path.resolve normalizuje oddělovače: pdfmake skládá cestu s "/" i na Windows.
const FONT_DIR = path.resolve(path.dirname(fonts.Roboto.normal)) + path.sep;

pdfmake.setFonts(fonts);
// Dokument skládáme sami a nic nestahuje ani nečte ze souborů -- kromě písma.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((file) => path.resolve(file).startsWith(FONT_DIR));

const COLOR = { muted: "#666666", line: "#cccccc", accent: "#1f1f1f" };

function lines(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function party(label, rowList) {
  return [
    { text: label.toUpperCase(), style: "label" },
    ...rowList.filter(Boolean).map((row) => (typeof row === "string" ? { text: row } : row)),
  ];
}

function infoRow(label, value) {
  return [{ text: label, color: COLOR.muted }, { text: value ?? "", alignment: "right" }];
}

/** Rekapitulace pod položkami: celkem, a podle toho, kolik je zaplaceno, co zbývá. */
function summaryRows(invoice, f) {
  const remaining = invoice.total - invoice.paidAmount;
  const rows = [[{ text: "Celkem", bold: true }, { text: f.price(invoice.total), bold: true, alignment: "right" }]];
  if (invoice.paidAmount > 0 && remaining > 0) {
    rows.push([{ text: "Uhrazeno" }, { text: `−${f.price(invoice.paidAmount)}`, alignment: "right" }]);
    rows.push([{ text: "Zbývá uhradit", bold: true }, { text: f.price(remaining), bold: true, alignment: "right" }]);
  }
  return rows;
}

/** Popis dokumentu pro pdfmake. Samostatně kvůli testům a náhledu. */
export function invoiceDocDefinition(invoice) {
  const f = formatter("cs");
  const { supplier, customer } = invoice;
  const paidInFull = invoice.paidAmount >= invoice.total;

  const infoList = [
    infoRow("Datum vystavení", f.date(invoice.issuedDate)),
    invoice.paidDate && infoRow(paidInFull ? "Datum úhrady" : "Datum poslední úhrady", f.date(invoice.paidDate)),
    !paidInFull && invoice.dueDate && infoRow("Datum splatnosti", f.date(invoice.dueDate)),
    infoRow("Forma úhrady", "bankovním převodem"),
    infoRow("Číslo účtu", supplier.account),
    invoice.variableSymbol && infoRow("Variabilní symbol", invoice.variableSymbol),
  ].filter(Boolean);

  return {
    pageSize: "A4",
    pageMargins: [48, 48, 48, 64],
    info: { title: `Faktura ${invoice.number}`, author: supplier.name, creator: config.email.propertyName },
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.25, color: COLOR.accent },
    styles: {
      title: { fontSize: 22, bold: true },
      label: { fontSize: 8, bold: true, color: COLOR.muted, characterSpacing: 0.5, margin: [0, 0, 0, 4] },
      tableHeader: { bold: true, color: COLOR.muted, fontSize: 9 },
    },
    footer: () => ({
      margin: [48, 16, 48, 0],
      fontSize: 8,
      color: COLOR.muted,
      // „Nejsem plátce DPH“ je u dodavatele, patička nese jen zápis v rejstříku.
      text: supplier.registry,
    }),
    content: [
      {
        columns: [
          { text: `Faktura ${invoice.number}`, style: "title" },
          { text: config.email.propertyName, alignment: "right", color: COLOR.muted, margin: [0, 8, 0, 0] },
        ],
      },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.5, lineColor: COLOR.line }], margin: [0, 12, 0, 16] },
      {
        columns: [
          party("Dodavatel", [{ text: supplier.name, bold: true }, ...lines(supplier.address), `IČO: ${supplier.ico}`, "Nejsem plátce DPH."]),
          party("Odběratel", [
            { text: customer.name, bold: true },
            ...lines(customer.address),
            customer.ico && `IČO: ${customer.ico}`,
            customer.dic && `DIČ: ${customer.dic}`,
          ]),
        ],
        columnGap: 24,
      },
      {
        table: { widths: ["*", "auto"], body: infoList },
        layout: "noBorders",
        margin: [0, 20, 0, 0],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto"],
          body: [
            [
              { text: "Položka", style: "tableHeader" },
              { text: "Částka", style: "tableHeader", alignment: "right" },
            ],
            ...invoice.lineList.map((line) => [{ text: line.text }, { text: f.price(line.amount), alignment: "right" }]),
          ],
        },
        layout: {
          hLineWidth: (i, node) => (i === 1 || i === node.table.body.length ? 0.5 : 0),
          vLineWidth: () => 0,
          hLineColor: () => COLOR.line,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 0,
          paddingRight: () => 0,
        },
        margin: [0, 24, 0, 0],
      },
      {
        table: { widths: ["*", "auto"], body: summaryRows(invoice, f) },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 4, paddingBottom: () => 4 },
        margin: [0, 4, 0, 0],
      },
      paidInFull && { text: "Uhrazeno, neplaťte.", bold: true, margin: [0, 16, 0, 0] },
    ].filter(Boolean),
  };
}

/** Hotové PDF jako Buffer. */
export async function renderInvoicePdf(invoice) {
  const document = pdfmake.createPdf(invoiceDocDefinition(invoice));
  return Buffer.from(await document.getBuffer());
}
