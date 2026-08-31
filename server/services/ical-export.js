import dao from "../reservation/dao.js";

// Generuje VCALENDAR pro Booking.com a e-chalupy.
//
// Feed je VEŘEJNÁ URL bez autorizace (portály jiné neumí), takže v něm nesmí být ŽÁDNÁ osobní
// data hosta -- jen termín a neutrální SUMMARY.
//
// Exportují se JEN záznamy s icalFeedCode === null, tedy to, co vzniklo u nás. Importované
// záznamy do feedu nepatří: portál by dostal zpátky své vlastní rezervace jako cizí blokace
// a přes dva portály by se to navzájem množilo (design-v1.md § 7).

const PRODID = "-//caio-propertyman//iCal feed//CS";

/** RFC 5545: řádek smí mít nejvýš 75 oktetů, pokračování začíná mezerou. */
function fold(line) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts = [];
  let start = 0;
  while (start < bytes.length) {
    // 75 pro první řádek, 74 pro další (jeden oktet padne na úvodní mezeru).
    let take = Math.min(start === 0 ? 75 : 74, bytes.length - start);
    // Nesmíme řezat uprostřed UTF-8 znaku -- pokračovací bajty mají tvar 10xxxxxx.
    while (take > 1 && (bytes[start + take] & 0xc0) === 0x80) take--;
    parts.push((start === 0 ? "" : " ") + bytes.subarray(start, start + take).toString("utf8"));
    start += take;
  }
  return parts.join("\r\n");
}

/** RFC 5545: v textových hodnotách se escapuje zpětné lomítko, středník, čárka a nový řádek. */
function escapeText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** "2026-09-04" -> "20260904" (VALUE=DATE, celodenní událost bez časové zóny) */
function toIcalDate(iso) {
  return iso.replace(/-/g, "");
}

function toIcalTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export async function build() {
  const list = await dao.findForExport();
  const stamp = toIcalTimestamp(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const item of list) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(item.icalUid)}`,
      `DTSTAMP:${stamp}`,
      // DTEND je exkluzivní -- den odjezdu už je volný pro dalšího hosta.
      `DTSTART;VALUE=DATE:${toIcalDate(item.dateFrom)}`,
      `DTEND;VALUE=DATE:${toIcalDate(item.dateTo)}`,
      // Neutrální text. Do veřejného feedu nepatří jméno hosta ani cena.
      "SUMMARY:Obsazeno",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 vyžaduje CRLF a ukončení posledního řádku.
  return lines.map(fold).join("\r\n") + "\r\n";
}
