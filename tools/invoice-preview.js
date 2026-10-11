// Náhled faktury se vzorovými daty: tmp/invoice-preview/*.pdf. Pro revizi vzhledu bez
// spuštěné appky a bez zápisu do databáze (docs/proposal-invoice-pdf.md § 4).
//
//   npm run invoice:preview
import fs from "fs";
import path from "path";

// Bez databáze: caio-server při importu načte .env.development a s MONGODB_URI by otevřené
// spojení nedovolilo procesu skončit (stejně jako v server/test-setup.js). dotenv existující
// proměnnou nepřepíše, proto prázdná hodnota a import až potom.
process.env.MONGODB_URI = "";
const { renderInvoicePdf } = await import("../server/invoice/pdf.js");
const { supplierSnapshot } = await import("../server/invoice/draft.js");

const outDir = path.resolve(process.cwd(), "tmp", "invoice-preview");
fs.mkdirSync(outDir, { recursive: true });

const base = {
  number: "2026-0001",
  variableSymbol: "26110701",
  issuedDate: "2026-10-24",
  supplier: supplierSnapshot(),
  customer: { name: "Firma s.r.o.", address: "Dlouhá 12\n110 00 Praha 1", ico: "12345678", dic: "CZ12345678" },
  lineList: [{ text: "Ubytování 7. 11. 2026 – 9. 11. 2026 (2 noci), 4 osoby", amount: 9000 }],
  total: 9000,
};

const SAMPLES = [
  ["zaplaceno", { ...base, paidAmount: 9000, paidDate: "2026-10-20", dueDate: null }],
  ["castecne", { ...base, paidAmount: 4500, paidDate: "2026-10-10", dueDate: "2026-10-24" }],
  ["nezaplaceno-osoba", { ...base, customer: { name: "Jan Novák", address: null, ico: null, dic: null }, paidAmount: 0, paidDate: null, dueDate: "2026-10-24" }],
];

for (const [name, invoice] of SAMPLES) {
  const file = path.join(outDir, `${name}.pdf`);
  fs.writeFileSync(file, await renderInvoicePdf(invoice));
  console.log(file);
}
