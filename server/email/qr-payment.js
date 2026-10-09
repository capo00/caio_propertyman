import QRCode from "qrcode";

// QR Platba (SPAYD, „Short Payment Descriptor“ České bankovní asociace) -- formát, který čtou
// české bankovní aplikace. Jen pole, která potřebujeme:
//
//   SPD*1.0*ACC:<IBAN>*AM:<částka>*CC:CZK*DT:<YYYYMMDD>*X-VS:<VS>*MSG:<zpráva>
//
// Hodnoty nesmí obsahovat "*" (oddělovač); escapuje se jako %2A. Zpráva je bez diakritiky,
// protože ne každá appka ji přečte, a nejvýš 60 znaků.

const MAX_MESSAGE = 60;

function escapeValue(value) {
  return String(value).replace(/%/g, "%25").replace(/\*/g, "%2A");
}

/** Zpráva pro příjemce: bez diakritiky, jen tisknutelné ASCII, max. 60 znaků. */
export function paymentMessage(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MESSAGE)
    .trim();
}

/**
 * SPAYD řetězec. `amount` v korunách (celé číslo nebo s haléři), `dueDate` ISO datum,
 * `variableSymbol` až 10 číslic.
 */
export function spayd({ iban, amount, dueDate, variableSymbol, message }) {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(iban ?? "")) throw new Error(`QR platba: neplatný IBAN "${iban}"`);
  if (!(Number(amount) > 0)) throw new Error(`QR platba: neplatná částka "${amount}"`);
  if (variableSymbol != null && !/^\d{1,10}$/.test(String(variableSymbol))) throw new Error(`QR platba: neplatný VS "${variableSymbol}"`);

  const parts = ["SPD", "1.0", `ACC:${iban}`, `AM:${Number(amount).toFixed(2)}`, "CC:CZK"];
  if (dueDate) parts.push(`DT:${dueDate.replace(/-/g, "")}`);
  if (variableSymbol != null) parts.push(`X-VS:${variableSymbol}`);
  const msg = message ? paymentMessage(message) : "";
  if (msg) parts.push(`MSG:${escapeValue(msg)}`);
  return parts.join("*");
}

/** PNG s QR kódem. Neukládá se -- vyrobí se při každém odeslání z údajů o platbě. */
export function qrPng(text) {
  return QRCode.toBuffer(text, { type: "png", errorCorrectionLevel: "M", margin: 4, width: 300 });
}
